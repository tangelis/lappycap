import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LappycapVisualizer } from "../../src/components/LappycapVisualizer";
import type { VisualizerQualityProfile } from "../../src/components/visualizer-quality";
import type { PlaybackStateInfluence } from "../../src/runtime/interfaces";

vi.mock("@/components/ButterchurnVisualizer", () => ({
  ButterchurnVisualizer: () => <div data-testid="butterchurn-stub" />,
}));

const session = {
  status: "running" as const,
  activeSceneId: "sunday-morning-vibes",
  sceneName: "Sunday",
  activePresetId: "sunrise-glow",
  presetName: "Sunrise",
  activeCueIndex: 0,
};

const influence: PlaybackStateInfluence = { tempo: 100, energy: 0.5, valence: 0.2 };
const fallbackQuality: VisualizerQualityProfile = {
  tier: "fallback",
  label: "Reduced FX",
  userMode: "auto",
  useButterchurn: false,
  targetFps: 20,
  meshWidth: 0,
  meshHeight: 0,
  pixelRatioCap: 1,
  showBackdropBlur: false,
  showAnimatedOverlay: false,
  showFrequencyBars: true,
  frequencyBarCount: 4,
  overlayOpacity: 0.08,
  showFrequencyBarGlow: false,
  useStrictContainment: true,
};

describe("LappycapVisualizer", () => {
  it("renders session, influence, and mounts butterchurn stub", () => {
    const onNext = vi.fn();
    render(
      <LappycapVisualizer
        session={session}
        influence={influence}
        warnings={[]}
        onNextCue={onNext}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onMockInfluence={vi.fn()}
      />
    );
    expect(screen.getByTestId("butterchurn-stub")).toBeInTheDocument();
    expect(screen.getAllByText(/Sunday/).length).toBeGreaterThan(0);
    expect(screen.getByText(/tempo 100/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /next cue/i }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("disables controls when controlsDisabled", () => {
    render(
      <LappycapVisualizer
        session={session}
        influence={influence}
        warnings={[]}
        onNextCue={vi.fn()}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onMockInfluence={vi.fn()}
        controlsDisabled
      />
    );
    expect(screen.getByRole("button", { name: /next cue/i })).toBeDisabled();
  });

  it("shows warnings list", () => {
    render(
      <LappycapVisualizer
        session={session}
        influence={influence}
        warnings={[{ code: "X", message: "Something odd" }]}
        onNextCue={vi.fn()}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onMockInfluence={vi.fn()}
      />
    );
    expect(screen.getByText(/Something odd/)).toBeInTheDocument();
  });

  it("shows a clear play CTA before playback starts", () => {
    const onStartPlayback = vi.fn();

    render(
      <LappycapVisualizer
        session={session}
        influence={influence}
        currentStationTitle="Groove Salad"
        onStartPlayback={onStartPlayback}
        warnings={[]}
        onNextCue={vi.fn()}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onMockInfluence={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: /play groove salad/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /play groove salad/i }));
    expect(onStartPlayback).toHaveBeenCalledTimes(1);
  });

  it("shows reduced fx status instead of waiting during fallback playback", () => {
    render(
      <LappycapVisualizer
        session={session}
        influence={influence}
        playbackActive
        currentStationTitle="Groove Salad"
        visualizerQuality={fallbackQuality}
        warnings={[]}
        onNextCue={vi.fn()}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onMockInfluence={vi.fn()}
      />
    );

    expect(screen.getByText(/reduced fx reactive mode/i)).toBeInTheDocument();
    expect(screen.queryByText(/waiting for playback/i)).not.toBeInTheDocument();
  });
});
