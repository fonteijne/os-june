//! Chat completions through Bonzai: note generation and the agent proxy.
//!
//! Both reuse upstream's prompts and parsers through the seam appended to
//! `clovy_api.rs`, so this path and the local-provider path cannot drift
//! apart in what they ask the model or how they read the answer.

use crate::clovy_api::{
    bonzai_seam, AgentChatCompletionsResponse, AgentModelRouteMetadata, GenerationProviderResult,
    GenerationRequest,
};
use crate::domain::types::AppError;

use super::http;
use super::resolve;

/// Upstream tags the model an agent session stored so provenance survives a
/// settings change. The tags are private to `clovy_api.rs`; they are repeated
/// here (ADR-0058 accepts this duplication) so the Bonzai path can decode a
/// session's choice without a shared edit. A rename upstream shows up as a
/// tagged id reaching Bonzai verbatim, which fails loudly as an unknown model.
const REMOTE_MODEL_PREFIX: &str = "__june_remote_generation__:";
const RESOLVED_AUTO_MODEL_PREFIX: &str = "__june_auto_resolved__:";
const LOCAL_MODEL_PREFIX: &str = "__june_local_generation__:";

pub const LOCAL_MODEL_SELECTED: &str = "bonzai_local_model_selected";

/// Generate a note from a transcript. Mirrors upstream's local path: same
/// system prompts, same source-text assembly, same post-processing.
pub async fn generate_note(
    request: GenerationRequest,
) -> Result<GenerationProviderResult, AppError> {
    let transcript = request.transcript.trim();
    if transcript.is_empty() {
        return Err(AppError::new(
            "transcription_empty",
            "Transcript is empty, so a note cannot be generated.",
        ));
    }
    let resolved = resolve::key_for_operation(request.operation_id.as_deref()).await?;
    let model = resolve::generation_model()?;
    let title_hint = request.title.trim();
    let user_message = format!(
        "Current title: {}\nDetected language: {}\n\n{}",
        if title_hint.is_empty() {
            "New note"
        } else {
            title_hint
        },
        request.language.as_deref().unwrap_or("unknown"),
        bonzai_seam::generation_source_text(
            request.existing_generated_note.as_deref(),
            request.manual_notes.as_deref(),
            transcript,
            request.transcript_source_labels,
        )
    );
    let body = serde_json::json!({
        "model": model,
        "messages": [
            { "role": "system", "content": bonzai_seam::safety_context() },
            { "role": "system", "content": bonzai_seam::note_generate_system_prompt().trim() },
            { "role": "user", "content": user_message }
        ]
    });
    let response = http::authed(reqwest::Method::POST, "chat/completions", &resolved.key)?
        .json(&body)
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
    let value: serde_json::Value = serde_json::from_slice(&bytes).map_err(|error| {
        AppError::new(
            http::RESPONSE_INVALID,
            format!("Bonzai returned a response Clovy could not read: {error}"),
        )
    })?;
    let content = bonzai_seam::extract_chat_completion_text(&value)
        .map(|text| {
            if request.transcript_source_labels {
                bonzai_seam::cleanup_generated_note_text(&text, transcript)
            } else {
                text
            }
        })
        .filter(|text| !text.is_empty())
        .ok_or_else(|| {
            AppError::new(
                http::RESPONSE_INVALID,
                format!("Bonzai model {model} returned no note text."),
            )
        })?;
    Ok(GenerationProviderResult {
        content,
        title_suggestion: Some(if title_hint.is_empty() {
            "New note".to_string()
        } else {
            title_hint.to_string()
        }),
        provider: super::PROVIDER_BONZAI.to_string(),
        prompt_version: crate::domain::processing::PROMPT_VERSION.to_string(),
    })
}

/// Proxy an agent chat-completions request to Bonzai, streaming the body
/// back as it arrives. The session's tagged model is decoded here; a session
/// that chose a local model is refused rather than quietly rerouted, because
/// the user was shown privacy copy for that choice that Bonzai does not
/// honour.
pub async fn proxy_agent_chat_completions(
    body: serde_json::Value,
) -> Result<AgentChatCompletionsResponse, AppError> {
    // Every refusal is logged here, at the one entry the agent runtime uses,
    // so the reason reaches the terminal even when the UI shows only a notice.
    let result = proxy_agent_chat_completions_inner(body).await;
    if let Err(error) = &result {
        tracing::warn!(target: "bonzai", code = %error.code, message = %error.message, "agent chat refused");
    }
    result
}

