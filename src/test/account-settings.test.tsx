import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ useBonzaiActive: vi.fn(() => false) }));

vi.mock("../lib/bonzai", () => ({ useBonzaiActive: mocks.useBonzaiActive }));
import { AccountSettings } from "../components/account/AccountSettings";
import type { AccountStatus } from "../lib/tauri";

const localAccount: AccountStatus = {
  signedIn: true,
  configured: true,
  localDev: true,
  user: { id: "usr_local_dev", handle: "local-dev", displayName: "Local developer" },
  balance: { credits: 0, usdMillis: 0 },
  subscription: { subscribed: false },
};

afterEach(() => vi.clearAllMocks());

describe("AccountSettings local mode", () => {
  it("names Bonzai Agent and the local Clovy API separately", () => {
    mocks.useBonzaiActive.mockReturnValue(false);
    render(
      <AccountSettings
        account={localAccount}
        loading={false}
        onAccountChanged={() => {}}
        onRefresh={async () => localAccount}
      />,
    );

    expect(
      screen.getByText(
        "Local mode is active. Bonzai Agent uses your local Clovy API without OpenSoftware sign-in or billing.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Requests use your local Clovy API. No OpenSoftware account is used."),
    ).toBeInTheDocument();
  });

  it("does not describe Bonzai no-account inference as using a local service", () => {
    mocks.useBonzaiActive.mockReturnValue(true);
    render(
      <AccountSettings
        account={localAccount}
        loading={false}
        onAccountChanged={() => {}}
        onRefresh={async () => localAccount}
      />,
    );

    expect(
      screen.getByText(
        "Local mode is active. Bonzai Agent uses Bonzai for inference without OpenSoftware sign-in or billing.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Requests use Bonzai for inference. No OpenSoftware account is used."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/your local Clovy API/i)).toBeNull();
  });
});
