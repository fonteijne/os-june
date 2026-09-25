---
name: bonzai-coworker-dmg
description: Build and hand off a private, manually installed Bonzai macOS DMG for coworkers without the official updater key or Apple Developer account. Use when a local ad hoc DMG is requested; do not use for official RC/stable releases, public distribution, or side-by-side installation with the official app.
---

# Bonzai coworker DMG

Build a private, manually installed macOS artifact from this working tree. This
skill is not the official Clovy release process. It does not publish a release,
create updater artifacts for distribution, notarize an app, or make the current
production identity safe for side-by-side installation.

## Stop boundary

This skill may build and validate a local DMG and provide handoff instructions.
It must not:

- publish to a release repository, GitHub Release, package manager, or app store;
- create, rotate, or request the official Tauri updater private key;
- ask for, print, embed, or persist a Bonzai virtual key;
- alter the official release workflow, updater key, production identity, or
  release configuration as a workaround;
- install the app into `/Applications`, launch it, enter credentials, record
  audio, make live inference requests, or modify another person's Mac without
  explicit confirmation;
- claim that an ad hoc build is Apple-signed, notarized, Gatekeeper-ready, or
  updater-compatible.

The coworker enters their own Bonzai virtual key in the app. The DMG contains no
Bonzai key.

## Artifact contract

The output is an ad hoc, unnotarized, manually installed DMG. The current app
keeps the official compatibility identity (`co.opensoftware.june`, `June.app`,
`os-june`) and the official updater configuration. It is therefore **not safe to
install beside an existing official Clovy/Bonzai installation**. A separate
installable development identity is a different implementation task.

The current Tauri config also enables updater artifact generation. Without the
official `TAURI_SIGNING_PRIVATE_KEY`, `pnpm tauri:build` may successfully build
the app and DMG and then exit non-zero while creating the updater archive. That
missing-key failure is acceptable only after verifying that the app bundle was
actually produced; it does not mean the resulting app has a disabled updater.
Never present this private DMG as an official release.

## Preflight

Run all commands from the repository root. Before a build:

1. Confirm macOS and the architecture target:

   ```fish
   test (uname) = Darwin; or begin; echo "macOS is required" >&2; return 1; end
   uname -m
   ```

   Use `universal-apple-darwin` when the coworker's architecture is unknown and
   the required Rust targets are installed. Use the native target only when you
   know the coworker uses that architecture.

2. Confirm Node 24 and pnpm:

   ```fish
   node --version
   pnpm exec node --version
   pnpm --version
   pnpm exec node -p 'process.execPath'
   ```

   Both Node version commands must report `v24.x`. If they do not, stop and
   switch the shell to Node 24 before building. Do not use Node 22 or 26 for
   this release flow.

3. Snapshot the tree without changing it:

   ```fish
   git status --short
   git diff --stat
   ```

   Never clean, reset, stash, or overwrite unrelated user changes. Build output
   under `src-tauri/target` is not a source deliverable.

4. Require a Bonzai URL. Use the URL supplied by the user; do not invent a
   host, and do not print secret-bearing environment values:

   ```fish
   test -n "$BONZAI_BASE_URL"; or begin; echo "BONZAI_BASE_URL is required" >&2; return 1; end
   string match -rq '^https://[^/]+/?$' -- "$BONZAI_BASE_URL"; or begin; echo "BONZAI_BASE_URL must be an HTTPS origin" >&2; return 1; end
   ```

   The current fork's known new host is `connect.iobonzai.com`. Verify that the
   hostname is present in the compiled allowlist in
   `src-tauri/src/bonzai/egress.rs`. If it is absent, stop and ask for the
   allowlist change and a rebuild. Never bypass the egress guard.

5. Confirm the user understands the identity warning: the artifact uses the
   production app identity and must not be installed alongside an existing
   official installation.

6. Confirm whether the user wants a native or universal artifact. The default
   recommendation is universal for a coworker of unknown Mac architecture.

## Build

The repository's normal local packaging entry point is:

```fish
pnpm tauri:build --target universal-apple-darwin
```

For a known Apple Silicon-only recipient, the native fallback is:

```fish
pnpm tauri:build --target aarch64-apple-darwin
```

