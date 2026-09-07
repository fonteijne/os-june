//! The one request helper every Bonzai call goes through.
//!
//! Three things happen here and nowhere else: the destination is checked
//! against the compiled allowlist, the Bonzai key is attached, and Bonzai's
//! failure statuses are mapped to errors that name what actually went wrong.
//! A revoked key, a model the key may not use, and an unreachable gateway are
//! three different facts, and a caller that cannot tell them apart will retry
//! its way into the wrong client's budget.

use std::sync::OnceLock;
use std::time::Duration;

use crate::domain::types::AppError;
use reqwest::Url;

/// Long enough for a streamed chat completion or a multi-minute
/// transcription, and the same figure upstream uses for its own clients.
const REQUEST_TIMEOUT: Duration = Duration::from_secs(600);

static CLIENT: OnceLock<reqwest::Client> = OnceLock::new();

/// Error codes, distinct from every upstream code and from each other.
pub const KEY_REJECTED: &str = "bonzai_key_rejected";
pub const MODEL_NOT_PERMITTED: &str = "bonzai_model_not_permitted";
pub const UNREACHABLE: &str = "bonzai_unreachable";
pub const REQUEST_FAILED: &str = "bonzai_request_failed";
pub const RESPONSE_INVALID: &str = "bonzai_response_invalid";
pub const RATE_LIMITED: &str = "bonzai_rate_limited";

/// The shared Bonzai client. Direct-to-gateway like upstream's own clients:
/// an ambient proxy variable must not be able to redirect a key.
pub fn client() -> &'static reqwest::Client {
    CLIENT.get_or_init(|| {
        crate::bonzai::egress::guarded_builder()
            .no_proxy()
            .timeout(REQUEST_TIMEOUT)
            .pool_idle_timeout(Duration::from_secs(90))
            .tcp_keepalive(Some(Duration::from_secs(30)))
            .user_agent(concat!("clovy-bonzai/", env!("CARGO_PKG_VERSION")))
            .build()
            .unwrap_or_else(|_| crate::bonzai::egress::guarded_client())
    })
}

/// `{base}/v1/{path}`, tolerant of a base URL that already ends in `/v1`.
///
/// Every URL built here is checked against the allowlist before it is
/// returned, so a caller cannot construct a permitted-looking request to a
/// host the build may not reach.
pub fn endpoint(path: &str) -> Result<Url, AppError> {
    let base = crate::bonzai::config::base_url()?;
    let mut base_str = base.as_str().trim_end_matches('/').to_string();
    if let Some(stripped) = base_str.strip_suffix("/v1") {
        base_str = stripped.to_string();
    }
    let url =
        Url::parse(&format!("{base_str}/v1/{}", path.trim_start_matches('/'))).map_err(|_| {
            AppError::new(
                "bonzai_base_url_invalid",
                "The configured Bonzai base URL does not form a valid endpoint.",
            )
        })?;
    crate::bonzai::egress::assert_allowed(&url)?;
    Ok(url)
}

/// A request with the key attached, destination already checked.
pub fn authed(
    method: reqwest::Method,
    path: &str,
    key: &str,
) -> Result<reqwest::RequestBuilder, AppError> {
    let url = endpoint(path)?;
    Ok(client().request(method, url).bearer_auth(key.trim()))
}

/// A transport failure. Never a fallback: there is no other provider to
/// reach by design, so this is the end of the road for the operation.
pub fn network_error(error: reqwest::Error) -> AppError {
    let detail = if error.is_timeout() {
        "the request timed out"
    } else if error.is_connect() {
        "the connection could not be opened"
    } else {
        "the request failed before a response arrived"
    };
    AppError::new(
        UNREACHABLE,
        format!(
            "Bonzai could not be reached: {detail}. Clovy does not fall back to another provider."
        ),
    )
}

/// Map a non-success status to the error it actually means. `scope` names
/// whose key was in use ("the global Bonzai key", "the key for project X") so
/// the message points at the thing to fix.
pub fn status_error(
    status: reqwest::StatusCode,
    body: &[u8],
    scope: &str,
    model: Option<&str>,
) -> AppError {
    status_error_with_retry(status, body, scope, model, None)
}

