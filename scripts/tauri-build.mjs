#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const platformBundles = {
  darwin: ["app", "dmg"],
  win32: ["nsis"],
};

const platformConfigs = {
  darwin: "src-tauri/tauri.macos.conf.json",
  win32: "src-tauri/tauri.windows.conf.json",
};

const BRAND_FLAG_PREFIX = "--brand=";
const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const rawUserArgs = process.argv.slice(2);
const preStripArgs = rawUserArgs[0] === "--" ? rawUserArgs.slice(1) : rawUserArgs;
let brandId = process.env.BRAND;
const userArgs = [];
for (const arg of preStripArgs) {
  if (arg.startsWith(BRAND_FLAG_PREFIX)) {
    brandId = arg.slice(BRAND_FLAG_PREFIX.length);
  } else {
    userArgs.push(arg);
  }
}
const target = optionValue(userArgs, "--target");
const buildPlatform = platformForTarget(target) ?? process.platform;
if (buildPlatform === "darwin") {
  const prepareArgs = [
    resolve(dirname(fileURLToPath(import.meta.url)), "prepare-cua-driver.mjs"),
    "--release",
  ];
  if (target) prepareArgs.push("--target", target);
  const prepare = spawnSync(process.execPath, prepareArgs, {
    stdio: "inherit",
  });
  if (prepare.status !== 0) process.exit(prepare.status ?? 1);
}
const bundles = platformBundles[buildPlatform];
const config = platformConfigs[buildPlatform];
const hasBundleOverride = userArgs.some(
  (arg) => arg === "--bundles" || arg.startsWith("--bundles="),
);
const hasConfigOverride = userArgs.some((arg) => arg === "--config" || arg.startsWith("--config="));
const args = ["build"];
if (config && !hasConfigOverride) {
  args.push("--config", config);
}
if (bundles && !hasBundleOverride) {
  args.push("--bundles", bundles.join(","));
}
// Whitelabel override (docs/whitelabel-implementation-plan.md, ADR-0054): an
// additive branding/<brand-id>/tauri.override.json merges on top of the
// platform config via Tauri's native --config merge. Unset BRAND (the
// default) means this block is a no-op and `pnpm tauri:build` behaves exactly
// as it does today.
if (brandId) {
  const brandConfigPath = resolve(ROOT_DIR, "branding", brandId, "tauri.override.json");
  if (!existsSync(brandConfigPath)) {
    console.error(
      `BRAND=${brandId} was requested but ${brandConfigPath} does not exist. See branding/README.md.`,
    );
    process.exit(1);
  }
  console.error(`Using whitelabel brand "${brandId}" (${brandConfigPath}).`);
  args.push("--config", brandConfigPath);
}
args.push(...userArgs);
// Trailing args after `--` go to the cargo runner. `--locked` keeps release
// builds from re-resolving dependencies past Cargo.lock, so a stale lockfile
// fails the build instead of silently pulling crates that never saw the
// release-age cooldown (spec/package-install-security.md).
if (!userArgs.includes("--")) {
  args.push("--");
}
args.push("--locked");

const tauri = tauriInvocation();
const child = spawn(tauri.command, [...tauri.args, ...args], {
  // Propagate --brand=<id> to the beforeBuildCommand chain (pnpm run build's
  // prebuild hook runs scripts/select-brand.mjs, which only reads BRAND from
  // the environment — it has no CLI flag of its own). Without this, a
  // `--brand=<id>` flag applied the Tauri config override correctly but
  // silently left the frontend's brand.generated.ts on June defaults.
  env: { ...process.env, ...(brandId ? { BRAND: brandId } : {}) },
  shell: false,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  process.exit(code ?? (signal ? 1 : 0));
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});

function optionValue(args, option) {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === option) {
      return args[index + 1];
    }
    if (arg.startsWith(`${option}=`)) {
      return arg.slice(option.length + 1);
    }
  }
  return undefined;
}

function platformForTarget(targetTriple) {
  if (!targetTriple) {
    return undefined;
  }
  if (targetTriple.includes("windows")) {
    return "win32";
  }
  if (targetTriple.includes("apple-darwin")) {
    return "darwin";
  }
  return undefined;
}

function tauriInvocation() {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  if (process.platform === "win32") {
    const localScript = resolve(scriptDir, "..", "node_modules", "@tauri-apps", "cli", "tauri.js");
    if (!existsSync(localScript)) {
      throw new Error(
        `Tauri CLI entry point not found at "${localScript}". Run pnpm install first.`,
      );
    }
    return { command: process.execPath, args: [localScript] };
  }

  const localBinary = resolve(scriptDir, "..", "node_modules", ".bin", "tauri");
  return { command: existsSync(localBinary) ? localBinary : "tauri", args: [] };
}
