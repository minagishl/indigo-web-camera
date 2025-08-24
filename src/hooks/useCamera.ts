import { useState, useRef, useCallback } from "preact/hooks";

interface CameraState {
  stream: MediaStream | null;
  track: MediaStreamTrack | null;
  facing: "environment" | "user";
  deviceId: string | null;
  status: "Idle" | "Starting" | "Ready" | "Failed" | "Stopped";
  resolution: string;
  devices: MediaDeviceInfo[];
}

export const useCamera = () => {
  const [state, setState] = useState<CameraState>({
    stream: null,
    track: null,
    facing: "environment",
    deviceId: null,
    status: "Idle",
    resolution: "—",
    devices: [],
  });

  const videoRef = useRef<HTMLVideoElement>(null);

  const setStatus = useCallback(
    (status: "Idle" | "Starting" | "Ready" | "Failed" | "Stopped") => {
      setState((prev) => ({ ...prev, status }));
    },
    []
  );

  const cleanupStream = useCallback(() => {
    if (state.stream) {
      state.stream.getTracks().forEach((track) => track.stop());
      setState((prev) => ({
        ...prev,
        stream: null,
        track: null,
        status: "Stopped",
        resolution: "—",
      }));
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [state.stream]);

  const listDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === "videoinput");
      setState((prev) => ({ ...prev, devices: videoDevices }));
      return videoDevices;
    } catch (error) {
      console.error("Failed to list devices:", error);
      return [];
    }
  }, []);

  const startCamera = useCallback(
    async (preferMax: boolean = false, customDeviceId?: string) => {
      try {
        setStatus("Starting");

        const deviceId = customDeviceId ?? state.deviceId;
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: deviceId ? undefined : { ideal: state.facing },
            deviceId: deviceId ? { exact: deviceId } : undefined,
            width: preferMax ? { ideal: 4096, max: 4096 } : { ideal: 1920 },
            height: preferMax ? { ideal: 2160, max: 4096 } : { ideal: 1080 },
            frameRate: { ideal: 30, max: 60 },
          },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        cleanupStream();

        const track = stream.getVideoTracks()[0];
        setState((prev) => ({ ...prev, stream, track }));

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});

          // Try to upgrade to max capability if allowed
          try {
            const caps = track.getCapabilities ? track.getCapabilities() : null;
            if (caps && caps.width && caps.height) {
              const target = {
                width: caps.width.max ?? undefined,
                height: caps.height.max ?? undefined,
              };
              await track.applyConstraints({
                width: target.width,
                height: target.height,
              });
            }
          } catch {
            // best-effort
          }

          // Wait for metadata to be ready
          await new Promise<void>((resolve) => {
            if (videoRef.current!.readyState >= 1) return resolve();
            videoRef.current!.onloadedmetadata = () => resolve();
          });

          // Update UI
          const settings = track.getSettings ? track.getSettings() : {};
          const resolution =
            settings.width && settings.height
              ? `${settings.width}×${settings.height}`
              : "—";
          setState((prev) => ({ ...prev, resolution, status: "Ready" }));

          // Update device list
          await listDevices();
        }
      } catch (error) {
        console.error("Failed to start camera:", error);
        setStatus("Failed");
        throw error;
      }
    },
    [state.deviceId, state.facing, cleanupStream, listDevices]
  );

  const switchFacing = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      facing: prev.facing === "environment" ? "user" : "environment",
      deviceId: null,
    }));
    if (state.stream) {
      await startCamera();
    }
  }, [state.stream, startCamera]);

  const switchDevice = useCallback(
    async (deviceId: string) => {
      setState((prev) => ({ ...prev, deviceId }));
      if (state.stream) {
        await startCamera(false, deviceId);
      }
    },
    [state.stream, startCamera]
  );

  const toggleAspectRatio = useCallback(async () => {
    if (!state.track || state.status !== "Ready") return;

    try {
      const settings = state.track.getSettings();
      const currentWidth = settings.width || 1920;
      const currentHeight = settings.height || 1080;

      // Toggle between landscape and portrait
      const newWidth = currentHeight;
      const newHeight = currentWidth;

      await state.track.applyConstraints({
        width: { ideal: newWidth },
        height: { ideal: newHeight },
      });

      // Wait a bit for the constraint to apply
      setTimeout(() => {
        const updatedSettings = state.track?.getSettings();
        if (updatedSettings?.width && updatedSettings?.height) {
          const resolution = `${updatedSettings.width}×${updatedSettings.height}`;
          setState((prev) => ({ ...prev, resolution }));
        }
      }, 200);
    } catch (error) {
      console.warn("Failed to toggle aspect ratio:", error);
    }
  }, [state.track, state.status]);

  return {
    state,
    videoRef,
    startCamera,
    stopCamera: cleanupStream,
    switchFacing,
    switchDevice,
    toggleAspectRatio,
    listDevices,
  };
};
