//! Bonzai routing for this fork.
//!
//! Everything upstream does not have lives here, so it cannot conflict on a
//! merge. See
//! [ADR-0058](../../../docs/adr/0058-bonzai-routing-lives-in-an-additive-provider-layer.md)
//! for why the layer is additive, and
//! [ADR-0059](../../../docs/adr/0059-bonzai-egress-is-enforced-by-a-build-time-allowlist.md)
//! for how egress is enforced.
//!
//! - [`egress`] holds the compiled allowlist, the runtime check, and the one
//!   place a `reqwest` client may be constructed.
//! - [`config`] resolves the base URL and submits it to that check.
//! - [`keys`] is the keychain-backed store for Bonzai keys, global and
//!   per-project.
//! - [`http`] is the single request helper every Bonzai call goes through.
//! - [`models`], [`chat`], and [`audio`] are the operations: the model
//!   catalog per key, chat completions, and audio transcription.
//! - [`resolve`] answers "which key and which model for this work?".
//! - [`severance`] is what this fork switches off, the fail-closed paths
//!   behind it, and the no-account mode.
//! - [`mcp_policy`] governs tool egress: streamable HTTP on allowlisted hosts.
//! - [`commands`] is the Tauri surface, deliberately one command.
//!
//! Upstream reaches this module through three-line prologues at the top of
//! the functions it intercepts, and through nothing else.

pub mod audio;
pub mod chat;
pub mod commands;
pub mod config;
pub mod egress;
pub mod http;
pub mod keys;
pub mod mcp_policy;
pub mod models;
pub mod resolve;
pub mod severance;

use std::path::PathBuf;
use std::sync::OnceLock;

/// The provider identity Bonzai routes report, alongside upstream's `local`,
/// `venice`, and `openai`. Deliberately not `local`: Bonzai is a remote
/// managed server, and the privacy copy the UI attaches to `local` would be
/// false for it (ADR-0058).
pub const PROVIDER_BONZAI: &str = "bonzai";

static CONFIG_DIR: OnceLock<PathBuf> = OnceLock::new();
static APP: OnceLock<tauri::AppHandle> = OnceLock::new();

/// The wire field the agent host stamps onto a chat request so the Bonzai
/// proxy can bill the session's project. Stripped before the request leaves.
pub const SESSION_TAG_FIELD: &str = "clovy_session_id";

/// Whether this build routes inference to Bonzai.
///
/// True exactly when a Bonzai base URL is configured. There is no user
/// toggle by design: the PRD's requirement is one fixed endpoint configured
/// for the build, and a toggle would be a place for traffic to leak back to
/// upstream providers. A configured Bonzai with no key is *active and
/// failing loudly*, never inactive and silently falling back.
pub fn active() -> bool {
    config::is_configured()
}

/// Validate the configured Bonzai base URL before the app serves anything,
/// and remember where this build keeps its configuration.
///
/// A build pointed at a host it may not reach refuses to start, rather than
/// appearing healthy and failing on the user's first recording (ADR-0059).
/// An unconfigured base URL is not an error: a build without one simply does
/// not route to Bonzai.
pub fn setup(app: &tauri::App) {
    let _ = APP.set(app.handle().clone());
    if let Ok(directory) = crate::app_paths::app_config_dir(app.handle()) {
        let _ = CONFIG_DIR.set(directory);
    }
    if !config::is_configured() {
        return;
    }
    if let Err(error) = config::base_url() {
        panic!(
            "Bonzai base URL rejected at startup [{}]: {}",
            error.code, error.message
        );
    }
}

/// The app's configuration directory, once `setup` has run.
pub(crate) fn config_dir() -> Option<PathBuf> {
    CONFIG_DIR.get().cloned()
}

/// The app handle, once `setup` has run. Bonzai reaches the notes database
/// through it to answer "which project is this work for?".
pub(crate) fn app_handle() -> Option<tauri::AppHandle> {
    APP.get().cloned()
}

/// Stamp an agent chat request with the session it belongs to, so the Bonzai
/// proxy can resolve the session's project and bill its key. A no-op when
/// Bonzai is inactive, so the one line upstream's host spends on it is inert
/// for every other build.
pub fn tag_agent_request(body: &mut serde_json::Value, session_id: &str) {
    if !active() {
        return;
    }
    if let Some(object) = body.as_object_mut() {
        object.insert(
            SESSION_TAG_FIELD.to_string(),
            serde_json::Value::String(session_id.to_string()),
        );
    }
}