/// [`status_error`] with the response's `Retry-After`, so a 429 carries
/// `details.retryAfterMs` the way upstream's own rate-limit errors do and the
/// callers that pace themselves (note transcription) can honour it.
pub fn status_error_with_retry(
    status: reqwest::StatusCode,
    body: &[u8],
    scope: &str,
    model: Option<&str>,
    retry_after_ms: Option<u64>,
) -> AppError {
    let body_text = String::from_utf8_lossy(body);
    let detail = extract_error_message(&body_text);
    match status.as_u16() {
        429 => {
            let mut error = AppError::new(
                RATE_LIMITED,
                format!(
                    "Bonzai is rate limiting {scope} (429). Clovy retries transcription automatically; if this keeps happening, raise the key's requests-per-minute limit in LiteLLM.{}",
                    detail.as_deref().map(|d| format!(" Bonzai said: {d}")).unwrap_or_default()
                ),
            );
            if let Some(ms) = retry_after_ms {
                error.details = Some(serde_json::json!({ "retryAfterMs": ms }));
            }
            error
        }
        401 | 403 => AppError::new(
            KEY_REJECTED,
            format!(
                "Bonzai rejected {scope}. Check the key in LiteLLM; Clovy never falls back to another key or to Clovy credits.{}",
                detail.as_deref().map(|d| format!(" Bonzai said: {d}")).unwrap_or_default()
            ),
        ),
        400 | 404 if mentions_model(detail.as_deref()) => AppError::new(
            MODEL_NOT_PERMITTED,
            format!(
                "Bonzai does not allow the model {} for {scope}. Choose a model from the list that key can reach.{}",
                model.map(|m| format!("\"{m}\"")).unwrap_or_else(|| "selected".to_string()),
                detail.as_deref().map(|d| format!(" Bonzai said: {d}")).unwrap_or_default()
            ),
        ),
        code => AppError::new(
            REQUEST_FAILED,
            format!(
                "Bonzai returned status {code} for {scope}.{}",
                detail.as_deref().map(|d| format!(" Bonzai said: {d}")).unwrap_or_default()
            ),
        ),
    }
}

/// `Retry-After` in milliseconds when the gateway sent one as a delay in
/// seconds (LiteLLM's form). HTTP-date values are not parsed: a caller then
/// falls back to its own backoff.
pub fn retry_after_ms(headers: &reqwest::header::HeaderMap) -> Option<u64> {
    headers
        .get(reqwest::header::RETRY_AFTER)?
        .to_str()
        .ok()?
        .trim()
        .parse::<f64>()
        .ok()
        .filter(|seconds| seconds.is_finite() && *seconds >= 0.0)
        .map(|seconds| (seconds * 1000.0).round() as u64)
}

/// Whether the error is one a paced retry can get past: the gateway asked for
/// a pause (429) or briefly failed (502, 503, 504), as opposed to a refusal.
pub fn is_transient(error: &AppError) -> bool {
    error.code == RATE_LIMITED
        || (error.code == REQUEST_FAILED
            && ["status 502", "status 503", "status 504"]
                .iter()
                .any(|needle| error.message.contains(needle)))
}

fn mentions_model(detail: Option<&str>) -> bool {
    detail.is_some_and(|text| text.to_ascii_lowercase().contains("model"))
}

/// LiteLLM answers with OpenAI's `{ "error": { "message": ... } }` shape, or
/// occasionally a bare `{ "detail": ... }`. Anything else is passed through
/// trimmed, so a plaintext gateway error still reaches the log.
fn extract_error_message(body: &str) -> Option<String> {
    let trimmed = body.trim();
    if trimmed.is_empty() {
        return None;
    }
    let Ok(value) = serde_json::from_str::<serde_json::Value>(trimmed) else {
        return Some(truncate(trimmed, 300));
    };
    let message = value
        .get("error")
        .and_then(|error| error.get("message").or(Some(error)))
        .and_then(serde_json::Value::as_str)
        .or_else(|| value.get("detail").and_then(serde_json::Value::as_str))
        .or_else(|| value.get("message").and_then(serde_json::Value::as_str))?;
    let message = message.trim();
    (!message.is_empty()).then(|| truncate(message, 300))
}

