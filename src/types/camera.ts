export type CameraMode = "photo" | "night" | "longExposure";

export interface ManualControls {
  iso: number;
  shutterSpeed: number; // in seconds
  focus: number; // 0-1 range
  exposureCompensation: number; // in EV
  whiteBalance: {
    temperature: number; // in Kelvin
    tint: number; // -1 to 1
  };
}

export interface CaptureSettings {
  mode: CameraMode;
  frameCount: number; // for multi-frame capture
  manualControls: ManualControls;
  enableHDR: boolean;
  outputFormat: "jpeg" | "raw" | "both";
  // Phase 1 extensions (orientation + quality + aspect negotiation)
  targetAspectRatio?: number; // preferred aspect ratio (e.g., 16/9 = 1.777...)
  qualityHint?: "speed" | "balanced" | "quality"; // capture pipeline preference
  orientation?: {
    deviceOrientation: number; // raw device orientation degrees
    appliedRotation: number; // rotation actually applied to pixels (0 if deferred)
    deferred: boolean; // true if pixel rotation deferred to display/export
  };
}

export const DEFAULT_MANUAL_CONTROLS: ManualControls = {
  iso: 100,
  shutterSpeed: 1 / 60,
  focus: 0.5,
  exposureCompensation: 0,
  whiteBalance: {
    temperature: 5500,
    tint: 0,
  },
};

export const DEFAULT_CAPTURE_SETTINGS: CaptureSettings = {
  mode: "photo",
  frameCount: 1,
  manualControls: DEFAULT_MANUAL_CONTROLS,
  enableHDR: false,
  outputFormat: "jpeg",
};
