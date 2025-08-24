import { useState, useEffect } from "preact/hooks";

export interface DeviceOrientation {
  alpha: number | null;
  beta: number | null;
  gamma: number | null;
  absolute: boolean;
}

export interface ScreenOrientation {
  type: OrientationType;
  angle: number;
}

export function useDeviceOrientation() {
  const [deviceOrientation, setDeviceOrientation] = useState<DeviceOrientation>(
    {
      alpha: null,
      beta: null,
      gamma: null,
      absolute: false,
    }
  );

  const [screenOrientation, setScreenOrientation] = useState<ScreenOrientation>(
    {
      type: "portrait-primary",
      angle: 0,
    }
  );

  useEffect(() => {
    const handleDeviceOrientation = (event: DeviceOrientationEvent) => {
      setDeviceOrientation({
        alpha: event.alpha,
        beta: event.beta,
        gamma: event.gamma,
        absolute: event.absolute || false,
      });
    };

    const handleScreenOrientation = () => {
      if (screen.orientation) {
        setScreenOrientation({
          type: screen.orientation.type,
          angle: screen.orientation.angle,
        });
      }
    };

    // Listen to device orientation events
    if ("DeviceOrientationEvent" in window) {
      window.addEventListener("deviceorientation", handleDeviceOrientation);
    }

    // Listen to screen orientation events
    if ("orientation" in screen) {
      handleScreenOrientation();
      screen.orientation?.addEventListener("change", handleScreenOrientation);
    }

    return () => {
      if ("DeviceOrientationEvent" in window) {
        window.removeEventListener(
          "deviceorientation",
          handleDeviceOrientation
        );
      }
      if ("orientation" in screen) {
        screen.orientation?.removeEventListener(
          "change",
          handleScreenOrientation
        );
      }
    };
  }, []);

  // Determine photo orientation based on device orientation
  const getPhotoOrientation = () => {
    // Prioritize screen orientation
    if (screen.orientation) {
      switch (screen.orientation.type) {
        case "landscape-primary":
          return 0; // Normal orientation
        case "landscape-secondary":
          return 180; // 180 degree rotation
        case "portrait-primary":
          return 90; // 90 degree clockwise
        case "portrait-secondary":
          return 270; // 270 degree clockwise (90 degree counter-clockwise)
        default:
          return 0;
      }
    }

    // Estimate from device orientation data
    if (deviceOrientation.beta !== null && deviceOrientation.gamma !== null) {
      const beta = Math.abs(deviceOrientation.beta);
      const gamma = Math.abs(deviceOrientation.gamma);

      // Determine if device is portrait or landscape
      if (beta > 45) {
        // Device is portrait
        return deviceOrientation.gamma > 0 ? 90 : 270;
      } else {
        // Device is landscape
        return deviceOrientation.beta > 0 ? 0 : 180;
      }
    }

    return 0; // Default
  };

  // Check if device orientation is available
  const isOrientationAvailable = () => {
    return "DeviceOrientationEvent" in window || "orientation" in screen;
  };

  return {
    deviceOrientation,
    screenOrientation,
    getPhotoOrientation,
    isOrientationAvailable,
  };
}
