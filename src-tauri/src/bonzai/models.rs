//! The model catalog, per key.
//!
//! LiteLLM's `/v1/models` returns the models the calling key may access, and
//! virtual keys carry per-key model restrictions, so a project's picker is
//! populated by asking with that project's key. No client-side model policy
//! is needed (PRD section 7.3).

use crate::domain::types::AppError;
use crate::providers::{ModelMode, VeniceModelDto, VeniceModelsRequest, VeniceModelsResponse};

use super::http;
use super::resolve::ResolvedKey;

#[derive(serde::Deserialize)]
struct ModelList {
    #[serde(default)]
    data: Vec<ModelEntry>,
}

#[derive(serde::Deserialize)]
struct ModelEntry {
    id: String,
}

/// The raw model ids the key may reach, sorted.
pub async fn list_ids(resolved: &ResolvedKey) -> Result<Vec<String>, AppError> {
    let response = http::authed(reqwest::Method::GET, "models", &resolved.key)?
        .send()
        .await
        .map_err(http::network_error)?;
    let status = response.status();
    let body = response.bytes().await.map_err(http::network_error)?;
    if !status.is_success() {
        return Err(http::status_error(
            status,
            &body,
            &resolved.scope.describe(),
            None,
        ));
    }
    let list: ModelList = serde_json::from_slice(&body).map_err(|error| {
        AppError::new(
            http::RESPONSE_INVALID,
            format!("Bonzai returned a model list Clovy could not read: {error}"),
        )
    })?;
    let mut ids: Vec<String> = list
        .data
        .into_iter()
        .map(|entry| entry.id.trim().to_string())
        .filter(|id| !id.is_empty())
        .collect();
    ids.sort_by_key(|id| id.to_ascii_lowercase());
    ids.dedup();
    Ok(ids)
}

/// Serve upstream's picker request from Bonzai instead of the Clovy API.
///
/// The picker is upstream's and knows nothing about Bonzai; it consumes the
/// same `VeniceModelsResponse` it always did, with `provider` set to
/// `bonzai`. Image and video are disabled capabilities in this fork, so those
/// modes return an empty list rather than a catalog nothing can use.
pub async fn list_for_picker(
    request: VeniceModelsRequest,
) -> Result<VeniceModelsResponse, AppError> {
    let (model_type, selected_model) = match request.mode {
        ModelMode::Generation => ("text", crate::providers::generation_model()),
        ModelMode::Transcription => ("asr", crate::providers::transcription_model()),
        ModelMode::Image => ("image", String::new()),
        ModelMode::Video => ("video", String::new()),
    };
    if matches!(request.mode, ModelMode::Image | ModelMode::Video) {
        return Ok(VeniceModelsResponse {
            mode: request.mode,
            model_type: model_type.to_string(),
            selected_model,
            models: Vec::new(),
        });
    }
    let resolved = super::resolve::key_for(None).await?;
    let models = list_ids(&resolved)
        .await?
        .into_iter()
        .map(|id| picker_entry(id, model_type))
        .collect();
    Ok(VeniceModelsResponse {
        mode: request.mode,
        model_type: model_type.to_string(),
        selected_model,
        models,
    })
}

/// One catalog row. LiteLLM's list carries ids only, so the row claims tool
/// support the way upstream's local provider does: unverifiable from the
/// catalog, and hard-blocking would make every model unselectable. A model
/// that cannot call tools fails at the first tool call with Bonzai's own
/// error, which is loud enough.
fn picker_entry(id: String, model_type: &str) -> VeniceModelDto {
    VeniceModelDto {
        provider: super::PROVIDER_BONZAI.to_string(),
        name: id.clone(),
        id,
        model_type: model_type.to_string(),
        description: Some("Served through Bonzai and billed to its key.".to_string()),
        privacy: None,
        pricing: Some(serde_json::json!({ "display": "Bonzai" })),
        context_tokens: None,
        traits: vec![super::PROVIDER_BONZAI.to_string()],
        capabilities: if model_type == "text" {
            vec!["supportsFunctionCalling".to_string()]
        } else {
            Vec::new()
        },
        price_unit: "bonzai".to_string(),
        price_description: "Billed to the Bonzai key".to_string(),
        credits_per_million_seconds: None,
        input_credits_per_million_tokens: None,
        output_credits_per_million_tokens: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_text_row_is_selectable_by_upstreams_picker() {
        let row = picker_entry("gpt-4o".into(), "text");
        assert_eq!(row.provider, "bonzai");
        assert_eq!(row.id, "gpt-4o");
        assert!(row
            .capabilities
            .iter()
            .any(|c| c == "supportsFunctionCalling"));
    }

    #[test]
    fn an_asr_row_claims_no_tool_support() {
        let row = picker_entry("whisper-1".into(), "asr");
        assert!(row.capabilities.is_empty());
    }

    #[test]
    fn the_list_shape_tolerates_extra_fields_and_missing_data() {
        let list: ModelList = serde_json::from_str(
            r#"{"object":"list","data":[{"id":"b","object":"model","owned_by":"x"},{"id":"a"}]}"#,
        )
        .unwrap();
        assert_eq!(list.data.len(), 2);
        let empty: ModelList = serde_json::from_str(r#"{"object":"list"}"#).unwrap();
        assert!(empty.data.is_empty());
    }
}
