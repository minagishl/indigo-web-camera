import { useState, useRef, useCallback } from "preact/hooks";
import {
  getCachedProfile,
  setCachedProfile,
  shallowSnapshotCapabilities,
  clearStaleCaches,
} from "../utils/capabilityCache";

// Internal camera state (public shape unchanged externally for Phase 1)
interface CameraState {
  stream: MediaStream | null;
  track: MediaStreamTrack | null;
  facing: "environment" | "user";
  deviceId: string | null;
  status: "Idle" | "Starting" | "Ready" | "Failed" | "Stopped";
  resolution: string;
  devices: MediaDeviceInfo[];
}

// Phase 1 constants
const FAST_START_IDEAL = { width: 1920, height: 1080, frameRate: 30 };
const RESOLUTION_LADDER = [4096, 3840, 2560, 1920, 1280]; // descending fallback
const MAX_CONSEC_ASPECT_FAILURE = 2;

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

  // Refs for upgrade control
  const upgradeAttemptedRef = useRef(false);
  const aspectFailureRef = useRef(0);

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
    // Allow future upgrade attempts after stop
    upgradeAttemptedRef.current = false;
    aspectFailureRef.current = 0;
  }, [state.stream]);

  const listDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === "videoinput");
      setState((prev) => ({ ...prev, devices: videoDevices }));
      return videoDevices;
    } catch (error) {
      console.error("[camera] failed to list devices:", error);
      return [];
    }
  }, []);

  /**
   * Build initial (fast start) constraints.
   * Attempts:
   *  1. Fresh cached lastApplied (exact width/height/aspect) if recent
   *  2. Default fast profile (1920x1080, aspect ideal ~16/9) with facing or deviceId
   */
  const buildInitialConstraints = useCallback(
    (
      deviceId: string | null,
      facing: "environment" | "user"
    ): MediaStreamConstraints => {
      const cached = deviceId ? getCachedProfile(deviceId) : undefined;
      let aspect = cached?.lastApplied?.aspectRatio;
      const baseVideo: MediaTrackConstraints = {};

      if (deviceId) {
        baseVideo.deviceId = { exact: deviceId };
      } else {
        baseVideo.facingMode = { ideal: facing };
      }

      if (cached?.lastApplied) {
        // Try cached exact (ideal to allow minor differences)
        baseVideo.width = { ideal: cached.lastApplied.width };
        baseVideo.height = { ideal: cached.lastApplied.height };
        if (aspect) {
          baseVideo.aspectRatio = { ideal: aspect };
        }
        baseVideo.frameRate = { ideal: cached.lastApplied.frameRate ?? 30 };
      } else {
        // Fast start defaults
        baseVideo.width = { ideal: FAST_START_IDEAL.width };
        baseVideo.height = { ideal: FAST_START_IDEAL.height };
        baseVideo.aspectRatio = { ideal: 16 / 9 };
        baseVideo.frameRate = { ideal: FAST_START_IDEAL.frameRate, max: 60 };
      }

      return {
        video: baseVideo,
        audio: false,
      };
    },
    []
  );

  /**
   * Attempt to upgrade constraints to maximum capabilities while preserving aspect ratio.
   * Includes fallback ladder:
   *   1) max width/height with aspectRatio
   *   2) remove aspectRatio
   *   3) reduce frameRate (30 -> 24 -> 15)
   *   4) resolution ladder stepping down
   * Stops after first success or exhaustion of strategies.
   */
  const attemptUpgrade = useCallback(
    async (track: MediaStreamTrack) => {
      if (upgradeAttemptedRef.current) return;
      upgradeAttemptedRef.current = true;

      const caps: MediaTrackCapabilities | null = track.getCapabilities
        ? (() => {
            try {
              return track.getCapabilities();
            } catch {
              return null;
            }
          })()
        : null;

      if (!caps || !caps.width || !caps.height) {
        // Capabilities not available - nothing to do
        return;
      }

      const settings = track.getSettings ? track.getSettings() : {};
      const currentW = settings.width;
      const currentH = settings.height;
      const maxW = caps.width?.max;
      const maxH = caps.height?.max;

      // Guard: if already near max (within 16px tolerance), skip
      if (
        typeof currentW === "number" &&
        typeof currentH === "number" &&
        typeof maxW === "number" &&
        typeof maxH === "number" &&
        Math.abs(maxW - currentW) <= 16 &&
        Math.abs(maxH - currentH) <= 16
      ) {
        return;
      }

      const baseAspect =
        (currentW && currentH && currentW / currentH) ||
        (caps.aspectRatio &&
        typeof caps.aspectRatio === "object" &&
        "max" in caps.aspectRatio
          ? (caps.aspectRatio as any).max
          : undefined);

      const keepAspect =
        baseAspect && aspectFailureRef.current < MAX_CONSEC_ASPECT_FAILURE;

      const clampToCapabilities = (
        width: number,
        height: number
      ): { width: number; height: number } => {
        let w = width;
        let h = height;
        if (maxW && w > maxW) {
          w = maxW;
          if (keepAspect && baseAspect) h = Math.round(w / baseAspect);
        }
        if (maxH && h > maxH) {
          h = maxH;
          if (keepAspect && baseAspect) w = Math.round(h * baseAspect);
        }
        return { width: w, height: h };
      };

      const targetInitial = clampToCapabilities(
        typeof maxW === "number" ? maxW : currentW || FAST_START_IDEAL.width,
        typeof maxH === "number" ? maxH : currentH || FAST_START_IDEAL.height
      );

      type Strategy = {
        label: string;
        constraints: MediaTrackConstraints;
        affectsAspect?: boolean;
      };

      const strategies: Strategy[] = [];

      // 1) Max with aspect ratio
      if (keepAspect && targetInitial.width && targetInitial.height) {
        strategies.push({
          label: "max-with-aspect",
          affectsAspect: true,
          constraints: {
            width: targetInitial.width,
            height: targetInitial.height,
            aspectRatio: baseAspect,
            frameRate: { ideal: 30, max: 60 },
          },
        });
      }

      // 2) Max without aspect
      strategies.push({
        label: "max-no-aspect",
        constraints: {
          width: targetInitial.width,
          height: targetInitial.height,
          frameRate: { ideal: 30, max: 60 },
        },
      });

      // 3) Lower frame rates
      for (const fr of [24, 15]) {
        strategies.push({
          label: `max-no-aspect-fr-${fr}`,
          constraints: {
            width: targetInitial.width,
            height: targetInitial.height,
            frameRate: { ideal: fr, max: fr },
          },
        });
      }

      // 4) Resolution ladder (descending) - stop at first <= max size
      const ladder = RESOLUTION_LADDER.filter((w) => !maxW || w <= maxW);
      for (const w of ladder) {
        if (w === targetInitial.width) continue; // already tried
        const h = baseAspect ? Math.round(w / baseAspect) : undefined;
        strategies.push({
          label: `ladder-${w}`,
          constraints: {
            width: w,
            height: h,
            frameRate: { ideal: 30 },
          },
        });
      }

      let applied = false;
      for (const strat of strategies) {
        try {
          await track.applyConstraints(strat.constraints);
          applied = true;
          const s = track.getSettings ? track.getSettings() : {};
          // store cache
          const deviceId = s.deviceId || state.deviceId;
          if (deviceId) {
            setCachedProfile(deviceId, {
              lastApplied: {
                width: s.width || (strat.constraints.width as number),
                height: s.height || (strat.constraints.height as number),
                aspectRatio: keepAspect ? baseAspect : undefined,
                frameRate:
                  typeof s.frameRate === "number"
                    ? s.frameRate
                    : (strat.constraints.frameRate as any)?.ideal,
              },
              capabilities: shallowSnapshotCapabilities(caps),
            });
          }
          console.debug(
            `[camera] upgraded to ${s.width}x${s.height} @ ~${
              s.frameRate
            }fps (aspect ${keepAspect ? baseAspect?.toFixed(3) : "—"}) via ${
              strat.label
            }`
          );
          break;
        } catch (err) {
          if (strat.affectsAspect) {
            aspectFailureRef.current += 1;
          }
          // continue to next
        }
      }

      if (!applied) {
        // If all strategies failed, mark aspect ratio abandoned for session if we hit failure threshold
        if (aspectFailureRef.current >= MAX_CONSEC_ASPECT_FAILURE) {
          console.debug(
            "[camera] aspect ratio locked attempts failed; dropping for session"
          );
        }
      }
    },
    [state.deviceId]
  );

  const startCamera = useCallback(
    async (preferMax: boolean = false, customDeviceId?: string) => {
      try {
        setStatus("Starting");
        clearStaleCaches(); // best-effort cleanup

        const deviceId = customDeviceId ?? state.deviceId;
        const initialConstraints = buildInitialConstraints(
          deviceId,
          state.facing
        );

        // Optionally override for explicit preferMax (still keep initial negotiation scaffolding)
        if (preferMax) {
          const videoC = initialConstraints.video as MediaTrackConstraints;
          videoC.width = { ideal: 4096, max: 4096 };
          videoC.height = { ideal: 2160, max: 4096 };
        }

        // Acquire stream
        const stream = await navigator.mediaDevices.getUserMedia(
          initialConstraints
        );

        // Clean up previous stream AFTER successful new acquisition to avoid black flicker
        cleanupStream();

        const track = stream.getVideoTracks()[0];
        setState((prev) => ({ ...prev, stream, track }));

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});

          // metadata ready
          await new Promise<void>((resolve) => {
            if (videoRef.current!.readyState >= 1) return resolve();
            videoRef.current!.onloadedmetadata = () => resolve();
          });

          const settings = track.getSettings ? track.getSettings() : {};
          const resolution =
            settings.width && settings.height
              ? `${settings.width}×${settings.height}`
              : "—";
          setState((prev) => ({
            ...prev,
            resolution,
            status: "Ready",
            deviceId: settings.deviceId
              ? settings.deviceId
              : prev.deviceId ?? deviceId ?? null,
          }));

          // Phase 1: cache initial applied profile BEFORE upgrade so re-init can reuse
          try {
            const effectiveDeviceId =
              settings.deviceId || deviceId || state.deviceId;
            if (
              effectiveDeviceId &&
              typeof settings.width === "number" &&
              typeof settings.height === "number"
            ) {
              setCachedProfile(effectiveDeviceId, {
                lastApplied: {
                  width: settings.width,
                  height: settings.height,
                  aspectRatio:
                    settings.width && settings.height
                      ? settings.width / settings.height
                      : undefined,
                  frameRate:
                    typeof settings.frameRate === "number"
                      ? settings.frameRate
                      : undefined,
                },
                capabilities: shallowSnapshotCapabilities(
                  track.getCapabilities
                    ? (() => {
                        try {
                          return track.getCapabilities();
                        } catch {
                          return null;
                        }
                      })()
                    : null
                ),
              });
            }
          } catch {
            // ignore cache errors (best-effort)
          }

          await listDevices();

          // Upgrade attempt (only once)
          if (!upgradeAttemptedRef.current) {
            try {
              await attemptUpgrade(track);
              // Refresh resolution display after upgrade attempt
              const post = track.getSettings ? track.getSettings() : {};
              if (post.width && post.height) {
                setState((prev) => ({
                  ...prev,
                  resolution: `${post.width}×${post.height}`,
                }));
              }
            } catch {
              // swallow upgrade failures - fast start remains
            }
          }
        }
      } catch (error) {
        console.error("[camera] failed to start:", error);
        setStatus("Failed");
        throw error;
      }
    },
    [
      state.deviceId,
      state.facing,
      cleanupStream,
      listDevices,
      buildInitialConstraints,
      attemptUpgrade,
    ]
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

  return {
    state,
    videoRef,
    startCamera,
    stopCamera: cleanupStream,
    switchFacing,
    switchDevice,
    listDevices,
  };
};
