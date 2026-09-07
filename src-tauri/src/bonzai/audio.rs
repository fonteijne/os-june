//! Note transcription through Bonzai: multipart to `/v1/audio/transcriptions`.
//!
//! Upstream posts note audio to the Clovy API, which has its own transcription
//! contract (title, note id, preview flags, speaker handling). Bonzai speaks
//! the OpenAI audio contract instead, so this path carries only what that
//! contract understands: the file, the model, a language hint, and the caller's
//! context as the `prompt` that whisper-class models use to bias vocabulary.
//! Dictation stays on its own disabled path for the beta (PRD section 5).
//!
//! # Pacing
//!
//! Upstream's pipeline was built against a service that absorbed bursts: it
//! transcribes note turns two at a time, the live preview adds a request per
//! source every eight seconds while recording, and its retry loop only knows
//! upstream's own error codes. A LiteLLM key has a requests-per-minute limit
//! and answers a burst with 429, which upstream's loop does not retry, so one
//! rate-limited chunk failed the whole note. This module therefore paces
//! itself: at most [`MAX_IN_FLIGHT`] Bonzai audio requests at once, a shared
//! cool-down that every lane respects after a 429 (honouring `Retry-After`),
//! retries with backoff for note chunks, and no retries for preview chunks,
//! which are best-effort and simply skip while the gateway is cooling down.

use std::sync::OnceLock;
use std::time::{Duration, Instant};

use tokio::sync::{Mutex, Semaphore};

use crate::clovy_api::{bonzai_seam, TranscriptionProviderResult, TranscriptionRequest};
use crate::domain::types::AppError;

use super::http;
use super::resolve;

/// Bonzai audio requests allowed in flight across note processing and both
/// live preview lanes together.
const MAX_IN_FLIGHT: usize = 2;
/// Attempts for a note chunk before its error is reported.
const MAX_ATTEMPTS: u32 = 5;
/// Pause after a 429 that carries no `Retry-After`, doubling per attempt.
const BASE_COOL_DOWN: Duration = Duration::from_secs(2);
/// Longest pause honoured, whatever the gateway asks for.
const MAX_COOL_DOWN: Duration = Duration::from_secs(60);

#[derive(serde::Deserialize)]
struct TranscriptionResponse {
    #[serde(default)]
    text: String,
    #[serde(default)]
    language: Option<String>,
}

struct Pacing {
    in_flight: Semaphore,
    /// No request leaves before this instant; set by whichever lane saw the
    /// 429, respected by all of them.
    not_before: Mutex<Option<Instant>>,
}

fn pacing() -> &'static Pacing {
    static PACING: OnceLock<Pacing> = OnceLock::new();
    PACING.get_or_init(|| Pacing {
        in_flight: Semaphore::new(MAX_IN_FLIGHT),
        not_before: Mutex::new(None),
    })
}

/// The pause to take after a transient failure: the gateway's `Retry-After`
/// when it sent one, otherwise exponential from [`BASE_COOL_DOWN`], capped.
fn cool_down_after(error: &AppError, attempt: u32) -> Duration {
    let requested = error
        .details
        .as_ref()
        .and_then(|details| details.get("retryAfterMs"))
        .and_then(serde_json::Value::as_u64)
        .map(Duration::from_millis);
    requested
        .unwrap_or_else(|| BASE_COOL_DOWN.saturating_mul(1 << attempt.min(5)))
        .min(MAX_COOL_DOWN)
}

async fn extend_cool_down(pause: Duration) {
    let until = Instant::now() + pause;
    let mut guard = pacing().not_before.lock().await;
    if guard.is_none_or(|current| current < until) {
        *guard = Some(until);
    }
}

/// How long the caller must wait before sending, if at all.
async fn remaining_cool_down() -> Option<Duration> {
    let guard = pacing().not_before.lock().await;
    (*guard).and_then(|until| until.checked_duration_since(Instant::now()))
}