fn truncate(text: &str, max_chars: usize) -> String {
    if text.chars().count() <= max_chars {
        text.to_string()
    } else {
        let mut cut: String = text.chars().take(max_chars).collect();
        cut.push_str("...");
        cut
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_429_is_a_rate_limit_with_the_gateway_pause_attached() {
        let error = status_error_with_retry(
            reqwest::StatusCode::TOO_MANY_REQUESTS,
            br#"{"error":{"message":"RateLimitError: key over limit"}}"#,
            "the global Bonzai key",
            Some("whisper-1"),
            Some(3_000),
        );
        assert_eq!(error.code, RATE_LIMITED);
        assert!(error.message.contains("key over limit"));
        assert_eq!(error.details.unwrap()["retryAfterMs"], 3_000);
        assert!(is_transient(&status_error(
            reqwest::StatusCode::TOO_MANY_REQUESTS,
            b"",
            "x",
            None
        )));
        assert!(is_transient(&status_error(
            reqwest::StatusCode::SERVICE_UNAVAILABLE,
            b"",
            "x",
            None
        )));
        assert!(!is_transient(&status_error(
            reqwest::StatusCode::UNAUTHORIZED,
            b"",
            "x",
            None
        )));
        assert!(!is_transient(&status_error(
            reqwest::StatusCode::BAD_REQUEST,
            b"",
            "x",
            None
        )));
    }

    #[test]
    fn retry_after_reads_seconds_and_ignores_dates() {
        let mut headers = reqwest::header::HeaderMap::new();
        headers.insert(reqwest::header::RETRY_AFTER, "2".parse().unwrap());
        assert_eq!(retry_after_ms(&headers), Some(2_000));
        headers.insert(reqwest::header::RETRY_AFTER, "0.5".parse().unwrap());
        assert_eq!(retry_after_ms(&headers), Some(500));
        headers.insert(
            reqwest::header::RETRY_AFTER,
            "Wed, 21 Oct 2015 07:28:00 GMT".parse().unwrap(),
        );
        assert_eq!(retry_after_ms(&headers), None);
        assert_eq!(retry_after_ms(&reqwest::header::HeaderMap::new()), None);
    }

    #[test]
    fn a_rejected_key_is_named_as_such_and_never_as_a_network_error() {
        let error = status_error(
            reqwest::StatusCode::UNAUTHORIZED,
            br#"{"error":{"message":"Authentication Error, Invalid proxy server token passed"}}"#,
            "the global Bonzai key",
            None,
        );
        assert_eq!(error.code, KEY_REJECTED);
        assert!(error.message.contains("never falls back"));
        assert!(error.message.contains("Invalid proxy server token"));
    }

    #[test]
    fn a_model_the_key_may_not_use_names_the_model() {
        let error = status_error(
            reqwest::StatusCode::BAD_REQUEST,
            br#"{"error":{"message":"Invalid model name passed in model=gpt-9"}}"#,
            "the key for project Acme",
            Some("gpt-9"),
        );
        assert_eq!(error.code, MODEL_NOT_PERMITTED);
        assert!(error.message.contains("\"gpt-9\""));
        assert!(error.message.contains("project Acme"));
    }

    #[test]
    fn other_failures_carry_the_status() {
        let error = status_error(
            reqwest::StatusCode::BAD_GATEWAY,
            b"upstream down",
            "the global Bonzai key",
            None,
        );
        assert_eq!(error.code, REQUEST_FAILED);
        assert!(error.message.contains("502"));
        assert!(error.message.contains("upstream down"));
    }

    #[test]
    fn error_extraction_tolerates_every_shape_litellm_uses() {
        assert_eq!(
            extract_error_message(r#"{"error":{"message":"boom"}}"#).as_deref(),
            Some("boom")
        );
        assert_eq!(
            extract_error_message(r#"{"error":"boom"}"#).as_deref(),
            Some("boom")
        );
        assert_eq!(
            extract_error_message(r#"{"detail":"boom"}"#).as_deref(),
            Some("boom")
        );
        assert_eq!(extract_error_message("   "), None);
        assert_eq!(
            extract_error_message("not json").as_deref(),
            Some("not json")
        );
    }
}
