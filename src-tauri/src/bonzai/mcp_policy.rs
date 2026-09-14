//! The MCP policy (PRD section 7.6, ADR-0059): tool egress is governed, not
//! closed. A Bonzai build permits `streamable_http` MCP servers whose host is
//! on the compiled MCP allowlist and nothing else. `stdio` stays off because a
//! spawned binary makes its own network calls, which no in-process check can
//! observe.
//!
//! Enforced twice, at the two points upstream already funnels through: when
//! a definition is saved (`validate_custom`) and when a transport is started
//! (`start_transport`). Saving catches the mistake while the user is looking
//! at the form; starting catches a definition that predates the policy.

use crate::agent_mcp::{AgentMcpError, McpServerDefinition, McpTransport};

/// The policy check. A no-op on a build that does not route to Bonzai.
pub fn check(definition: &McpServerDefinition) -> Result<(), AgentMcpError> {
    if !super::active() {
        return Ok(());
    }
    apply(definition)
}

fn apply(definition: &McpServerDefinition) -> Result<(), AgentMcpError> {
    match definition.transport {
        McpTransport::Stdio => Err(AgentMcpError::InvalidDefinition(
            "local process (stdio) MCP servers are switched off in this build; only streamable HTTP servers on allowlisted hosts are permitted".into(),
        )),
        McpTransport::StreamableHttp => {
            let url = definition
                .url
                .as_deref()
                .ok_or_else(|| AgentMcpError::InvalidDefinition("HTTP servers require url".into()))?;
            let parsed = reqwest::Url::parse(url)
                .map_err(|_| AgentMcpError::InvalidDefinition("HTTP url is invalid".into()))?;
            super::egress::assert_mcp_allowed(&parsed)
                .map_err(|error| AgentMcpError::InvalidDefinition(error.message))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stdio_is_refused_outright() {
        let mut server = McpServerDefinition::new("local", McpTransport::Stdio);
        server.command = Some("node".into());
        let error = apply(&server).unwrap_err();
        assert!(
            matches!(error, AgentMcpError::InvalidDefinition(message) if message.contains("stdio"))
        );
    }

    #[test]
    fn an_http_server_off_the_allowlist_is_refused_with_the_egress_reason() {
        let mut server = McpServerDefinition::new("docs", McpTransport::StreamableHttp);
        server.url = Some("https://mcp.example/sse".into());
        let error = apply(&server).unwrap_err();
        assert!(
            matches!(error, AgentMcpError::InvalidDefinition(message) if message.contains("allowlist"))
        );
    }

    #[test]
    fn a_missing_or_malformed_url_is_still_a_definition_error() {
        let server = McpServerDefinition::new("docs", McpTransport::StreamableHttp);
        assert!(matches!(
            apply(&server),
            Err(AgentMcpError::InvalidDefinition(_))
        ));
        let mut server = McpServerDefinition::new("docs", McpTransport::StreamableHttp);
        server.url = Some("not a url".into());
        assert!(matches!(
            apply(&server),
            Err(AgentMcpError::InvalidDefinition(_))
        ));
    }
}