Set the Bonzai URL before running the command so Cargo's `option_env!("BONZAI_BASE_URL")`
can bake it into the release binary:

```fish
set -x BONZAI_BASE_URL https://connect.iobonzai.com
pnpm tauri:build --target universal-apple-darwin
```

`BONZAI_DEFAULT_MODEL` is optional. Never set a Bonzai key in the environment.
The key belongs to the coworker and is entered through the app's existing
write-only Bonzai key UI.

The build may end with:

```text
A public key has been found, but no private key
TAURI_SIGNING_PRIVATE_KEY
```

If that happens, treat it as an expected updater-artifact limitation only if:

- the application bundle exists;
- the app bundle contains its expected resources; and
- no earlier compilation, bundling, or packaging error occurred.

Do not continue after any other error. Do not claim that the updater is disabled:
the current source still registers the updater and exposes update commands.

Locate the app after the build:

```fish
set APPS (find src-tauri/target -path '*/release/bundle/macos/*.app' -type d -print)
printf '%s\n' $APPS
```

Select exactly one intended app. For a universal build, prefer the path under
`src-tauri/target/universal-apple-darwin/release/bundle/macos/`; otherwise use
the native release path.

## Validate and repair the private app bundle

Before creating a DMG, inspect the identity:

```fish
set APP "/absolute/path/to/June.app"
/usr/libexec/PlistBuddy -c 'Print:CFBundleIdentifier' "$APP/Contents/Info.plist"
/usr/libexec/PlistBuddy -c 'Print:CFBundleExecutable' "$APP/Contents/Info.plist"
lipo -archs "$APP/Contents/MacOS/os-june"
```

Validate the app and its nested helper bundles:

```fish
codesign --verify --deep --strict --verbose=4 "$APP"
```

For a private ad hoc artifact, it is acceptable to repair an incomplete outer
signature after the complete bundle has been assembled:

```fish
codesign --force --deep --verbose --sign - "$APP"
codesign --verify --deep --strict --verbose=4 "$APP"
```

If verification still fails, stop. Do not distribute the bundle. Do not use
`sudo spctl --master-disable`; it disables Gatekeeper system-wide and is not a
fix. An ad hoc signature has no Team ID and is not Apple notarization.

## Create the DMG manually

The generated Tauri `bundle_dmg.sh` can fail on macOS with `hdiutil: create
failed - Resource busy`, especially after a previous image or Finder mount. Use
a temporary sparse HFS+ image instead. The following Bash procedure is
idempotent around its temporary workspace and creates a compressed UDZO DMG:

```bash
set -euo pipefail

APP="/absolute/path/to/June.app"
OUT="/absolute/path/to/Clovy-Bonzai-private.dmg"
WORK="$(mktemp -d -t clovy-coworker-dmg)"
DEV=""
MOUNT=""
cleanup() {
  if [[ -n "$DEV" ]]; then
    hdiutil detach "$DEV" >/dev/null 2>&1 || hdiutil detach -force "$DEV" >/dev/null 2>&1 || true
  fi
  rm -rf "$WORK"
}
trap cleanup EXIT INT TERM

hdiutil create -size 320m -fs HFS+ -volname Clovy -type SPARSE -ov "$WORK/Clovy.sparseimage" >/dev/null
ATTACH="$(hdiutil attach -nobrowse -noautoopen -readwrite "$WORK/Clovy.sparseimage")"
DEV="$(printf '%s\n' "$ATTACH" | awk '/^\/dev\// { print $1; exit }')"
MOUNT="$(printf '%s\n' "$ATTACH" | awk '/\/Volumes\// { print $3; exit }')"
[[ -n "$DEV" && -n "$MOUNT" ]]

ditto --norsrc "$APP" "$MOUNT/June.app"
ln -s /Applications "$MOUNT/Applications"
hdiutil detach "$DEV" >/dev/null || hdiutil detach -force "$DEV" >/dev/null
DEV=""
hdiutil convert "$WORK/Clovy.sparseimage" -format UDZO -o "$WORK/Clovy-Bonzai-private.dmg" >/dev/null
cp "$WORK/Clovy-Bonzai-private.dmg" "$OUT"
shasum -a 256 "$OUT"
```

If a stale image remains mounted before starting, inspect it:

