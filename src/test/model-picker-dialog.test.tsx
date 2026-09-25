import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { VIDEO_MODELS } from "../lib/video-models";
import {
  ModelPickerDialog,
  modelOptions,
  selectedModel,
} from "../components/settings/ModelPickerDialog";

describe("ModelPickerDialog", () => {
  it("presents the automatic router as Auto while preserving its model id", () => {
    const catalogModel = {
      provider: "open-software",
      id: "open-software/auto",
      name: "OpenSoftware Auto",
      modelType: "text",
      traits: [],
      capabilities: [],
    };

    expect(modelOptions([catalogModel], catalogModel.id)[0]).toMatchObject({
      id: "open-software/auto",
      name: "Auto",
    });
    expect(selectedModel([], catalogModel.id)).toMatchObject({
      id: "open-software/auto",
      name: "Auto",
    });
  });

  it("shows curated video descriptions", () => {
    render(
      <ModelPickerDialog
        open
        mode="video"
        value="wan-2.2-a14b-text-to-video"
        options={VIDEO_MODELS}
        search=""
        onSearchChange={vi.fn()}
        onClose={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByRole("dialog", { name: "Video model" })).toBeInTheDocument();
    expect(
      screen.getByText("Default text-to-video model for fast 5 second 720p clips."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Model details unavailable")).not.toBeInTheDocument();
  });

  it("shows the tools caveat for a local text model only, never for local transcription", () => {
    const localOption = (mode: "generation" | "transcription") => ({
      provider: "local",
      id: `__june_local_${mode}__:Systran%2Ffaster-whisper-small`,
      name: "Local: Systran/faster-whisper-small",
      modelType: mode === "generation" ? "text" : "asr",
      privacy: "local",
      traits: ["local"],
      capabilities: [],
    });
    const props = {
      open: true,
      search: "",
      onSearchChange: vi.fn(),
      onClose: vi.fn(),
      onSelect: vi.fn(),
    };

    const { unmount } = render(
      <ModelPickerDialog
        {...props}
        mode="transcription"
        value={localOption("transcription").id}
        options={[localOption("transcription")]}
      />,
    );
    expect(screen.getByText("Local: Systran/faster-whisper-small")).toBeInTheDocument();
    expect(screen.queryByText("Tools not verified")).not.toBeInTheDocument();
    unmount();

    render(
      <ModelPickerDialog
        {...props}
        mode="generation"
        value={localOption("generation").id}
        options={[localOption("generation")]}
      />,
    );
    expect(screen.getByText("Tools not verified")).toBeInTheDocument();
  });
});
