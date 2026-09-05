//! The source-level half of the egress boundary (ADR-0059).
//!
//! A runtime check guards only the call sites it was written into. The threat
//! this fork exists to close is an upstream merge introducing a *new* provider
//! call, which arrives with its own client and its own call site and sails
//! past every check placed by hand. So this test reads the source instead: no
//! raw `reqwest` client may be constructed outside `src/bonzai/egress.rs`.
//!
//! When it fails, the fix is to route the new site through
//! `crate::bonzai::egress::guarded_builder()` or `guarded_client()` and decide
//! what that client is for. It is never to add an exemption. The friction is
//! the feature.
//!
//! One wrinkle: the crate's standalone binaries (`src/bin/`,
//! `src/computer_use_driver.rs`) are their own crate roots, so a client added
//! there reaches the constructors as `clovy_lib::bonzai::egress::...` rather
//! than through `crate::`. The guard covers them either way.

use std::path::{Path, PathBuf};

/// The single exemption: the guarded constructors have to be built somewhere.
const EXEMPT: &[&str] = &["src/bonzai/egress.rs"];

/// Directories scanned, relative to the crate root.
const ROOTS: &[&str] = &["src", "tests"];

fn crate_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
}

/// Every way this crate could name a `reqwest` client into existence.
///
/// `Client::default()` and `ClientBuilder::new()` are equivalents of the two
/// obvious forms, so a guard that watched only `Client::{new,builder}()` would
/// have a hole in it wide enough for an idiomatic upstream commit.
///
/// It does not catch a client reached through an alias or a function pointer.
/// That is a deliberate limit: the threat is an upstream merge writing
/// idiomatic `reqwest`, not someone in this repo evading a check they could
/// simply delete. Assembling the needles at runtime keeps this file inside the
/// guard rather than carving an exemption for it.
fn needles() -> Vec<String> {
    let mut needles = Vec::new();
    for method in ["new", "builder", "default"] {
        needles.push(format!("Client::{method}("));
    }
    for method in ["new", "default"] {
        needles.push(format!("ClientBuilder::{method}("));
    }
    needles
}

fn rust_sources(dir: &Path, found: &mut Vec<PathBuf>) {
    let Ok(entries) = std::fs::read_dir(dir) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            rust_sources(&path, found);
        } else if path.extension().is_some_and(|ext| ext == "rs") {
            found.push(path);
        }
    }
}

fn scanned_files() -> Vec<PathBuf> {
    let root = crate_root();
    let mut found = Vec::new();
    for dir in ROOTS {
        rust_sources(&root.join(dir), &mut found);
    }
    found.sort();
    found
}

fn relative(path: &Path) -> String {
    path.strip_prefix(crate_root())
        .unwrap_or(path)
        .to_string_lossy()
        .replace('\\', "/")
}

/// True when `Client::new(` / `Client::builder(` appears as its own path
/// segment. Without the boundary check `McpHttpClient::new(` would match, and
/// a guard that cries wolf gets weakened rather than obeyed.
fn constructs_a_client(line: &str) -> bool {
    if line.trim_start().starts_with("//") {
        return false;
    }
    needles().iter().any(|needle| {
        line.match_indices(needle.as_str()).any(|(index, _)| {
            index == 0
                || !line[..index]
                    .chars()
                    .next_back()
                    .is_some_and(|char| char.is_alphanumeric() || char == '_')
        })
    })
}

#[test]
fn no_raw_reqwest_client_is_constructed_outside_the_egress_module() {
    let mut offenders = Vec::new();
    for path in scanned_files() {
        let relative = relative(&path);
        if EXEMPT.contains(&relative.as_str()) {
            continue;
        }
        let Ok(source) = std::fs::read_to_string(&path) else {
            continue;
        };
        for (index, line) in source.lines().enumerate() {
            if constructs_a_client(line) {
                offenders.push(format!("{relative}:{}: {}", index + 1, line.trim()));
            }
        }
    }
    assert!(
        offenders.is_empty(),
        "A reqwest client is constructed outside src/bonzai/egress.rs. Route it through \
         crate::bonzai::egress::guarded_builder() or guarded_client() (ADR-0059); do not \
         exempt the file.\n{}",
        offenders.join("\n")
    );
}

#[test]
fn the_guard_actually_reads_the_crate() {
    // A walker that silently finds nothing would make the test above pass for
    // the wrong reason, which is the failure mode that matters most here.
    let files = scanned_files();
    assert!(
        files.len() > 50,
        "expected the whole crate to be scanned, found {} files",
        files.len()
    );
    for expected in ["src/lib.rs", "src/clovy_api.rs", "src/agent_mcp.rs"] {
        assert!(
            files.iter().any(|path| relative(path) == expected),
            "{expected} was not scanned"
        );
    }
}

#[test]
fn the_guard_recognises_what_it_is_looking_for() {
    for method in ["new", "builder", "default"] {
        assert!(constructs_a_client(&format!(
            "    let client = reqwest::Client::{method}();"
        )));
        assert!(constructs_a_client(&format!("Client::{method}()")));
    }
    for method in ["new", "default"] {
        assert!(constructs_a_client(&format!(
            "    let client = reqwest::ClientBuilder::{method}().build();"
        )));
    }
    // Not a reqwest client, and not a claim about one. Both needles are
    // assembled rather than written out, so this file stays inside the guard.
    assert!(!constructs_a_client(&format!(
        "    let client = McpHttpClient::{}();",
        "new"
    )));
    assert!(!constructs_a_client(&format!(
        "// reqwest::Client::{}() is banned here",
        "new"
    )));
}

#[test]
fn the_only_exemption_still_exists() {
    // A rename that moved the guarded constructors would otherwise leave a
    // dead exemption behind, and the next client to land in that path would
    // be waved through.
    for exempt in EXEMPT {
        assert!(
            crate_root().join(exempt).is_file(),
            "{exempt} is exempted but does not exist"
        );
    }
}