```fish
hdiutil info | grep -E 'image-path|/dev/disk|mount-point'
```

Eject only the stale `June`/`Clovy` image that belongs to this build attempt;
do not eject unrelated user disks. If normal detach reports `Resource busy`,
close Finder windows for the volume and retry; force-detach only the identified
stale build image.

Verify the finished DMG:

```fish
set DMG "/absolute/path/to/Clovy-Bonzai-private.dmg"
set ATTACH (hdiutil attach -nobrowse -noautoopen "$DMG")
set DEV (printf '%s\n' $ATTACH | string match -r '^/dev/[^ ]+' | head -1)
set MOUNT (printf '%s\n' $ATTACH | string match -r '/Volumes/[^ ]+' | head -1)
test -d "$MOUNT/June.app"; or begin; hdiutil detach "$DEV"; return 1; end
test -L "$MOUNT/Applications"; or begin; hdiutil detach "$DEV"; return 1; end
hdiutil detach "$DEV"
shasum -a 256 "$DMG"
```

Do not use a manually copied or renamed app bundle as a substitute for this
verification. Preserve `June.app` and `os-june` compatibility names.

## Handoff

Give the coworker:

- the DMG file;
- its SHA-256 checksum;
- whether it is native arm64 or universal;
- the exact commit or build version;
- a clear statement that it is an ad hoc, unnotarized private build.

Coworker installation:

1. Open the DMG and drag `June.app` to `/Applications`.
2. Eject the DMG.
3. Control-click the app in Finder and choose **Open**. If macOS offers
   **Open Anyway** under System Settings -> Privacy & Security, use that for
   this trusted artifact.
4. Only if the trusted app remains blocked by download quarantine, remove the
   quarantine attribute from the installed app:

   ```sh
   xattr -dr com.apple.quarantine "/Applications/June.app"
   open "/Applications/June.app"
   ```

   This does not make the app notarized and does not repair an invalid code
   signature.
5. Grant the app its own microphone permission when macOS asks.
6. Enter the coworker's own Bonzai virtual key in Clovy. Never send a key with
   the DMG.

The recipient must have a compatible Mac. Native arm64 artifacts require Apple
Silicon. Universal artifacts support both Apple Silicon and Intel when the
build completed with both slices.

## Diagnose failures

### Node version

If the build says Node 24 is required:

```fish
node --version
pnpm exec node --version
```

Both must be `v24.x`. With `fnm` in Fish:

```fish
fnm install 24
fnm default 24
fnm use 24
```

If `node --version` still resolves to a Hermes-managed Node 22, load the Fish
integration and put it after path setup:

```fish
fnm env --use-on-cd --shell fish | source
```

### Bonzai egress

If startup logs show:

```text
Bonzai base URL rejected at startup [egress_blocked]
```

check that the configured hostname is present in the compiled
`src-tauri/src/bonzai/egress.rs` allowlist, then rebuild. Never bypass the
allowlist or derive it from runtime input.

### Code signing or Gatekeeper

`codesign --verify --deep --strict` failures are bundle failures. Quarantine
removal cannot repair them. Re-sign the complete private bundle ad hoc once,
verify again, and stop if it remains invalid.

### DMG packaging

For `bundle_dmg.sh` or `hdiutil Resource busy` failures, close Finder windows
for stale build volumes, inspect `hdiutil info`, eject only the matching stale
image, and use the manual sparse-image procedure above. Do not report success
until the final DMG mounts and contains both `June.app` and the Applications
symlink.

### Startup panic

Run the installed binary directly to capture the first project panic:

```sh
env RUST_BACKTRACE=full /Applications/June.app/Contents/MacOS/os-june 2>&1 | tee ~/Desktop/clovy-startup.log
```

The first line containing `panicked at` and the message immediately below it
usually identify the configuration or compiled-allowlist problem. Do not treat
the later `panic in a function that cannot unwind` wrapper as the root cause.

## Release boundary

This skill creates a private manual artifact only. The official RC -> stable
process in `docs/release-macos.md` and `.github/workflows/rc-desktop-dmg.yml` /
`.github/workflows/promote-desktop.yml` remains unchanged. This skill does not
create a second release channel, publish an updater manifest, or make the
current production identity safe for side-by-side installation.
