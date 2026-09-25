//! Keeping an agent request portable across the providers behind LiteLLM.
//!
//! The agent runtime speaks OpenAI's Chat Completions dialect, and upstream's
//! own gateway forwards that dialect to one provider that tolerates every
//! word of it. Bonzai fans the same request out to many providers, and
//! LiteLLM refuses a parameter a provider does not support rather than
//! dropping it (its `drop_params` is a deployment setting this fork does not
//! control), while OpenAI validates `strict` tool schemas more harshly than
//! anyone else. The runtime sends `reasoning_effort` on every request and
//! marks every tool `strict`, so before this module the only models that
//! worked through Bonzai were the ones that happen to accept both, which in
//! practice meant Anthropic's.
//!
//! Two mechanisms, neither of which knows any provider by name:
//!
//! - [`make_portable`] removes what no provider needs and a strict validator
//!   may reject (`strict` on tool definitions), and leaves out the tuning
//!   parameters this model refused earlier in the process.
//! - [`refused_parameters`] reads a refusal and names the tuning parameters
//!   it objects to, so the caller can drop them, remember them for the model
//!   with [`remember_refused`], and send again.
//!
//! Only tuning parameters are ever dropped. A refusal that names the model,
//! the messages, the tools, or the response format is a real error and is
//! passed through untouched.

use std::collections::{BTreeSet, HashMap};
use std::sync::{Mutex, OnceLock};

/// The request parameters that shape *how* a model answers rather than
/// *what* it is asked. Dropping one changes the answer's style or cost, never
/// its meaning, so a model that refuses one is sent the request without it.
pub const TUNING_PARAMETERS: &[&str] = &[
    "reasoning_effort",
    "verbosity",
    "parallel_tool_calls",
    "stream_options",
    "store",
    "prompt_cache_retention",
    "prompt_cache_options",
    "prompt_cache_key",
    "service_tier",
    "safety_identifier",
    "temperature",
    "top_p",
    "frequency_penalty",
    "presence_penalty",
    "max_tokens",
    "max_completion_tokens",
    "seed",
    "logit_bias",
    "logprobs",
    "top_logprobs",
    "n",
    "stop",
    "metadata",
    "user",
];

/// How many times one request is resent without the parameters a refusal
/// named. Each round can drop several parameters, and a refusal that keeps
/// naming new ones after this many rounds is not a parameter problem.
pub const MAX_REFUSAL_ROUNDS: usize = 3;

static REFUSED: OnceLock<Mutex<HashMap<String, BTreeSet<String>>>> = OnceLock::new();

fn refused() -> &'static Mutex<HashMap<String, BTreeSet<String>>> {
    REFUSED.get_or_init(|| Mutex::new(HashMap::new()))
}

/// Make a chat-completions request body safe to send to any provider behind
/// Bonzai: strip `strict` from every tool definition, and leave out the
/// tuning parameters `model` refused earlier in this process. Returns the
/// remembered parameters that were dropped, for the log.
pub fn make_portable(
    object: &mut serde_json::Map<String, serde_json::Value>,
    model: &str,
) -> Vec<String> {
    strip_strict_tools(object);
    let remembered = refused()
        .lock()
        .ok()
        .and_then(|map| map.get(model).cloned())
        .unwrap_or_default();
    remembered
        .into_iter()
        .filter(|parameter| object.remove(parameter).is_some())
        .collect()
}

/// OpenAI's `strict` tool mode demands a schema shape (every property
/// required, a closed keyword set) that upstream's tool definitions and any
/// connector's MCP tools do not promise, and OpenAI rejects the whole request
/// when one tool falls short. No other provider reads the flag, and the agent
/// runtime validates tool arguments itself, so nothing is lost by removing it.
fn strip_strict_tools(object: &mut serde_json::Map<String, serde_json::Value>) {
    let Some(tools) = object
        .get_mut("tools")
        .and_then(serde_json::Value::as_array_mut)
    else {
        return;
    };
    for tool in tools
        .iter_mut()
        .filter_map(serde_json::Value::as_object_mut)
    {
        tool.remove("strict");
        if let Some(function) = tool
            .get_mut("function")
            .and_then(serde_json::Value::as_object_mut)
        {
            function.remove("strict");
        }
    }
}

