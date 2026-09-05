//! Bonzai routing for this fork.
//!
//! Everything upstream does not have lives here, so it cannot conflict on a
//! merge. See
//! [ADR-0058](../../../docs/adr/0058-bonzai-routing-lives-in-an-additive-provider-layer.md)
//! for why the layer is additive, and
//! [ADR-0059](../../../docs/adr/0059-bonzai-egress-is-enforced-by-a-build-time-allowlist.md)
//! for how egress is enforced.
//!
//! Phase 1 ships the egress boundary only: [`egress`] holds the compiled
//! allowlist, the runtime check, and the one place a `reqwest` client may be
//! constructed; [`config`] resolves the base URL and submits it to that
//! check. Routing arrives in later phases.

pub mod config;
pub mod egress;

/// Validate the configured Bonzai base URL before the app serves anything.
///
/// A build pointed at a host it may not reach refuses to start, rather than
/// appearing healthy and failing on the user's first recording (ADR-0059).
/// An unconfigured base URL is not an error: until the routing phases land
/// there is nothing to point anywhere.
pub fn setup() {
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
