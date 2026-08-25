import React, { useEffect, useState } from "react";
import { GuideLoop, type Step, type ThemeConfig } from "@guideloop/react";

export const TOUR_STORAGE_KEY = "playroom_tour_completed";

export const TOUR_STEPS: Step[] = [
  {
    target: "#tour-canvas-tour-anchor",
    additionalTargets: ["#tour-canvas-stage"],
    title: "Canvas Viewport",
    content:
      "Design your 2D game world in this full-bleed canvas. Pan with middle-click or Space, zoom with wheel, and manipulate entities with transform gizmos.",
    // The canvas fills the viewport, so its bottom edge is outside the
    // usable area. Keep the first card anchored above the target instead of
    // letting the tour render below the viewport.
    placement: "bottom",
    spotlightPadding: 8,
  },
  {
    target: "#tour-canvas-tour-anchor",
    additionalTargets: ["#tour-topbar-play"],
    title: "Play in Editor",
    content:
      "Launch your game instantly with export-parity physics, rules engine, audio, and gamepad support running on the embedded Phaser host.",
    placement: "bottom",
    spotlightPadding: 6,
  },
  {
    target: "#tour-canvas-tour-anchor",
    additionalTargets: ["#tour-activity-rail"],
    title: "Activity Rail & Drawers",
    content:
      "Quickly toggle Hierarchy, Component Inspectors, Asset Library, Prefabs, GUI Designer, and Animation Timeline panels.",
    placement: "bottom",
    spotlightPadding: 6,
  },
  {
    target: "#tour-canvas-tour-anchor",
    additionalTargets: ["#tour-agent-button"],
    title: "Antigravity AI Agent",
    content:
      "Collaborate with the in-editor AI agent. Ask it to build levels, compose mechanics, tweak physics, or diagnose project health with natural language.",
    placement: "bottom",
    spotlightPadding: 6,
  },
];

const EDITOR_TOUR_THEME: Partial<ThemeConfig> = {
  tooltip: {
    background: "#0d131f",
    textColor: "#f1f5f9",
    borderRadius: "10px",
    padding: "16px",
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 0 0 1px #1e293b",
  },
  overlay: {
    background: "#030712",
    opacity: 0.75,
  },
  spotlight: {
    borderColor: "#00f0ff",
    borderWidth: "2px",
    borderRadius: "8px",
    animation: "pulse",
  },
  buttons: {
    primary: {
      background: "#00f0ff",
      textColor: "#06090e",
      hoverBackground: "#38bdf8",
      padding: "6px 14px",
    },
    secondary: {
      background: "transparent",
      textColor: "#94a3b8",
      hoverBackground: "rgba(255, 255, 255, 0.08)",
      padding: "6px 12px",
    },
  },
};

export type EditorTourProps = {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
};

export function EditorTour({ isOpen, onClose, onComplete }: EditorTourProps) {
  const handleFinish = () => {
    try {
      localStorage.setItem(TOUR_STORAGE_KEY, "true");
    } catch {
      /* ignore */
    }
    onComplete?.();
    onClose();
  };

  return (
    <GuideLoop
      steps={TOUR_STEPS}
      isOpen={isOpen}
      onClose={handleFinish}
      onComplete={handleFinish}
      onSkip={handleFinish}
      customTheme={EDITOR_TOUR_THEME}
      overlay={true}
      keyboard={true}
      spotlightPadding={8}
      zIndex={9999}
      defaultButtonLabels={{
        next: "Next",
        prev: "Back",
        skip: "Skip Tour",
        finish: "Get Started",
      }}
    />
  );
}

/**
 * Hook to manage first-run tour state and reopening.
 */
export function useEditorTour() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      const completed = localStorage.getItem(TOUR_STORAGE_KEY);
      if (!completed) {
        // Small delay for initial DOM render
        const timer = setTimeout(() => setIsOpen(true), 600);
        return () => clearTimeout(timer);
      }
    } catch {
      /* ignore */
    }
  }, []);

  return {
    isTourOpen: isOpen,
    openTour: () => setIsOpen(true),
    closeTour: () => setIsOpen(false),
  };
}
