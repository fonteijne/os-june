//! Severance: what this fork switches off, and the fail-closed paths behind it.
//!
//! The PRD (section 7.7) asks three things of every disabled capability, and
//! hiding UI alone is how the guarantee leaks: the tool is not registered in
//! the agent loop, the UI surface is absent, and the underlying call path
//! fails closed if reached. This module owns the last two on the native side
//! and the tool registry filter for the first; the one-line guards upstream's
//! functions spend on it are inert on any build that is not a Bonzai build.
//!
//! It also owns the no-account mode (PRD section 7.8): a synthetic,
//! always-signed-in account that satisfies the sign-in and funding gates
//! locally, so the app never contacts OS Accounts and never meters.

use crate::domain::types::AppError;
use crate::os_accounts::{AccountBalance, AccountStatus, AccountSubscription, AccountUser};

pub const CAPABILITY_DISABLED: &str = "bonzai_capability_disabled";
pub const DICTATION_DISABLED: &str = "dictation_disabled";

/// Agent tools this fork does not ship. Web search and fetch are not model
/// primitives and have no gateway equivalent; image and video generation
/// follow a Venice-specific contract; computer and browser use are Clovy-side
/// orchestration. Restorable through an approved MCP server, never here.
const DISABLED_TOOLS: &[&str] = &[
    "generate_image",
    "edit_image",
    "generate_video",
    "web_search",
    "web_fetch",
    "computer_use",
];
const DISABLED_TOOL_PREFIXES: &[&str] = &["browser_"];

/// Whether this build runs without an account. Same condition as routing:
/// a Bonzai build has no OS Accounts to talk to.
pub fn no_account_mode() -> bool {
    super::active()
}

pub fn dictation_disabled() -> bool {
    !crate::feature_flags::DICTATION_ENABLED
}

fn tool_is_disabled(name: &str) -> bool {
    DISABLED_TOOLS.contains(&name)
        || DISABLED_TOOL_PREFIXES
            .iter()
            .any(|prefix| name.starts_with(prefix))
}

/// Drop disabled tools from the descriptor list the agent runtime advertises,
/// so the model never sees them. A no-op on a non-Bonzai build.
pub fn strip_disabled_tools(tools: &mut serde_json::Value) {
    if !super::active() {
        return;
    }
    if let Some(list) = tools.as_array_mut() {
        list.retain(|tool| {
            !tool
                .get("name")
                .and_then(serde_json::Value::as_str)
                .is_some_and(tool_is_disabled)
        });
    }
}

/// Refuse a disabled tool at dispatch, in case a call reaches the host by a
/// route other than the advertised list.
pub fn refuse_disabled_tool(name: &str) -> Result<(), AppError> {
    if super::active() && tool_is_disabled(name) {
        return Err(AppError::new(
            CAPABILITY_DISABLED,
            format!("The {name} tool is switched off in this build. Web, image, video, computer, and browser capabilities are not available; an approved MCP server can restore search."),
        ));
    }
    Ok(())
}

/// Refuse a Clovy API request. Every Clovy API call goes through one of a
/// handful of request helpers, and each spends one line asking this before it
/// sends; a Bonzai build therefore makes zero requests to the Clovy API host.
/// The error is the egress code, not a network code, so a log line reads as
/// "we refused" rather than "it was down".
pub fn refuse_clovy_api(path: &str) -> Result<(), AppError> {
    if !super::active() {
        return Ok(());
    }
    Err(AppError::new(
        super::egress::EGRESS_BLOCKED,
        format!("This build does not contact the Clovy API ({path}). Inference goes to Bonzai and nowhere else."),
    ))
}

/// Refuse dictation while its kill switch is off. Independent of Bonzai:
/// the switch is a product decision about latency, not an egress one.
pub fn refuse_dictation() -> Result<(), AppError> {
    if dictation_disabled() {
        return Err(AppError::new(
            DICTATION_DISABLED,
            "Dictation is switched off in this build.",
        ));
    }
    Ok(())
}

/// The synthetic account a Bonzai build runs under. Signed in, configured,
/// an active subscription with full usage remaining: enough to satisfy every
/// gate the frontend applies without a single OS Accounts request. It carries
/// `local_dev: true` because that is the wire flag the frontend already
/// treats as "synthetic account, no billing surface".
pub fn account_status() -> AccountStatus {
    AccountStatus {
        signed_in: true,
        configured: true,
        local_dev: true,
        user: Some(AccountUser {
            id: "usr_bonzai".to_string(),
            handle: "bonzai".to_string(),
            email: None,
            display_name: Some("Bonzai build".to_string()),
            avatar_url: None,
            avatar_seed: None,
        }),
        balance: Some(AccountBalance {
            credits: 0,
            usd_millis: 0,
            usage_remaining_percent: Some(100),
        }),
        subscription: Some(AccountSubscription {
            subscribed: true,
            status: Some("active".to_string()),
            plan: None,
            plan_credits: Some(0),
            trial_end: None,
            current_period_end: None,
            trial_period_days: None,
            scheduled_plan: None,
            scheduled_plan_credits: None,
        }),
        portal_url: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_disabled_capability_is_named_and_browser_tools_match_by_prefix() {
        for name in [
            "generate_image",
            "edit_image",
            "generate_video",
            "web_search",
            "web_fetch",
            "computer_use",
            "browser_open",
        ] {
            assert!(tool_is_disabled(name), "{name}");
        }
        for name in ["search_june", "run_shell", "mcp_docs_search", "save_memory"] {
            assert!(!tool_is_disabled(name), "{name}");
        }
    }

    #[test]
    fn stripping_keeps_the_rest_of_the_list_intact() {
        // Bonzai is inactive in unit tests, so exercise the retain directly.
        let mut tools = serde_json::json!([
            { "name": "search_june" }, { "name": "web_search" }, { "name": "browser_click" }, { "name": "run_shell" }
        ]);
        tools.as_array_mut().unwrap().retain(|tool| {
            !tool
                .get("name")
                .and_then(serde_json::Value::as_str)
                .is_some_and(tool_is_disabled)
        });
        let names: Vec<&str> = tools
            .as_array()
            .unwrap()
            .iter()
            .map(|t| t["name"].as_str().unwrap())
            .collect();
        assert_eq!(names, ["search_june", "run_shell"]);
    }

    #[test]
    fn the_synthetic_account_satisfies_both_gates_without_a_network() {
        let account = account_status();
        assert!(account.signed_in);
        assert!(account.local_dev);
        assert_eq!(
            account
                .subscription
                .as_ref()
                .and_then(|s| s.status.as_deref()),
            Some("active")
        );
        assert_eq!(
            account
                .balance
                .as_ref()
                .and_then(|b| b.usage_remaining_percent),
            Some(100)
        );
    }

    #[test]
    fn dictation_refusal_follows_the_kill_switch() {
        assert_eq!(refuse_dictation().is_err(), dictation_disabled());
    }
}
