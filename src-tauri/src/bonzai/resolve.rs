//! Which key, and which model, for a piece of work.
//!
//! Phase 2 resolves the global key only. Phase 4 adds the per-project seam:
//! a project with its own key bills to it, a project without one falls back
//! to the global key, and no key anywhere refuses before work starts.

use crate::domain::types::AppError;

use super::keys::{self, KeyScope};

pub const MODEL_NOT_SELECTED: &str = "bonzai_model_not_selected";

/// The key a piece of work bills to, with the scope so errors can name it.
#[derive(Clone, Debug)]
pub struct ResolvedKey {
    pub scope: KeyScope,
    pub key: String,
}

/// Resolve the key for work in `folder_id`'s project, or global work when
/// `None`. Until Phase 4 lands every call resolves to the global key.
pub async fn key_for(folder_id: Option<&str>) -> Result<ResolvedKey, AppError> {
    let _ = folder_id;
    let scope = KeyScope::Global;
    let key = keys::require(&scope).await?;
    Ok(ResolvedKey { scope, key })
}

/// Resolve the key for an operation by its upstream operation id (a note id,
/// a `<note>-chunk-N` id, or a live-preview id). Until Phase 4 lands every
/// call resolves to the global key.
pub async fn key_for_operation(operation_id: Option<&str>) -> Result<ResolvedKey, AppError> {
    let _ = operation_id;
    key_for(None).await
}

/// The model a generation request should use when the caller left it to the
/// settings. Upstream's Auto router is a Clovy API concept with no Bonzai
/// equivalent, so an Auto selection resolves to the build's configured default
/// or refuses: silently picking something would spend on a model nobody chose.
pub fn generation_model() -> Result<String, AppError> {
    let configured = crate::providers::generation_model();
    resolve_model(&configured)
}

/// The transcription model from settings, with the same Auto handling.
pub fn transcription_model() -> Result<String, AppError> {
    let configured = crate::providers::transcription_model();
    resolve_model(&configured)
}

fn resolve_model(configured: &str) -> Result<String, AppError> {
    let configured = configured.trim();
    if !configured.is_empty() && !is_auto(configured) {
        return Ok(configured.to_string());
    }
    super::config::default_model().ok_or_else(|| {
        AppError::new(
            MODEL_NOT_SELECTED,
            "Choose a model from the Bonzai list in Settings. Bonzai builds have no automatic model selection.",
        )
    })
}

pub(crate) fn is_auto(model: &str) -> bool {
    let model = model.trim();
    model == "auto" || model == crate::providers::AUTO_GENERATION_MODEL
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn auto_is_recognised_in_both_spellings() {
        assert!(is_auto("auto"));
        assert!(is_auto(crate::providers::AUTO_GENERATION_MODEL));
        assert!(!is_auto("gpt-4o"));
    }
}
