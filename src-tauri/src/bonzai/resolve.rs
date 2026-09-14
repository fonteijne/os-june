//! Which key, and which model, for a piece of work.
//!
//! The seam the feature is named for: a project with its own Bonzai key bills
//! to it, a project without one falls back to the global key, and no key
//! anywhere refuses before work starts (PRD sections 7.2 and 10). The project
//! is found from what upstream already threads through: a note id on
//! transcription and generation requests, and the agent session id the host
//! stamps onto a chat request.

use crate::domain::types::AppError;
use sqlx::{query::query, row::Row};

use super::keys::{self, KeyScope, KEY_MISSING};

pub const MODEL_NOT_SELECTED: &str = "bonzai_model_not_selected";

/// The key a piece of work bills to, with the scope so errors can name it.
#[derive(Clone, Debug)]
pub struct ResolvedKey {
    pub scope: KeyScope,
    pub key: String,
}

/// Resolve the key for work in `folder_id`'s project, or global work when
/// `None`. Never falls back further than the global key, and the refusal when
/// neither exists names the project so the user knows which key to add.
pub async fn key_for(folder_id: Option<&str>) -> Result<ResolvedKey, AppError> {
    let folder_id = folder_id.map(str::trim).filter(|value| !value.is_empty());
    if let Some(folder_id) = folder_id {
        let scope = KeyScope::Project {
            folder_id: folder_id.to_string(),
        };
        if let Some(key) = keys::get(&scope).await? {
            return Ok(ResolvedKey { scope, key });
        }
        return match keys::get(&KeyScope::Global).await? {
            Some(key) => Ok(ResolvedKey {
                scope: KeyScope::Global,
                key,
            }),
            None => Err(AppError::new(
                KEY_MISSING,
                format!(
                    "No Bonzai key is configured for project {folder_id} and there is no global Bonzai key to fall back to. Add one before running this."
                ),
            )),
        };
    }
    let scope = KeyScope::Global;
    let key = keys::require(&scope).await?;
    Ok(ResolvedKey { scope, key })
}

/// Resolve the key for an operation by its upstream operation id: a note id,
/// a `<note>-chunk-N` id for long recordings, or a live-preview id. Live
/// previews run before a note has a project and bill globally.
pub async fn key_for_operation(operation_id: Option<&str>) -> Result<ResolvedKey, AppError> {
    let folder_id = match note_id_from_operation(operation_id) {
        Some(note_id) => folder_for_note(&note_id).await,
        None => None,
    };
    key_for(folder_id.as_deref()).await
}

/// The note behind an operation id, if the id is a note's. Upstream suffixes
/// chunked transcription with `-chunk-N` and prefixes previews with
/// `live-preview-`; anything else is passed through as a note id and simply
/// finds no folder when it is not one.
pub(crate) fn note_id_from_operation(operation_id: Option<&str>) -> Option<String> {
    let operation_id = operation_id
        .map(str::trim)
        .filter(|value| !value.is_empty())?;
    if operation_id.starts_with("live-preview-") {
        return None;
    }
    let note_id = match operation_id.rsplit_once("-chunk-") {
        Some((note_id, suffix))
            if !suffix.is_empty() && suffix.chars().all(|c| c.is_ascii_digit()) =>
        {
            note_id
        }
        _ => operation_id,
    };
    (!note_id.is_empty()).then(|| note_id.to_string())
}

/// The project a note belongs to. A note can sit in several projects; the
/// most recent assignment wins, which matches what the sidebar shows.
pub async fn folder_for_note(note_id: &str) -> Option<String> {
    let pool = pool().await?;
    query(
        "SELECT nf.folder_id FROM note_folders nf
         INNER JOIN folders f ON f.id = nf.folder_id
         WHERE nf.note_id = ? AND f.deleted_at IS NULL
         ORDER BY nf.assigned_at DESC LIMIT 1",
    )
    .bind(note_id)
    .fetch_optional(&pool)
    .await
    .ok()
    .flatten()
    .and_then(|row| row.try_get::<String, _>("folder_id").ok())
}

/// The project an agent session belongs to, if it was moved into one.
pub async fn folder_for_session(session_id: &str) -> Option<String> {
    let pool = pool().await?;
    query(
        "SELECT sf.folder_id FROM session_folders sf
         INNER JOIN folders f ON f.id = sf.folder_id
         WHERE sf.session_id = ? AND f.deleted_at IS NULL
         ORDER BY sf.assigned_at DESC LIMIT 1",
    )
    .bind(session_id)
    .fetch_optional(&pool)
    .await
    .ok()
    .flatten()
    .and_then(|row| row.try_get::<String, _>("folder_id").ok())
}

async fn pool() -> Option<sqlx_sqlite::SqlitePool> {
    let app = super::app_handle()?;
    crate::commands::repositories(&app)
        .await
        .ok()
        .map(|repositories| repositories.pool)
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

    #[test]
    fn operation_ids_map_back_to_their_note() {
        assert_eq!(
            note_id_from_operation(Some("note-123")).as_deref(),
            Some("note-123")
        );
        assert_eq!(
            note_id_from_operation(Some("note-123-chunk-4")).as_deref(),
            Some("note-123")
        );
        assert_eq!(
            note_id_from_operation(Some("my-chunk-name-chunk-12")).as_deref(),
            Some("my-chunk-name")
        );
        assert_eq!(
            note_id_from_operation(Some("note-chunk-x")).as_deref(),
            Some("note-chunk-x")
        );
        assert_eq!(note_id_from_operation(Some("live-preview-s1-mic-3")), None);
        assert_eq!(note_id_from_operation(Some("   ")), None);
        assert_eq!(note_id_from_operation(None), None);
    }
}
