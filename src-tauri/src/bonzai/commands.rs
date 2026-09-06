//! The Tauri surface for Bonzai: one command, many actions.
//!
//! Every command registered in `lib.rs` is a line inside a block upstream
//! also appends to, and ADR-0058 budgets those lines. A single dispatching
//! command costs one, and keeps the whole Bonzai surface, request and
//! response types included, inside this module. The frontend wrapper in
//! `src/lib/bonzai.ts` gives each action a typed function, so callers never
//! see the dispatch.

use serde::{Deserialize, Serialize};

use crate::domain::types::AppError;

use super::keys::{self, KeyScope};

#[derive(Debug, Deserialize)]
#[serde(tag = "action", rename_all = "snake_case")]
pub enum BonzaiRequest {
    /// Whether Bonzai is active, where it points, and which keys exist.
    Status,
    /// Store the global key after a shape check and a live probe.
    SetGlobalKey {
        key: String,
    },
    ClearGlobalKey,
    /// Store a project's key after a shape check and a live probe.
    SetProjectKey {
        folder_id: String,
        key: String,
    },
    ClearProjectKey {
        folder_id: String,
    },
    /// Which key a project would bill to right now, and its hint.
    ProjectKeyStatus {
        folder_id: String,
    },
    /// Probe a pasted key against Bonzai without storing it: the model ids
    /// it can reach, or the error Bonzai gave.
    ProbeKey {
        key: String,
    },
}

#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct BonzaiStatusDto {
    pub active: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub base_url: Option<String>,
    pub global_key_configured: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub global_key_hint: Option<String>,
}

#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct BonzaiProjectKeyStatusDto {
    pub folder_id: String,
    /// True when the project has its own key; false when it would bill to
    /// the global key.
    pub project_key_configured: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub project_key_hint: Option<String>,
    pub global_key_configured: bool,
}

#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct BonzaiProbeDto {
    pub models: Vec<String>,
}

#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum BonzaiResponse {
    Status(BonzaiStatusDto),
    ProjectKeyStatus(BonzaiProjectKeyStatusDto),
    Probe(BonzaiProbeDto),
}

#[tauri::command]
pub async fn bonzai_command(request: BonzaiRequest) -> Result<BonzaiResponse, AppError> {
    match request {
        BonzaiRequest::Status => status().await.map(BonzaiResponse::Status),
        BonzaiRequest::SetGlobalKey { key } => {
            probe(&key).await?;
            keys::set(&KeyScope::Global, &key).await?;
            status().await.map(BonzaiResponse::Status)
        }
        BonzaiRequest::ClearGlobalKey => {
            keys::clear(&KeyScope::Global).await?;
            status().await.map(BonzaiResponse::Status)
        }
        BonzaiRequest::SetProjectKey { folder_id, key } => {
            let scope = project_scope(&folder_id)?;
            probe(&key).await?;
            keys::set(&scope, &key).await?;
            project_key_status(folder_id)
                .await
                .map(BonzaiResponse::ProjectKeyStatus)
        }
        BonzaiRequest::ClearProjectKey { folder_id } => {
            let scope = project_scope(&folder_id)?;
            keys::clear(&scope).await?;
            project_key_status(folder_id)
                .await
                .map(BonzaiResponse::ProjectKeyStatus)
        }
        BonzaiRequest::ProjectKeyStatus { folder_id } => {
            project_scope(&folder_id)?;
            project_key_status(folder_id)
                .await
                .map(BonzaiResponse::ProjectKeyStatus)
        }
        BonzaiRequest::ProbeKey { key } => probe(&key).await.map(BonzaiResponse::Probe),
    }
}

async fn status() -> Result<BonzaiStatusDto, AppError> {
    let global = keys::get(&KeyScope::Global).await?;
    Ok(BonzaiStatusDto {
        active: super::active(),
        base_url: super::config::base_url().ok().map(|url| url.to_string()),
        global_key_configured: global.is_some(),
        global_key_hint: global.as_deref().and_then(keys::hint),
    })
}

async fn project_key_status(folder_id: String) -> Result<BonzaiProjectKeyStatusDto, AppError> {
    let project = keys::get(&KeyScope::Project {
        folder_id: folder_id.clone(),
    })
    .await?;
    let global = keys::get(&KeyScope::Global).await?;
    Ok(BonzaiProjectKeyStatusDto {
        folder_id,
        project_key_configured: project.is_some(),
        project_key_hint: project.as_deref().and_then(keys::hint),
        global_key_configured: global.is_some(),
    })
}

/// Validate a key against Bonzai by listing the models it may reach. A bad
/// key is caught while the user is looking at the field (PRD section 9), and
/// the model list doubles as confirmation of what the key unlocks.
async fn probe(key: &str) -> Result<BonzaiProbeDto, AppError> {
    let key = keys::validate_shape(key)?;
    let resolved = super::resolve::ResolvedKey {
        scope: KeyScope::Global,
        key,
    };
    let models = super::models::list_ids(&resolved).await.map_err(|error| {
        // The probe is about the pasted key, not about whichever key is
        // stored, so reword the scope the helper filled in.
        AppError::new(
            error.code,
            error
                .message
                .replace("the global Bonzai key", "the pasted key"),
        )
    })?;
    Ok(BonzaiProbeDto { models })
}

fn project_scope(folder_id: &str) -> Result<KeyScope, AppError> {
    let folder_id = folder_id.trim();
    if folder_id.is_empty() {
        return Err(AppError::new(
            "folder_id_required",
            "A project is required.",
        ));
    }
    Ok(KeyScope::Project {
        folder_id: folder_id.to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn requests_deserialize_from_the_frontend_wire_shape() {
        let request: BonzaiRequest = serde_json::from_str(r#"{"action":"status"}"#).unwrap();
        assert!(matches!(request, BonzaiRequest::Status));
        let request: BonzaiRequest =
            serde_json::from_str(r#"{"action":"set_project_key","folder_id":"f1","key":"k"}"#)
                .unwrap();
        assert!(matches!(request, BonzaiRequest::SetProjectKey { .. }));
    }

    #[test]
    fn status_serializes_without_the_key_itself() {
        let dto = BonzaiResponse::Status(BonzaiStatusDto {
            active: true,
            base_url: Some("https://api-v2.bonzai.iodigital.com/".into()),
            global_key_configured: true,
            global_key_hint: Some("abcd".into()),
        });
        let json = serde_json::to_string(&dto).unwrap();
        assert!(json.contains("\"kind\":\"status\""));
        assert!(json.contains("\"globalKeyHint\":\"abcd\""));
        assert!(!json.contains("sk-"));
    }
}
