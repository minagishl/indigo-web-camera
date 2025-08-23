import { useState, useCallback } from "preact/hooks";
import type { CameraMode, CaptureSettings } from "../types/camera";
import { DEFAULT_CAPTURE_SETTINGS } from "../types/camera";

export const useCameraMode = () => {
  const [captureSettings, setCaptureSettings] = useState<CaptureSettings>(
    DEFAULT_CAPTURE_SETTINGS
  );

  const setMode = useCallback((mode: CameraMode) => {
    setCaptureSettings((prev) => ({
      ...prev,
      mode,
      // Adjust frame count based on mode
      frameCount: mode === "night" ? 8 : mode === "longExposure" ? 1 : 1,
    }));
  }, []);

  const updateCaptureSettings = useCallback(
    (updates: Partial<CaptureSettings>) => {
      setCaptureSettings((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  const updateManualControls = useCallback(
    (updates: Partial<typeof captureSettings.manualControls>) => {
      setCaptureSettings((prev) => ({
        ...prev,
        manualControls: { ...prev.manualControls, ...updates },
      }));
    },
    []
  );

  const getModeConfig = useCallback((mode: CameraMode) => {
    switch (mode) {
      case "photo":
        return {
          name: "Photo",
          description: "Standard photo capture with zero shutter lag",
          maxFrameCount: 1,
          defaultFrameCount: 1,
        };
      case "night":
        return {
          name: "Night",
          description: "Multi-frame capture for low light conditions",
          maxFrameCount: 32,
          defaultFrameCount: 8,
        };
      case "longExposure":
        return {
          name: "Long Exposure",
          description: "Extended exposure for motion blur effects",
          maxFrameCount: 1,
          defaultFrameCount: 1,
        };
    }
  }, []);

  return {
    captureSettings,
    setMode,
    updateCaptureSettings,
    updateManualControls,
    getModeConfig,
  };
};
