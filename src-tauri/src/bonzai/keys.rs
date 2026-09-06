//! The keychain-backed store for Bonzai keys.
//!
//! A Bonzai key is a LiteLLM virtual key: it scopes model access and accrues
//! spend for one project, or for the whole install when it is the global key.
//! Keys live in the OS keychain and are never written to the notes database
//! or round-tripped to the frontend in plaintext; the UI learns only whether a
//! key is configured and a non-reversible last-four hint (PRD section 7.2,
//! following the Venice BYOK precedent rather than the local endpoint's).
//!
//! Naming follows ADR-0055: this is a new Clovy-era identity with no June-era
//! reader, so it uses the plain `keyring` entry rather than the compatibility
//! bridge in `credential_compat`.

use crate::domain::types::AppError;

const KEYCHAIN_SERVICE: &str = "co.opensoftware.clovy.bonzai";
const DEV_KEYCHAIN_SERVICE: &str = "co.opensoftware.clovy-dev.bonzai";
const GLOBAL_USER: &str = "global";
const PROJECT_USER_PREFIX: &str = "project:";
const MAX_KEY_CHARS: usize = 512;

pub const KEY_MISSING: &str = "bonzai_key_missing";
pub const KEY_INVALID: &str = "bonzai_key_invalid";
pub const KEYCHAIN_FAILED: &str = "bonzai_keychain_failed";

/// Which key a piece of work bills to.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum KeyScope {
    /// Work not attributable to a project.
    Global,
    /// Work done inside one project; `folder_id` is the `folders.id` value.
    Project { folder_id: String },
}

impl KeyScope {
    fn user(&self) -> String {
        match self {
            Self::Global => GLOBAL_USER.to_string(),
            Self::Project { folder_id } => format!("{PROJECT_USER_PREFIX}{folder_id}"),
        }
    }

    /// How error messages refer to this key. Named so a user reading a failure
    /// knows which key to go and fix in LiteLLM.
    pub fn describe(&self) -> String {
        match self {
            Self::Global => "the global Bonzai key".to_string(),
            Self::Project { folder_id } => format!("the Bonzai key for project {folder_id}"),
        }
    }
}

fn service() -> &'static str {
    if cfg!(debug_assertions) {
        DEV_KEYCHAIN_SERVICE
    } else {
        KEYCHAIN_SERVICE
    }
}

/// The last four characters, for display. Short keys get no hint at all
/// rather than a hint that is most of the key.
pub fn hint(key: &str) -> Option<String> {
    let key = key.trim();
    (key.chars().count() >= 12).then(|| {
        key.chars()
            .rev()
            .take(4)
            .collect::<Vec<_>>()
            .into_iter()
            .rev()
            .collect()
    })
}

/// Shape check before anything touches the keychain or the network: a pasted
/// key with a stray newline fails here, with a message about the paste, rather
/// than at Bonzai with a message about authentication.
pub fn validate_shape(key: &str) -> Result<String, AppError> {
    let key = key.trim();
    if key.is_empty() {
        return Err(AppError::new(KEY_INVALID, "Paste a Bonzai key."));
    }
    if key.chars().any(char::is_whitespace) || key.chars().any(char::is_control) {
        return Err(AppError::new(
            KEY_INVALID,
            "A Bonzai key cannot contain spaces or line breaks. Paste it again.",
        ));
    }
    if key.chars().count() > MAX_KEY_CHARS {
        return Err(AppError::new(
            KEY_INVALID,
            "That is too long to be a Bonzai key.",
        ));
    }
    Ok(key.to_string())
}

pub async fn get(scope: &KeyScope) -> Result<Option<String>, AppError> {
    let user = scope.user();
    tokio::task::spawn_blocking(move || store::get(service(), &user))
        .await
        .map_err(|error| AppError::new(KEYCHAIN_FAILED, error.to_string()))?
}

pub async fn set(scope: &KeyScope, key: &str) -> Result<(), AppError> {
    let key = validate_shape(key)?;
    let user = scope.user();
    tokio::task::spawn_blocking(move || store::set(service(), &user, &key))
        .await
        .map_err(|error| AppError::new(KEYCHAIN_FAILED, error.to_string()))?
}

pub async fn clear(scope: &KeyScope) -> Result<(), AppError> {
    let user = scope.user();
    tokio::task::spawn_blocking(move || store::delete(service(), &user))
        .await
        .map_err(|error| AppError::new(KEYCHAIN_FAILED, error.to_string()))?
}

/// The key for a scope, or the loud refusal the PRD requires when there is
/// none: no fallback to another key, and the work does not start.
pub async fn require(scope: &KeyScope) -> Result<String, AppError> {
    get(scope).await?.ok_or_else(|| {
        AppError::new(
            KEY_MISSING,
            format!(
                "No Bonzai key is configured for {}. Add one in Settings before running this.",
                scope.describe()
            ),
        )
    })
}

