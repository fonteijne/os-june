//! The egress boundary: where this build is permitted to send, and the one
//! place an HTTP client may be built.
//!
//! Two mechanisms, per
//! [ADR-0059](../../../docs/adr/0059-bonzai-egress-is-enforced-by-a-build-time-allowlist.md),
//! because neither is sufficient alone:
//!
//! 1. **Runtime.** [`assert_allowed`] rejects a destination outside
//!    [`ALLOWED_HOSTS`] with a distinct [`EGRESS_BLOCKED`] error that is
//!    never confusable with a network failure. It guards the call sites it
//!    was written into.
//! 2. **Source-level.** `tests/bonzai_egress_guard.rs` fails the build if a
//!    raw `reqwest` client is constructed anywhere but this file. That is the
//!    half that catches a client an upstream merge introduces, which no
//!    runtime check can see.
//!
//! This file is the source guard's only exemption, so it is the only place
//! `guarded_builder` and `guarded_client` can live.

use crate::domain::types::AppError;
use reqwest::Url;

/// The error code a blocked destination reports.
///
/// Distinct from any transport error on purpose: "we refused to send this" and
/// "the network failed" are different facts, and a caller that conflates them
/// will retry its way around the allowlist.
pub const EGRESS_BLOCKED: &str = "egress_blocked";

/// Hosts this build may reach.
///
/// Compiled in, and deliberately unreachable from any runtime input: no
/// environment variable, `.env` file, settings value, or user action can add
/// an entry. Changing it requires a rebuild, which is the property that makes
/// it a guarantee rather than a policy someone remembers.
///
/// This is emphatically **not** derived from the configured base URL. The two
/// look alike and are not: the base URL is where we send, the allowlist is
/// where we are permitted to send. Deriving one from the other makes the check
/// self-referential and enforces nothing (ADR-0059, correction 3).
const ALLOWED_HOSTS: &[&str] = &["api-v2.bonzai.iodigital.com"];

/// Hosts a development build additionally permits.
///
/// Empty in release: `debug_assertions` is off there, so a release artifact
/// cannot carry a loopback entry even by accident. The difference between a
/// development and a release allowlist is visible here rather than incidental.
///
/// Note that [`assert_allowed`] requires `https` for these too. A permitted
/// host over plaintext is still plaintext, so a local gateway needs TLS
/// termination to be reachable.
#[cfg(debug_assertions)]
const DEV_ALLOWED_HOSTS: &[&str] = &["localhost", "127.0.0.1", "[::1]"];
#[cfg(not(debug_assertions))]
const DEV_ALLOWED_HOSTS: &[&str] = &[];

/// Every host this build may reach, release entries first.
pub fn allowed_hosts() -> Vec<&'static str> {
    ALLOWED_HOSTS
        .iter()
        .chain(DEV_ALLOWED_HOSTS.iter())
        .copied()
        .collect()
}

/// Reject a destination this build may not reach.
///
/// Fails closed. `https` only, and the host must match an allowlist entry
/// exactly after normalisation - no suffix matching, so
/// `api-v2.bonzai.iodigital.com.attacker.net` does not pass, and no wildcards.
pub fn assert_allowed(url: &Url) -> Result<(), AppError> {
    if url.scheme() != "https" {
        return Err(blocked(url, "only https destinations are permitted"));
    }
    let Some(host) = url.host_str() else {
        return Err(blocked(url, "the destination has no host"));
    };
    if !is_allowed_host(host) {
        return Err(blocked(
            url,
            "the host is not in this build's compiled egress allowlist",
        ));
    }
    Ok(())
}

/// Whether a host string matches the compiled allowlist.
pub fn is_allowed_host(host: &str) -> bool {
    let host = normalize_host(host);
    if host.is_empty() {
        return false;
    }
    allowed_hosts()
        .iter()
        .any(|allowed| normalize_host(allowed) == host)
}

/// Case folding and the trailing dot of an absolute domain name. Nothing else:
/// any normalisation that could make two different hosts compare equal is a
/// hole in the allowlist.
fn normalize_host(host: &str) -> String {
    host.trim().trim_end_matches('.').to_ascii_lowercase()
}

/// The blocked error. Carries scheme and host, never the path or query, which
/// routinely hold tokens and prompt content.
fn blocked(url: &Url, reason: &str) -> AppError {
    AppError::new(
        EGRESS_BLOCKED,
        format!(
            "Blocked by this build's egress allowlist: {reason}. Destination: {}://{}",
            url.scheme(),
            url.host_str().unwrap_or("<no host>")
        ),
    )
}

/// The only permitted `reqwest::ClientBuilder` in this crate.
///
/// It is a pass-through by design, and that is the point rather than an
/// oversight: it adds no transport defaults, because doing so would silently
/// change behaviour at every call site it replaced. Its value is that there is
/// exactly one construction site, so a client an upstream merge adds cannot
/// arrive unnoticed - the source guard fails the build until it comes through
/// here and someone decides what it is for.
pub fn guarded_builder() -> reqwest::ClientBuilder {
    reqwest::Client::builder()
}

/// The only permitted default `reqwest::Client` in this crate. See
/// [`guarded_builder`].
pub fn guarded_client() -> reqwest::Client {
    reqwest::Client::new()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn url(raw: &str) -> Url {
        Url::parse(raw).expect("test url parses")
    }

    #[test]
    fn allows_a_compiled_host_over_https() {
        assert!(assert_allowed(&url("https://api-v2.bonzai.iodigital.com/v1/models")).is_ok());
    }

    #[test]
    fn rejects_plaintext_even_for_an_allowed_host() {
        let error = assert_allowed(&url("http://api-v2.bonzai.iodigital.com/v1/models"))
            .expect_err("plaintext is refused");
        assert_eq!(error.code, EGRESS_BLOCKED);
    }

    #[test]
    fn rejects_a_host_that_merely_suffixes_an_allowed_one() {
        for raw in [
            "https://api-v2.bonzai.iodigital.com.attacker.example/v1",
            "https://evil-api-v2.bonzai.iodigital.com/v1",
            "https://bonzai.iodigital.com/v1",
        ] {
            let error = assert_allowed(&url(raw)).expect_err("suffix match is refused");
            assert_eq!(error.code, EGRESS_BLOCKED, "{raw} should be blocked");
        }
    }

    #[test]
    fn host_comparison_folds_case_and_the_trailing_dot() {
        assert!(assert_allowed(&url("https://API-V2.Bonzai.IODigital.com./v1")).is_ok());
    }

    #[test]
    fn the_blocked_error_never_carries_the_path_or_query() {
        let error = assert_allowed(&url("https://attacker.example/v1/chat?key=secret-token"))
            .expect_err("unknown host is refused");
        assert!(!error.message.contains("secret-token"));
        assert!(!error.message.contains("/v1/chat"));
    }

    #[test]
    fn a_release_allowlist_carries_no_loopback_entry() {
        // Release builds must never reach the developer's machine. In a debug
        // build the dev entries are expected, so this asserts the split holds
        // rather than that the list is empty.
        for host in ALLOWED_HOSTS {
            assert!(
                !matches!(*host, "localhost" | "127.0.0.1" | "[::1]" | "0.0.0.0"),
                "{host} is a loopback entry in the release allowlist"
            );
        }
    }

    #[test]
    fn an_empty_or_hostless_destination_is_refused() {
        assert!(!is_allowed_host(""));
        assert!(!is_allowed_host("   "));
        assert!(!is_allowed_host("."));
    }
}