async fn proxy_agent_chat_completions_inner(
    mut body: serde_json::Value,
) -> Result<AgentChatCompletionsResponse, AppError> {
    let session_id = body
        .get(super::SESSION_TAG_FIELD)
        .and_then(serde_json::Value::as_str)
        .map(str::to_string);
    let folder_id = match session_id.as_deref() {
        Some(session_id) => resolve::folder_for_session(session_id).await,
        None => None,
    };
    let resolved = resolve::key_for(folder_id.as_deref()).await?;
    let model = resolve_agent_model(&body)?;
    if let Some(object) = body.as_object_mut() {
        object.remove(super::SESSION_TAG_FIELD);
        object.insert(
            "model".to_string(),
            serde_json::Value::String(model.clone()),
        );
        prepend_safety_context(object);
    }
    let response = http::authed(reqwest::Method::POST, "chat/completions", &resolved.key)?
        .json(&body)
        .send()
        .await
        .map_err(http::network_error)?;
    let status = response.status();
    if status == reqwest::StatusCode::UNAUTHORIZED || status == reqwest::StatusCode::FORBIDDEN {
        // A rejected key must surface as its own error, not as a status the
        // agent runtime renders as a generic model failure and retries.
        let bytes = response.bytes().await.map_err(http::network_error)?;
        return Err(http::status_error(
            status,
            &bytes,
            &resolved.scope.describe(),
            Some(&model),
        ));
    }
    let content_type = response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("application/json")
        .to_string();
    let route = AgentModelRouteMetadata {
        provider: Some(super::PROVIDER_BONZAI.to_string()),
        privacy_level: None,
        endpoint: Some(model),
    };
    Ok(bonzai_seam::agent_chat_completions_response(
        status.as_u16(),
        content_type,
        route,
        response,
    ))
}

/// The concrete model for an agent request: a tagged remote or resolved-Auto
/// id decoded, an Auto request or an empty model resolved from settings, a
/// tagged local choice refused, anything else passed through as-is.
fn resolve_agent_model(body: &serde_json::Value) -> Result<String, AppError> {
    let requested = body
        .get("model")
        .and_then(serde_json::Value::as_str)
        .map(str::trim)
        .unwrap_or_default();
    if requested.starts_with(LOCAL_MODEL_PREFIX) {
        return Err(AppError::new(
            LOCAL_MODEL_SELECTED,
            "This session selected a local model, and this build routes only to Bonzai. Choose a Bonzai model for the session.",
        ));
    }
    for prefix in [REMOTE_MODEL_PREFIX, RESOLVED_AUTO_MODEL_PREFIX] {
        if let Some(encoded) = requested.strip_prefix(prefix) {
            let decoded = urlencoding::decode(encoded)
                .map(|value| value.trim().to_string())
                .unwrap_or_default();
            if decoded.is_empty() {
                return Err(AppError::new(
                    "remote_model_invalid",
                    "The model selected for this session is invalid. Choose the model again.",
                ));
            }
            return Ok(decoded);
        }
    }
    if requested.is_empty() || crate::clovy_api::is_agent_auto_model(requested) {
        return resolve::generation_model();
    }
    Ok(requested.to_string())
}

fn prepend_safety_context(object: &mut serde_json::Map<String, serde_json::Value>) {
    let Some(messages) = object
        .get_mut("messages")
        .and_then(serde_json::Value::as_array_mut)
    else {
        return;
    };
    let already_present = messages.first().is_some_and(|message| {
        message.get("role").and_then(serde_json::Value::as_str) == Some("system")
            && message
                .get("content")
                .and_then(serde_json::Value::as_str)
                .is_some_and(|content| content.contains("Standing content policy"))
    });
    if already_present {
        return;
    }
    messages.insert(
        0,
        serde_json::json!({ "role": "system", "content": bonzai_seam::safety_context() }),
    );
}

#[cfg(test)]
mod tests {
    use super::*;

    fn body(model: &str) -> serde_json::Value {
        serde_json::json!({ "model": model, "messages": [] })
    }

    #[test]
    fn tagged_remote_and_resolved_auto_ids_decode_to_the_raw_model() {
        assert_eq!(
            resolve_agent_model(&body("__june_remote_generation__:gpt-4o")).unwrap(),
            "gpt-4o"
        );
        assert_eq!(
            resolve_agent_model(&body("__june_auto_resolved__:claude%2Dx")).unwrap(),
            "claude-x"
        );
    }

    #[test]
    fn a_local_choice_is_refused_not_rerouted() {
        let error = resolve_agent_model(&body("__june_local_generation__:llama")).unwrap_err();
        assert_eq!(error.code, LOCAL_MODEL_SELECTED);
    }

    #[test]
    fn an_empty_tag_is_an_error_not_an_empty_model() {
        let error = resolve_agent_model(&body("__june_remote_generation__:")).unwrap_err();
        assert_eq!(error.code, "remote_model_invalid");
    }

    #[test]
    fn a_plain_id_passes_through() {
        assert_eq!(resolve_agent_model(&body(" gpt-4o ")).unwrap(), "gpt-4o");
    }

    #[test]
    fn the_safety_context_is_prepended_exactly_once() {
        let mut object = serde_json::Map::new();
        object.insert(
            "messages".into(),
            serde_json::json!([{ "role": "user", "content": "hi" }]),
        );
        prepend_safety_context(&mut object);
        prepend_safety_context(&mut object);
        let messages = object["messages"].as_array().unwrap();
        assert_eq!(messages.len(), 2);
        assert_eq!(messages[0]["role"], "system");
    }
}
