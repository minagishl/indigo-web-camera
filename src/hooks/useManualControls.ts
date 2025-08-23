import { useState, useCallback, useEffect } from "preact/hooks";
import type { ManualControls } from "../types/camera";
import { DEFAULT_MANUAL_CONTROLS } from "../types/camera";

// Extended capabilities interface for camera controls
interface ExtendedCapabilities extends MediaTrackCapabilities {
  iso?: { min: number; max: number; step: number };
  focusDistance?: { min: number; max: number; step: number };
  exposureCompensation?: { min: number; max: number; step: number };
  colorTemperature?: { min: number; max: number; step: number };
}

export const useManualControls = (track: MediaStreamTrack | null) => {
  const [controls, setControls] = useState<ManualControls>(
    DEFAULT_MANUAL_CONTROLS
  );
  const [capabilities, setCapabilities] = useState<ExtendedCapabilities | null>(
    null
  );
  const [isManualMode, setIsManualMode] = useState(false);

  // Get camera capabilities
  useEffect(() => {
    if (track && track.getCapabilities) {
      // Most browsers don't support advanced camera controls via MediaStreamTrack
      // This is a placeholder implementation for future browser support
      const basicCapabilities = track.getCapabilities();
      const extendedCapabilities: ExtendedCapabilities = {
        ...basicCapabilities,
        // Mock capabilities for UI demonstration
        iso: { min: 50, max: 3200, step: 25 },
        focusDistance: { min: 0, max: 1, step: 0.01 },
        exposureCompensation: { min: -3, max: 3, step: 0.1 },
        colorTemperature: { min: 2500, max: 8000, step: 100 },
      };
      setCapabilities(extendedCapabilities);
    }
  }, [track]);

  // Apply constraints to the camera
  const applyConstraints = useCallback(
    async (newControls: Partial<ManualControls>) => {
      if (!track || !capabilities) return;

      try {
        // Note: Most browsers don't support these advanced controls yet
        // This implementation provides UI feedback while being browser-safe

        // Try to apply basic constraints that might be supported
        const basicConstraints: MediaTrackConstraints = {};

        // Focus mode (some browsers support this)
        if (newControls.focus !== undefined) {
          try {
            (basicConstraints as any).focusMode = isManualMode
              ? "manual"
              : "continuous";
            // Most browsers don't support focusDistance yet
          } catch {
            // Ignore unsupported constraints
          }
        }

        // White balance mode (some browsers support this)
        if (newControls.whiteBalance?.temperature !== undefined) {
          try {
            (basicConstraints as any).whiteBalanceMode = isManualMode
              ? "manual"
              : "continuous";
            // Most browsers don't support colorTemperature yet
          } catch {
            // Ignore unsupported constraints
          }
        }

        // Exposure mode (some browsers support this)
        if (newControls.exposureCompensation !== undefined) {
          try {
            (basicConstraints as any).exposureMode = isManualMode
              ? "manual"
              : "continuous";
          } catch {
            // Ignore unsupported constraints
          }
        }

        // Apply only supported constraints
        if (Object.keys(basicConstraints).length > 0) {
          try {
            await track.applyConstraints(basicConstraints);
          } catch (error) {
            console.info(
              "Some camera controls not supported by browser:",
              error
            );
            // Don't throw error, just log it
          }
        }

        // Always update UI state regardless of browser support
        setControls((prev) => ({ ...prev, ...newControls }));
      } catch (error) {
        console.warn("Failed to apply manual controls:", error);
        // Don't throw error to prevent UI breaking
        setControls((prev) => ({ ...prev, ...newControls }));
      }
    },
    [track, capabilities, isManualMode]
  );

  // Individual control setters
  const setISO = useCallback(
    async (iso: number) => {
      await applyConstraints({ iso });
    },
    [applyConstraints]
  );

  const setShutterSpeed = useCallback(async (shutterSpeed: number) => {
    // Note: Direct shutter speed control is limited in web browsers
    // This is more of a UI placeholder for future implementation
    setControls((prev) => ({ ...prev, shutterSpeed }));
  }, []);

  const setFocus = useCallback(
    async (focus: number) => {
      await applyConstraints({ focus });
    },
    [applyConstraints]
  );

  const setExposureCompensation = useCallback(
    async (exposureCompensation: number) => {
      await applyConstraints({ exposureCompensation });
    },
    [applyConstraints]
  );

  const setWhiteBalance = useCallback(
    async (temperature: number, tint: number = 0) => {
      await applyConstraints({
        whiteBalance: { temperature, tint },
      });
    },
    [applyConstraints]
  );

  // Reset to auto mode
  const resetToAuto = useCallback(async () => {
    if (!track) return;

    try {
      // Try to apply auto mode constraints (browser support varies)
      const autoConstraints: MediaTrackConstraints = {};

      // These properties may not be supported by all browsers
      try {
        (autoConstraints as any).focusMode = "continuous";
        (autoConstraints as any).whiteBalanceMode = "continuous";
        (autoConstraints as any).exposureMode = "continuous";

        await track.applyConstraints(autoConstraints);
      } catch (error) {
        console.info("Auto mode constraints not supported by browser:", error);
      }

      setControls(DEFAULT_MANUAL_CONTROLS);
      setIsManualMode(false);
    } catch (error) {
      console.warn("Failed to reset to auto mode:", error);
      // Always reset UI state even if constraints fail
      setControls(DEFAULT_MANUAL_CONTROLS);
      setIsManualMode(false);
    }
  }, [track]);

  // Get supported ranges for UI
  const getControlRanges = useCallback(() => {
    if (!capabilities) return null;

    return {
      iso: capabilities.iso
        ? {
            min: capabilities.iso.min || 50,
            max: capabilities.iso.max || 3200,
            step: capabilities.iso.step || 25,
          }
        : null,

      focus: capabilities.focusDistance
        ? {
            min: 0,
            max: 1,
            step: 0.01,
          }
        : null,

      exposureCompensation: capabilities.exposureCompensation
        ? {
            min: capabilities.exposureCompensation.min || -3,
            max: capabilities.exposureCompensation.max || 3,
            step: capabilities.exposureCompensation.step || 0.1,
          }
        : null,

      whiteBalance: capabilities.colorTemperature
        ? {
            min: capabilities.colorTemperature.min || 2500,
            max: capabilities.colorTemperature.max || 8000,
            step: capabilities.colorTemperature.step || 100,
          }
        : null,
    };
  }, [capabilities]);

  return {
    controls,
    capabilities,
    isManualMode,
    setIsManualMode,
    setISO,
    setShutterSpeed,
    setFocus,
    setExposureCompensation,
    setWhiteBalance,
    resetToAuto,
    getControlRanges,
  };
};
