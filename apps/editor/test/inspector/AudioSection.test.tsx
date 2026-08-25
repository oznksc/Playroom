import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { AudioSourceComponent, AudioListenerComponent } from "@gamekit/schema";
import { AudioSourceSection } from "../../src/components/inspector/AudioSourceSection.js";
import { AudioListenerSection } from "../../src/components/inspector/AudioListenerSection.js";

describe("AudioSection (RTL)", () => {
  describe("AudioSourceSection", () => {
    const defaultAudio: AudioSourceComponent = {
      type: "AudioSource",
      assetId: "theme-bgm",
      volume: 0.8,
      loop: true,
      playOnStart: true,
      minDistance: 50,
      maxDistance: 600,
    };

    it("renders volume, loop, and spatial distance fields", () => {
      render(
        <AudioSourceSection
          audioSource={defaultAudio}
          assets={[{ id: "theme-bgm", file: "bgm.mp3", type: "audio" as any }]}
          onChange={vi.fn()}
          open={true}
          onToggle={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      expect(screen.getByText("Audio Source")).toBeInTheDocument();
      expect(screen.getByText("Volume")).toBeInTheDocument();
      expect(screen.getByText("Min distance")).toBeInTheDocument();
      expect(screen.getByText("Max distance")).toBeInTheDocument();
      expect(screen.getByLabelText("Loop")).toBeChecked();
      expect(screen.getByLabelText("Play on start")).toBeChecked();
    });
  });

  describe("AudioListenerSection", () => {
    const defaultListener: AudioListenerComponent = {
      type: "AudioListener",
      enabled: true,
    };

    it("renders audio listener enable toggle", () => {
      const onChange = vi.fn();
      render(
        <AudioListenerSection
          audioListener={defaultListener}
          onChange={onChange}
          open={true}
          onToggle={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      expect(screen.getByText("Audio Listener")).toBeInTheDocument();
      expect(screen.getByLabelText("Enabled")).toBeChecked();
    });
  });
});
