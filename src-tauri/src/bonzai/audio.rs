//! Note transcription through Bonzai: multipart to `/v1/audio/transcriptions`.
//!
//! Upstream posts note audio to the Clovy API, which has its own transcription
//! contract (title, note id, preview flags, speaker handling). Bonzai speaks
//! the OpenAI audio contract instead, so this path carries only what that
//! contract understands: the file, the model, a language hint, and the caller's
//! context as the `prompt` that whisper-class models use to bias vocabulary.
//! Dictation stays on its own disabled path for the beta (PRD section 5).

use crate::clovy_api::{bonzai_seam, TranscriptionProviderResult, TranscriptionRequest};
use crate::domain::types::AppError;

use super::http;
use super::resolve;

#[derive(serde::Deserialize)]
struct TranscriptionResponse {
    #[serde(default)]
    text: String,
    #[serde(default)]
    language: Option<String>,
}

pub async fn transcribe_saved_audio(
    request: TranscriptionRequest,
) -> Result<TranscriptionProviderResult, AppError> {
    let resolved = resolve::key_for_operation(request.operation_id.as_deref()).await?;
    let model = resolve::transcription_model()?;
    let audio = bonzai_seam::read_audio(&request.audio_path).await?;
    let filename = bonzai_seam::filename_for_audio(&request.audio_path, "recording.wav");
    let part = bonzai_seam::audio_part(audio, &filename, &request.audio_path)?;
    let mut form = reqwest::multipart::Form::new()
        .text("model", model.clone())
        .text("response_format", "verbose_json")
        .part("file", part);
    if let Some(language) = bonzai_seam::normalized_language(request.language.as_deref()) {
        form = form.text("language", language.to_string());
    }
    if let Some(context) = request
        .context
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        form = form.text("prompt", context.to_string());
    }
    let response = http::authed(reqwest::Method::POST, "audio/transcriptions", &resolved.key)?
        .multipart(form)
        .send()
        .await
        .map_err(http::network_error)?;
    let status = response.status();
    let bytes = response.bytes().await.map_err(http::network_error)?;
    if !status.is_success() {
        return Err(http::status_error(
            status,
            &bytes,
            &resolved.scope.describe(),
            Some(&model),
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
            .or(request.language),
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
}
