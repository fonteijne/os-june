import { describe, expect, it } from "vitest";
import { isLoopbackUrl } from "../lib/local-endpoint";
import {
  LOCAL_TRANSCRIPTION_OPTION_ID_PREFIX,
  localTranscriptionOptionId,
  rawLocalTranscriptionModelId,
  withLocalTranscriptionOption,
} from "../lib/local-transcription";
import { localGenerationOptionId } from "../lib/local-generation";

const remote = {
  provider: "venice",
  id: "nvidia/parakeet-tdt-0.6b-v3",
  name: "Parakeet",
  modelType: "asr",
  traits: [],
  capabilities: [],
};

describe("local transcription option", () => {
  it("round-trips the model id through a tagged option id", () => {
    const optionId = localTranscriptionOptionId(" Systran/faster-whisper-small ");
    expect(optionId.startsWith(LOCAL_TRANSCRIPTION_OPTION_ID_PREFIX)).toBe(true);
    expect(rawLocalTranscriptionModelId(optionId)).toBe("Systran/faster-whisper-small");
    // The generation and transcription tags never collide.
    expect(rawLocalTranscriptionModelId(localGenerationOptionId("x"))).toBeNull();
    expect(rawLocalTranscriptionModelId("nvidia/parakeet-tdt-0.6b-v3")).toBeNull();
  });

  it("prepends a loopback endpoint as a local asr model", () => {
    const options = withLocalTranscriptionOption([remote], {
      baseUrl: "http://localhost:8000/v1",
      modelId: "Systran/faster-whisper-small",
      apiKey: "",
    });
    expect(options).toHaveLength(2);
    expect(options[0]).toMatchObject({
      provider: "local",
      modelType: "asr",
      privacy: "local",
      name: "Local: Systran/faster-whisper-small",
    });
    expect(options[1]).toBe(remote);
  });

  it("marks a non-loopback endpoint as external", () => {
    const [local] = withLocalTranscriptionOption([], {
      baseUrl: "http://192.168.1.20:8000/v1",
      modelId: "Systran/faster-whisper-small",
      apiKey: "",
    });
    expect(local.privacy).toBe("external");
    expect(local.description).toContain("remote endpoint");
  });

  it("adds nothing without a model id", () => {
    expect(
      withLocalTranscriptionOption([remote], {
        baseUrl: "http://localhost:8000/v1",
        modelId: " ",
        apiKey: "",
      }),
    ).toEqual([remote]);
  });
});

describe("isLoopbackUrl", () => {
  it("accepts loopback hosts and rejects everything else", () => {
    for (const url of [
      "http://localhost:8000/v1",
      "http://api.localhost/v1",
      "http://127.0.0.1:8000",
      "http://127.10.0.1/v1",
      "http://[::1]:8000/v1",
    ]) {
      expect(isLoopbackUrl(url), url).toBe(true);
    }
    for (const url of [
      "http://192.168.1.20:8000/v1",
      "https://speaches.example.com/v1",
      "not a url",
      "",
    ]) {
      expect(isLoopbackUrl(url), url).toBe(false);
    }
  });
});