/// The tuning parameters a refusal names that the request actually carries,
/// in the order of [`TUNING_PARAMETERS`]. Empty when the refusal is about
/// something else. `refusal` is the gateway's response body as text; the
/// parameter names are matched as whole tokens, so `max_tokens` does not
/// match `max_completion_tokens` and `n` does not match every word with an
/// `n` in it.
pub fn refused_parameters(
    refusal: &str,
    object: &serde_json::Map<String, serde_json::Value>,
) -> Vec<String> {
    TUNING_PARAMETERS
        .iter()
        .filter(|parameter| object.contains_key(**parameter))
        .filter(|parameter| mentions_token(refusal, parameter))
        .map(|parameter| parameter.to_string())
        .collect()
}

/// Remember that `model` refused `parameters`, so the next request for it
/// leaves them out up front instead of paying a round trip to learn it again.
pub fn remember_refused(model: &str, parameters: &[String]) {
    if parameters.is_empty() {
        return;
    }
    if let Ok(mut map) = refused().lock() {
        map.entry(model.to_string())
            .or_default()
            .extend(parameters.iter().cloned());
    }
}

/// Whether `text` contains `token` as a whole word: the characters on either
/// side, when present, are not identifier characters.
fn mentions_token(text: &str, token: &str) -> bool {
    let bytes = text.as_bytes();
    let mut start = 0;
    while let Some(relative) = text[start..].find(token) {
        let begin = start + relative;
        let end = begin + token.len();
        let before_ok = begin == 0 || !is_identifier_byte(bytes[begin - 1]);
        let after_ok = end == bytes.len() || !is_identifier_byte(bytes[end]);
        if before_ok && after_ok {
            return true;
        }
        start = begin + 1;
    }
    false
}

fn is_identifier_byte(byte: u8) -> bool {
    byte.is_ascii_alphanumeric() || byte == b'_'
}

#[cfg(test)]
mod tests {
    use super::*;

    fn request(json: &str) -> serde_json::Map<String, serde_json::Value> {
        serde_json::from_str::<serde_json::Value>(json)
            .unwrap()
            .as_object()
            .cloned()
            .unwrap()
    }

    #[test]
    fn litellms_unsupported_params_refusal_names_the_parameter() {
        let body = request(
            r#"{"model":"gpt-4o","messages":[],"reasoning_effort":"medium","stream":true}"#,
        );
        let refusal = r#"{"error":{"message":"litellm.UnsupportedParamsError: openai does not support parameters: {'reasoning_effort': 'medium'}, for model=gpt-4o. To drop these, set `litellm.drop_params=True` or for proxy:\n\n`litellm_settings:\n drop_params: true`\n","type":"None","param":"None","code":"400"}}"#;
        assert_eq!(refused_parameters(refusal, &body), vec!["reasoning_effort"]);
    }