pub async fn transcribe_saved_audio(
    request: TranscriptionRequest,
) -> Result<TranscriptionProviderResult, AppError> {
    let resolved = resolve::key_for_operation(request.operation_id.as_deref()).await?;
    let model = resolve::transcription_model()?;
    let audio = bonzai_seam::read_audio(&request.audio_path).await?;
    let filename = bonzai_seam::filename_for_audio(&request.audio_path, "recording.wav");
    let language =
        bonzai_seam::normalized_language(request.language.as_deref()).map(str::to_string);
    let prompt = request
        .context
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string);
    let scope = resolved.scope.describe();

    let mut attempt = 0;
    loop {
        if let Some(wait) = remaining_cool_down().await {
            if request.preview {
                // A preview is a glance at the live transcript; the note is
                // transcribed in full afterwards. Skipping it keeps a cooling
                // gateway from being hit by the preview timer.
                return Err(AppError::new(
                    http::RATE_LIMITED,
                    "Live transcript preview skipped while Bonzai is rate limiting.",
                ));
            }
            tokio::time::sleep(wait).await;
        }
        let result = {
            let _permit = pacing().in_flight.acquire().await.map_err(|_| {
                AppError::new(http::REQUEST_FAILED, "Bonzai audio pacing is closed.")
            })?;
            send(
                &resolved.key,
                &model,
                &scope,
                audio.clone(),
                &filename,
                &request,
                language.as_deref(),
                prompt.as_deref(),
            )
            .await
        };
        match result {
            Ok(transcript) => return Ok(transcript),
            Err(error) if http::is_transient(&error) => {
                let pause = cool_down_after(&error, attempt);
                extend_cool_down(pause).await;
                attempt += 1;
                if request.preview || attempt >= MAX_ATTEMPTS {
                    return Err(error);
                }
                tracing::warn!(
                    target: "bonzai",
                    code = %error.code,
                    attempt,
                    pause_ms = pause.as_millis() as u64,
                    "transcription rate limited or briefly unavailable; pausing before retry"
                );
            }
            Err(error) => return Err(error),
        }
    }
}

#[allow(clippy::too_many_arguments)]
async fn send(
    key: &str,
    model: &str,
    scope: &str,
    audio: Vec<u8>,
    filename: &str,
    request: &TranscriptionRequest,
    language: Option<&str>,
    prompt: Option<&str>,
) -> Result<TranscriptionProviderResult, AppError> {
    let part = bonzai_seam::audio_part(audio, filename, &request.audio_path)?;
    let mut form = reqwest::multipart::Form::new()
        .text("model", model.to_string())
        .text("response_format", "verbose_json")
        .part("file", part);
    if let Some(language) = language {
        form = form.text("language", language.to_string());
    }
    if let Some(prompt) = prompt {
        form = form.text("prompt", prompt.to_string());
    }
    let response = http::authed(reqwest::Method::POST, "audio/transcriptions", key)?
        .multipart(form)
        .send()
        .await
        .map_err(http::network_error)?;
    let status = response.status();
    let retry_after_ms = http::retry_after_ms(response.headers());
    let bytes = response.bytes().await.map_err(http::network_error)?;
    if !status.is_success() {
        return Err(http::status_error_with_retry(
            status,
            &bytes,
            scope,
            Some(model),
            retry_after_ms,
        ));
    }
    let parsed: TranscriptionResponse = serde_json::from_slice(&bytes).map_err(|error| {
        AppError::new(
            http::RESPONSE_INVALID,
            format!("Bonzai returned a transcription Clovy could not read: {error}"),
        )
    })?;
    Ok(TranscriptionProviderResult {
        text: parsed.text,
        language: parsed
            .language
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
            .or_else(|| request.language.clone()),
        provider: super::PROVIDER_BONZAI.to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_response_shape_accepts_plain_and_verbose_json() {
        let plain: TranscriptionResponse = serde_json::from_str(r#"{"text":"hello"}"#).unwrap();
        assert_eq!(plain.text, "hello");
        assert!(plain.language.is_none());
        let verbose: TranscriptionResponse = serde_json::from_str(
            r#"{"task":"transcribe","language":"en","duration":1.2,"text":"hi","segments":[]}"#,
        )
        .unwrap();
        assert_eq!(verbose.language.as_deref(), Some("en"));
    }

    #[test]
    fn the_cool_down_honours_retry_after_and_otherwise_backs_off_with_a_cap() {
        let mut asked = AppError::new(http::RATE_LIMITED, "429");
        asked.details = Some(serde_json::json!({ "retryAfterMs": 7_500 }));
        assert_eq!(cool_down_after(&asked, 0), Duration::from_millis(7_500));
        let mut huge = asked.clone();
        huge.details = Some(serde_json::json!({ "retryAfterMs": 600_000 }));
        assert_eq!(cool_down_after(&huge, 0), MAX_COOL_DOWN);
        let bare = AppError::new(http::RATE_LIMITED, "429");
        assert_eq!(cool_down_after(&bare, 0), Duration::from_secs(2));
        assert_eq!(cool_down_after(&bare, 1), Duration::from_secs(4));
        assert_eq!(cool_down_after(&bare, 3), Duration::from_secs(16));
        assert_eq!(cool_down_after(&bare, 9), MAX_COOL_DOWN);
    }

    #[tokio::test]
    async fn a_cool_down_only_ever_moves_later() {
        extend_cool_down(Duration::from_millis(300)).await;
        let first = remaining_cool_down().await.unwrap();
        extend_cool_down(Duration::from_millis(50)).await;
        let second = remaining_cool_down().await.unwrap();
        assert!(second <= first);
        assert!(second > Duration::from_millis(200));
    }
}
