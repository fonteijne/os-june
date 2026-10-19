import { readFileSync } from "node:fs";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { StyleguideApp } from "../styleguide/StyleguideApp";

beforeEach(() => {
  localStorage.removeItem("os-clovy:theme");
  localStorage.removeItem("os-june:theme");
  document.documentElement.removeAttribute("data-theme");
});

describe("Bonzai Agent styleguide appearance controls", () => {
  it("shows theme selection without a color preset picker", () => {
    render(<StyleguideApp />);

    expect(screen.getByText("Bonzai Agent")).toBeInTheDocument();
    expect(screen.getByText("Style guide")).toBeInTheDocument();
    const theme = screen.getByRole("group", { name: "Theme" });
    expect(within(theme).getByRole("button", { name: "System" })).toBeInTheDocument();
    expect(within(theme).getByRole("button", { name: "Light" })).toBeInTheDocument();
    expect(within(theme).getByRole("button", { name: "Dark" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Brand" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /sage|clay|rose|ocean|plum/i }),
    ).not.toBeInTheDocument();
  });

  it("changes the fixed palette between light and dark themes", () => {
    render(<StyleguideApp />);
    const theme = screen.getByRole("group", { name: "Theme" });
    const dark = within(theme).getByRole("button", { name: "Dark" });

    fireEvent.click(dark);

    expect(dark).toHaveAttribute("aria-pressed", "true");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    const darkTokens = readFileSync("src/styles/tokens.css", "utf8");
    expect(darkTokens).toContain("--brand: #8aa4f2;");
    expect(document.documentElement.style.getPropertyValue("--brand")).toBe("");
  });
});