    #[test]
    fn openais_own_unsupported_parameter_refusal_names_the_parameter() {
        let body = request(r#"{"model":"gpt-4.1","messages":[],"reasoning_effort":"medium"}"#);
        let refusal = r#"{"error":{"message":"Unsupported parameter: 'reasoning_effort' is not supported with this model.","type":"invalid_request_error","param":"reasoning_effort","code":"unsupported_parameter"}}"#;
        assert_eq!(refused_parameters(refusal, &body), vec!["reasoning_effort"]);
    }

    #[test]
    fn a_refusal_naming_several_parameters_drops_each_one_the_request_carries() {
        let body = request(
            r#"{"model":"m","messages":[],"reasoning_effort":"high","temperature":0.2,"stream_options":{"include_usage":true}}"#,
        );
        let refusal = "mistral does not support parameters: ['reasoning_effort', 'temperature', 'top_p'], for model=m";
        assert_eq!(
            refused_parameters(refusal, &body),
            vec!["reasoning_effort", "temperature"]
        );
    }

    #[test]
    fn a_refusal_about_something_else_drops_nothing() {
        let body =
            request(r#"{"model":"m","messages":[],"reasoning_effort":"medium","max_tokens":8192}"#);
        assert!(refused_parameters(
            "This model's maximum context length is 128000 tokens. However, your messages resulted in 131000 tokens.",
            &body
        )
        .is_empty());
        assert!(refused_parameters("Invalid model name passed in model=m", &body).is_empty());
        assert!(refused_parameters("", &body).is_empty());
    }

    #[test]
    fn parameter_names_match_as_whole_tokens_only() {
        let body = request(r#"{"model":"m","messages":[],"max_tokens":8192,"n":1}"#);
        // `max_completion_tokens` and `prompt_tokens` are not `max_tokens`;
        // "not" and "token" are not `n`.
        assert!(refused_parameters(
            "Use max_completion_tokens instead; prompt_tokens is not a token count",
            &body
        )
        .is_empty());
        assert_eq!(
            refused_parameters("'max_tokens' is too large for this model", &body),
            vec!["max_tokens"]
        );
        assert_eq!(
            refused_parameters("parameter n is unsupported", &body),
            vec!["n"]
        );
    }

    #[test]
    fn make_portable_strips_strict_from_every_tool_shape() {
        let mut body = request(
            r#"{"model":"m","messages":[],"tools":[
                {"type":"function","function":{"name":"a","parameters":{},"strict":true}},
                {"type":"function","strict":true,"function":{"name":"b","parameters":{}}},
                {"type":"function","function":{"name":"c","parameters":{}}}
            ]}"#,
        );
        assert!(make_portable(&mut body, "compat-test-strict").is_empty());
        let tools = body["tools"].as_array().unwrap();
        assert!(tools.iter().all(|tool| tool.get("strict").is_none()));
        assert!(tools
            .iter()
            .all(|tool| tool["function"].get("strict").is_none()));
        assert_eq!(tools[0]["function"]["name"], "a");
        assert!(tools[0]["function"].get("parameters").is_some());
    }

    #[test]
    fn make_portable_tolerates_requests_without_tools() {
        let mut body = request(r#"{"model":"m","messages":[]}"#);
        assert!(make_portable(&mut body, "compat-test-no-tools").is_empty());
        assert_eq!(body.len(), 2);
    }

    #[test]
    fn a_remembered_refusal_is_left_out_of_the_next_request_for_that_model_only() {
        let model = "compat-test-memory";
        remember_refused(model, &["reasoning_effort".to_string()]);
        remember_refused(model, &[]);

        let mut body =
            request(r#"{"model":"m","messages":[],"reasoning_effort":"medium","stream":true}"#);
        assert_eq!(make_portable(&mut body, model), vec!["reasoning_effort"]);
        assert!(body.get("reasoning_effort").is_none());
        assert_eq!(body["stream"], true);

        let mut other = request(r#"{"model":"m","messages":[],"reasoning_effort":"medium"}"#);
        assert!(make_portable(&mut other, "compat-test-memory-other").is_empty());
        assert_eq!(other["reasoning_effort"], "medium");

        // Already absent: nothing to report.
        let mut bare = request(r#"{"model":"m","messages":[]}"#);
        assert!(make_portable(&mut bare, model).is_empty());
    }

    #[test]
    fn only_tuning_parameters_are_ever_droppable() {
        for load_bearing in [
            "model",
            "messages",
            "tools",
            "tool_choice",
            "stream",
            "response_format",
        ] {
            assert!(
                !TUNING_PARAMETERS.contains(&load_bearing),
                "{load_bearing} must never be dropped"
            );
        }
        let body = request(r#"{"model":"m","messages":[],"tools":[]}"#);
        assert!(refused_parameters(
            "openai does not support parameters: ['tools', 'messages', 'model']",
            &body
        )
        .is_empty());
    }
}
