import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  dictationSettings: vi.fn(),
  dictationHotkeyStatus: vi.fn(),
  providerModelSettings: vi.fn(),
  bonzaiStatus: vi.fn(),
  useBonzaiActive: vi.fn(),
  useDictationCapabilities: vi.fn(),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async () => () => {}),
}));

vi.mock("../lib/tauri", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/tauri")>();
  return {
    ...actual,
    dictationSettings: mocks.dictationSettings,
    dictationHotkeyStatus: mocks.dictationHotkeyStatus,
    providerModelSettings: mocks.providerModelSettings,
  };
});

vi.mock("../lib/bonzai", () => ({
  bonzaiStatus: mocks.bonzaiStatus,
  useBonzaiActive: mocks.useBonzaiActive,
}));

vi.mock("../lib/platform", () => ({
  fallbackDictationCapabilities: () => ({
    platform: "other",
    shortcuts: false,
    systemAudio: false,
  }),
  isSystemAudioSupportedPlatform: () => false,
  useDictationCapabilities: mocks.useDictationCapabilities,
}));

import { AppSettings, type SettingsTab } from "../components/settings/AppSettings";
import type { AccountStatus, ProviderModelSettingsDto } from "../lib/tauri";

// AccountStatus minimal valid fixture — matches the type exactly (no legacy fields).
const account: AccountStatus = {
  signedIn: false,
  configured: true,
  localDev: true,
};

// DictationSettingsDto minimal valid fixture — microphone must not be undefined.
const dictationSettingsFixture = {
  microphone: {},
  style: "standard" as const,
  pushToTalkShortcut: {
    code: "KeyD",
    modifiers: { command: false, control: true, option: true, shift: false, function: false },
    label: "Ctrl+Opt+D",
    pressCount: 1 as const,
  },
  toggleShortcut: {
    code: "KeyT",
    modifiers: { command: false, control: true, option: true, shift: false, function: false },
    label: "Ctrl+Opt+T",
    pressCount: 1 as const,
  },
};

const providerSettings: ProviderModelSettingsDto = {
  transcriptionProvider: "venice",
  generationProvider: "venice",
  transcriptionModel: "nvidia/parakeet-tdt-0.6b-v3",
  generationModel: "zai-org-glm-5-2",
  costQuality: 100,
  remoteGenerationModel: "zai-org-glm-5-2",
  imageModel: "",
  videoModel: "",
  veniceApiKeyConfigured: false,
  localGeneration: { baseUrl: "", modelId: "", apiKey: "" },
  localTranscription: { baseUrl: "", modelId: "", apiKey: "" },
  remoteTranscriptionModel: "nvidia/parakeet-tdt-0.6b-v3",
  imageSafeMode: true,
  imageSafeModePromptDismissed: false,
  liveTranscription: true,
};

function setupAppearanceMocks() {
  mocks.useBonzaiActive.mockReturnValue(true);
  mocks.useDictationCapabilities.mockReturnValue({
    platform: "other",
    shortcuts: false,
    systemAudio: false,
  });
  mocks.dictationSettings.mockResolvedValue({ settings: dictationSettingsFixture });
  mocks.dictationHotkeyStatus.mockResolvedValue({ type: "hotkey_trigger_ready" });
  mocks.providerModelSettings.mockResolvedValue({ settings: providerSettings });
  mocks.bonzaiStatus.mockResolvedValue({ active: true, globalKeyConfigured: false });
  mocks.useBonzaiActive.mockReturnValue(true);
}

function renderAppearance() {
  const onTabChange = vi.fn<(tab: SettingsTab) => void>();
  render(
    <AppSettings
      account={account}
      accountLoading={false}
      sourceMode="microphoneOnly"
      checkingSourceReadiness={false}
      onAccountChanged={() => {}}
      onAccountRefresh={async () => undefined}
      onSourceModeChange={() => {}}
      onEnableSystemAudio={() => {}}
      activeTab="appearance"
      onTabChange={onTabChange}
    />,
  );
  return onTabChange;
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("Bonzai Agent Appearance settings", () => {
  it("keeps theme, text-size, and date-format controls without an accent picker", () => {
    setupAppearanceMocks();

    renderAppearance();

    // The appearance section is a <section> with aria-labelledby="appearance-heading".
    // The wrapping tabpanel <div> has aria-labelledby="settings-tab-appearance".
    const panel = screen.getByRole("tabpanel");
    const rows = within(panel).getAllByRole("heading", { level: 3 });
    expect(rows.map((row) => row.textContent)).toEqual(["Theme", "Text size", "Date format"]);
    expect(
      within(panel).queryByRole("combobox", { name: /accent color/i }),
    ).not.toBeInTheDocument();
    expect(within(panel).getByRole("group", { name: "App theme" })).toBeInTheDocument();
    expect(within(panel).getByRole("group", { name: "Text size" })).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: /date format/i })).toBeInTheDocument();
  });

  it("retains system, light, and dark theme selection", () => {
    setupAppearanceMocks();

    renderAppearance();
    const theme = screen.getByRole("group", { name: "App theme" });
    const dark = within(theme).getByRole("button", { name: "Use dark theme" });
    fireEvent.click(dark);

    expect(dark).toHaveAttribute("aria-pressed", "true");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  });

  it("describes the server attested by the About verification action on upstream builds", async () => {
    mocks.useBonzaiActive.mockReturnValue(false);
    setupAppearanceMocks();

    render(
      <AppSettings
        account={account}
        accountLoading={false}
        sourceMode="microphoneOnly"
        checkingSourceReadiness={false}
        onAccountChanged={() => {}}
        onAccountRefresh={async () => undefined}
        onSourceModeChange={() => {}}
        onEnableSystemAudio={() => {}}
        activeTab="about"
        onTabChange={() => {}}
      />,
    );

    await vi.waitFor(() =>
      expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", "settings-tab-about"),
    );
    const panel = screen.getByRole("tabpanel");
    expect(within(panel).getByText(/The Clovy API runs in a confidential VM/)).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Verify Clovy API" })).toBeInTheDocument();
    expect(within(panel).queryByText(/The inference service runs in a confidential VM/)).toBeNull();
  });

  it("does not imply the Clovy API verifies Bonzai inference", async () => {
    setupAppearanceMocks();
    mocks.useBonzaiActive.mockReturnValue(true);

    render(
      <AppSettings
        account={account}
        accountLoading={false}
        sourceMode="microphoneOnly"
        checkingSourceReadiness={false}
        onAccountChanged={() => {}}
        onAccountRefresh={async () => undefined}
        onSourceModeChange={() => {}}
        onEnableSystemAudio={() => {}}
        activeTab="about"
        onTabChange={() => {}}
      />,
    );

    await vi.waitFor(() =>
      expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", "settings-tab-about"),
    );
    const panel = screen.getByRole("tabpanel");
    expect(within(panel).queryByRole("button", { name: "Verify Clovy API" })).toBeNull();
    expect(within(panel).queryByRole("button", { name: "Verify server" })).toBeNull();
    expect(within(panel).queryByText(/The Clovy API runs in a confidential VM/)).toBeNull();
  });
});
