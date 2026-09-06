//! Log output for a Bonzai build.
//!
//! The desktop crate emits `tracing` events everywhere (the agent runtime's
//! stderr is forwarded as `agent_runtime` warnings, Bonzai refusals are
//! warned at the proxy) but installs no subscriber, so none of it reaches a
//! terminal. A beta that fails closed needs its reasons visible: this installs
//! a stderr subscriber once, filtered by `RUST_LOG` when set and otherwise at
//! `warn` for everything with the app's own crate at `info`.

const DEFAULT_FILTER: &str = "warn,clovy_lib=info,agent_runtime=warn";

pub(crate) fn install() {
    let filter = tracing_subscriber::EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new(DEFAULT_FILTER));
    let _ = tracing_subscriber::fmt()
        .with_env_filter(filter)
        .with_writer(std::io::stderr)
        .with_target(true)
        .try_init();
}
