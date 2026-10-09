//! External MCP behaves the same on every build.
//!
//! User-configured MCP servers follow the shared registry validation in
//! `src/agent_mcp.rs` whether or not the build routes inference to Bonzai.
//! The Bonzai layer restricts inference egress only, and reaches MCP solely
//! through the guarded HTTP constructors that keep the source-level egress
//! guard (`tests/bonzai_egress_guard.rs`) able to see every client.
//!
//! Unit tests cannot pin this on CI, because a CI checkout has no Bonzai base
//! URL and the Bonzai prologues are inert there. So this reads the source: a
//! reintroduced build-specific MCP admission check, host list, or stdio
//! refusal fails here on every machine.

use std::path::PathBuf;

fn source(relative: &str) -> String {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join(relative);
    std::fs::read_to_string(&path).unwrap_or_else(|error| panic!("{relative}: {error}"))
}

/// The only Bonzai items the MCP registry may name. Assembled at runtime so
/// this file does not itself contain the patterns it forbids.
fn permitted_bonzai_references() -> Vec<String> {
    ["guarded_builder", "guarded_client"]
        .iter()
        .map(|name| format!("bonzai::egress::{name}("))
        .collect()
}

#[test]
fn the_mcp_registry_consults_bonzai_only_for_guarded_http_clients() {
    let registry = source("src/agent_mcp.rs");
    let needle = format!("{}::", "bonzai");
    let permitted = permitted_bonzai_references();
    let offenders: Vec<String> = registry
        .lines()
        .enumerate()
        .filter(|(_, line)| !line.trim_start().starts_with("//"))
        .filter(|(_, line)| line.contains(&needle))
        .filter(|(_, line)| {
            !permitted
                .iter()
                .any(|allowed| line.contains(allowed.as_str()))
        })
        .map(|(index, line)| format!("src/agent_mcp.rs:{}: {}", index + 1, line.trim()))
        .collect();
    assert!(
        offenders.is_empty(),
        "External MCP must follow the shared registry rules on every build. Bonzai restricts \
         inference only (ADR-0059 addendum of 2026-10-02); route MCP HTTP clients through \
         bonzai::egress::guarded_builder() and add no build-specific MCP admission.\n{}",
        offenders.join("\n")
    );
}

#[test]
fn the_bonzai_layer_carries_no_mcp_admission_policy() {
    let module = source("src/bonzai/mod.rs");
    let forbidden_module = format!("mod {}_policy", "mcp");
    assert!(
        !module.contains(&forbidden_module),
        "src/bonzai/mod.rs declares an MCP policy module again"
    );
    assert!(
        !PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("src/bonzai/mcp_policy.rs")
            .exists(),
        "src/bonzai/mcp_policy.rs exists again"
    );
    let egress = source("src/bonzai/egress.rs");
    for forbidden in [
        format!("{}_ALLOWED_HOSTS", "MCP"),
        format!("{}_LOOPBACK_HOSTS", "MCP"),
        format!("assert_{}_allowed", "mcp"),
    ] {
        assert!(
            !egress.contains(&forbidden),
            "src/bonzai/egress.rs reintroduces {forbidden}"
        );
    }
}

#[test]
fn the_guard_reads_the_registry_it_protects() {
    // A guard that silently reads an empty or moved file would pass for the
    // wrong reason.
    let registry = source("src/agent_mcp.rs");
    assert!(registry.contains("fn validate_custom("));
    assert!(registry.contains("async fn start_transport("));
    assert!(registry.contains(&format!("bonzai::egress::{}(", "guarded_builder")));
}