/// The OS keychain on the platforms this app ships to.
#[cfg(any(target_os = "macos", target_os = "windows"))]
mod store {
    use super::{AppError, KEYCHAIN_FAILED};

    fn entry(service: &str, user: &str) -> Result<keyring::Entry, AppError> {
        keyring::Entry::new(service, user)
            .map_err(|error| AppError::new(KEYCHAIN_FAILED, error.to_string()))
    }

    pub fn get(service: &str, user: &str) -> Result<Option<String>, AppError> {
        match entry(service, user)?.get_password() {
            Ok(value) => Ok(Some(value)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(error) => Err(AppError::new(KEYCHAIN_FAILED, error.to_string())),
        }
    }

    pub fn set(service: &str, user: &str, value: &str) -> Result<(), AppError> {
        entry(service, user)?
            .set_password(value)
            .map_err(|error| AppError::new(KEYCHAIN_FAILED, error.to_string()))
    }

    pub fn delete(service: &str, user: &str) -> Result<(), AppError> {
        match entry(service, user)?.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(error) => Err(AppError::new(KEYCHAIN_FAILED, error.to_string())),
        }
    }
}

/// Development hosts without a keychain crate (Linux). A JSON file in the app
/// config directory, owner-readable only. Release builds never take this
/// path: the crate has no Linux release target.
#[cfg(not(any(target_os = "macos", target_os = "windows")))]
mod store {
    use super::{AppError, KEYCHAIN_FAILED};
    use std::collections::BTreeMap;
    use std::path::PathBuf;

    fn path(service: &str) -> Result<PathBuf, AppError> {
        let directory = crate::bonzai::config_dir().ok_or_else(|| {
            AppError::new(
                KEYCHAIN_FAILED,
                "The Bonzai key store is not available before the app has started.",
            )
        })?;
        Ok(directory.join(format!("{service}.keys.json")))
    }

    fn load(service: &str) -> Result<BTreeMap<String, String>, AppError> {
        let path = path(service)?;
        match std::fs::read_to_string(&path) {
            Ok(raw) => serde_json::from_str(&raw)
                .map_err(|error| AppError::new(KEYCHAIN_FAILED, error.to_string())),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(BTreeMap::new()),
            Err(error) => Err(AppError::new(KEYCHAIN_FAILED, error.to_string())),
        }
    }

    fn save(service: &str, keys: &BTreeMap<String, String>) -> Result<(), AppError> {
        let path = path(service)?;
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|error| AppError::new(KEYCHAIN_FAILED, error.to_string()))?;
        }
        let raw = serde_json::to_string_pretty(keys)
            .map_err(|error| AppError::new(KEYCHAIN_FAILED, error.to_string()))?;
        std::fs::write(&path, raw)
            .map_err(|error| AppError::new(KEYCHAIN_FAILED, error.to_string()))?;
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let _ = std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o600));
        }
        Ok(())
    }

    pub fn get(service: &str, user: &str) -> Result<Option<String>, AppError> {
        Ok(load(service)?.get(user).cloned())
    }

    pub fn set(service: &str, user: &str, value: &str) -> Result<(), AppError> {
        let mut keys = load(service)?;
        keys.insert(user.to_string(), value.to_string());
        save(service, &keys)
    }

    pub fn delete(service: &str, user: &str) -> Result<(), AppError> {
        let mut keys = load(service)?;
        if keys.remove(user).is_some() {
            save(service, &keys)?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_hint_is_the_last_four_and_only_for_keys_long_enough_to_hide() {
        assert_eq!(hint("sk-1234567890abcd").as_deref(), Some("abcd"));
        assert_eq!(hint("short"), None);
        assert_eq!(hint("  sk-1234567890abcd  ").as_deref(), Some("abcd"));
    }

    #[test]
    fn shape_validation_catches_paste_accidents() {
        assert_eq!(validate_shape("").unwrap_err().code, KEY_INVALID);
        assert_eq!(validate_shape("sk-abc def").unwrap_err().code, KEY_INVALID);
        assert_eq!(validate_shape("sk-a\nbc").unwrap_err().code, KEY_INVALID);
        assert_eq!(validate_shape("sk-abc\n").unwrap(), "sk-abc");
        assert_eq!(
            validate_shape(&"x".repeat(600)).unwrap_err().code,
            KEY_INVALID
        );
        assert_eq!(validate_shape("  sk-live-abc  ").unwrap(), "sk-live-abc");
    }

    #[test]
    fn scopes_map_to_distinct_keychain_users() {
        assert_eq!(KeyScope::Global.user(), "global");
        assert_eq!(
            KeyScope::Project {
                folder_id: "fld_1".into()
            }
            .user(),
            "project:fld_1"
        );
        assert!(KeyScope::Project {
            folder_id: "fld_1".into()
        }
        .describe()
        .contains("fld_1"));
    }
}
