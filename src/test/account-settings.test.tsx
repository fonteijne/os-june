import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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

describe("AccountSettings local mode", () => {
  it("names Bonzai Agent and the local Clovy API separately", () => {
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
});
