import { useState, useCallback, useEffect } from "preact/hooks";
import type { CameraMode } from "../types/camera";

export interface AppSettings {
  burstCount: number;
  jpegQuality: number;
  preferMax: boolean;
  showGrid: boolean;
  activeTab: string;
  cameraMode: CameraMode;
}

const DEFAULT_SETTINGS: AppSettings = {
  burstCount: 8,
  jpegQuality: 0.92,
  preferMax: false,
  showGrid: false,
  activeTab: "settings",
  cameraMode: "photo",
};

const SETTINGS_KEY = "indigo_web_camera_settings";

export const useSettings = () => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem(SETTINGS_KEY);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (error) {
      console.warn("Failed to load settings from localStorage:", error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save settings to localStorage whenever they change
  const saveSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      } catch (error) {
        console.warn("Failed to save settings to localStorage:", error);
      }
      return updated;
    });
  }, []);

  // Individual setters for convenience
  const setBurstCount = useCallback(
    (count: number) => {
      saveSettings({ burstCount: count });
    },
    [saveSettings]
  );

  const setJpegQuality = useCallback(
    (quality: number) => {
      saveSettings({ jpegQuality: quality });
    },
    [saveSettings]
  );

  const setPreferMax = useCallback(
    (prefer: boolean) => {
      saveSettings({ preferMax: prefer });
    },
    [saveSettings]
  );

  const setShowGrid = useCallback(
    (show: boolean) => {
      saveSettings({ showGrid: show });
    },
    [saveSettings]
  );

  const setActiveTab = useCallback(
    (tab: string) => {
      saveSettings({ activeTab: tab });
    },
    [saveSettings]
  );

  const setCameraMode = useCallback(
    (mode: CameraMode) => {
      saveSettings({ cameraMode: mode });
    },
    [saveSettings]
  );

  // Reset to defaults
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    try {
      localStorage.removeItem(SETTINGS_KEY);
    } catch (error) {
      console.warn("Failed to remove settings from localStorage:", error);
    }
  }, []);

  return {
    settings,
    isLoaded,
    saveSettings,
    setBurstCount,
    setJpegQuality,
    setPreferMax,
    setShowGrid,
    setActiveTab,
    setCameraMode,
    resetSettings,
  };
};
