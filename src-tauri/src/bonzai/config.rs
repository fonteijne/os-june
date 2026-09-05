//! Where this build sends inference, as distinct from where it is permitted
//! to send it.
//!
//! The base URL follows the repo's existing configuration idiom - a value
//! baked at build time, overridden by a runtime environment variable when one
//! is present - so development can point at a staging gateway. It is then
//! checked against the compiled allowlist like any other destination:
//! configuration is a *subject* of the egress policy, never a source of it
//! (ADR-0059).

use crate::domain::types::AppError;
use reqwest::Url;

/// The environment variable, and the `option_env!` key baked at build time.
pub const BONZAI_BASE_URL_ENV: &str = "BONZAI_BASE_URL";

/// Runtime environment first, then the build-time value.
///
/// Mirrors `env_or_build_trimmed` in `os_accounts.rs` deliberately rather than
/// sharing it: ADR-0058 accepts duplication here so that this fork's routing
/// does not depend on a private helper upstream is free to move. Loading the
/// local `.env` first matches how the rest of the app resolves configuration.
fn configured_raw() -> String {
    crate::os_accounts::load_local_env();
    let runtime = std::env::var(BONZAI_BASE_URL_ENV)
        .map(|value| value.trim().to_string())
        .unwrap_or_default();
    if runtime.is_empty() {
        // `option_env!` needs a literal, so this repeats the constant above.
        // A rename that misses this line silently drops the build-time value.
        option_env!("BONZAI_BASE_URL")
            .map(str::trim)
            .unwrap_or_default()
            .to_string()
    } else {
        runtime
    }
}

/// Whether this build has a Bonzai base URL at all.
///
/// Absent is a valid state until the routing phases land, and is not the same
/// as configured-but-refused, which fails the app at startup.
pub fn is_configured() -> bool {
    !configured_raw().is_empty()
}

/// The configured base URL, once it has passed the egress allowlist.
pub fn base_url() -> Result<Url, AppError> {
    let raw = configured_raw();
    if raw.is_empty() {
        return Err(AppError::new(
            "bonzai_base_url_missing",
            format!("No Bonzai base URL is configured. Set {BONZAI_BASE_URL_ENV}."),
        ));
    }
    let url = Url::parse(&raw).map_err(|_| {
        AppError::new(
            "bonzai_base_url_invalid",
            format!("The configured {BONZAI_BASE_URL_ENV} is not a valid URL."),
        )
    })?;
    crate::bonzai::egress::assert_allowed(&url)?;
    Ok(url)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::bonzai::egress::EGRESS_BLOCKED;

    /// `base_url` reads process-wide state, so these cases exercise the
    /// validation directly rather than racing other tests over the
    /// environment.
    fn validate(raw: &str) -> Result<Url, AppError> {
        let url = Url::parse(raw).map_err(|_| {
            AppError::new("bonzai_base_url_invalid", "The configured URL is invalid.")
        })?;
        crate::bonzai::egress::assert_allowed(&url)?;
        Ok(url)
    }

    #[test]
    fn an_allowlisted_base_url_resolves() {
        assert!(validate("https://api-v2.bonzai.iodigital.com").is_ok());
    }

    #[test]
    fn a_base_url_outside_the_allowlist_is_refused() {
        let error = validate("https://gateway.attacker.example").expect_err("refused");
        assert_eq!(error.code, EGRESS_BLOCKED);
    }

    #[test]
    fn an_unparseable_base_url_is_refused() {
        let error = validate("not a url").expect_err("refused");
        assert_eq!(error.code, "bonzai_base_url_invalid");
    }
}
