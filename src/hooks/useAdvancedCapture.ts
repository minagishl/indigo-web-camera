import { useCallback, useRef } from "preact/hooks";
import type { CaptureSettings } from "../types/camera";
import { webgpuAccumulateHDR } from "../utils/webgpuHDR";

export const useAdvancedCapture = (
  videoRef: React.RefObject<HTMLVideoElement>,
  track: MediaStreamTrack | null
) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameBufferRef = useRef<ImageData[]>([]);
  const isCapturingRef = useRef(false);

  // Start buffering recent frames (max 32)
  const startFrameBuffer = useCallback(() => {
    if (!videoRef.current || !track || isCapturingRef.current) return;

    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true });
    if (!tempCtx) return;

    isCapturingRef.current = true;
    const video = videoRef.current;

    const captureFrame = () => {
      if (!isCapturingRef.current || !video.videoWidth || !video.videoHeight) {
        requestAnimationFrame(captureFrame);
        return;
      }

      tempCanvas.width = video.videoWidth;
      tempCanvas.height = video.videoHeight;

      tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
      const imageData = tempCtx.getImageData(
        0,
        0,
        tempCanvas.width,
        tempCanvas.height
      );

      frameBufferRef.current.push(imageData);
      if (frameBufferRef.current.length > 32) {
        frameBufferRef.current.shift();
      }

      if (isCapturingRef.current) requestAnimationFrame(captureFrame);
    };

    captureFrame();
  }, [videoRef, track]);

  const stopFrameBuffer = useCallback(() => {
    isCapturingRef.current = false;
    frameBufferRef.current = [];
  }, []);

  const applyOrientation = useCallback(
    (
      source: HTMLCanvasElement | HTMLImageElement,
      orientation: number
    ): HTMLCanvasElement => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      let width = source.width;
      let height = source.height;

      if (orientation === 90 || orientation === 270) {
        canvas.width = height;
        canvas.height = width;
      } else {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((-orientation * Math.PI) / 180);
      ctx.drawImage(source, -width / 2, -height / 2, width, height);
      ctx.restore();
      return canvas;
    },
    []
  );

  // Multi-frame / HDR capture with WebGPU path + orientation deferral
  const captureMultiFrame = useCallback(
    async (
      settings: CaptureSettings,
      jpegQuality: number = 0.92,
      imageOrientation: number = 0
    ): Promise<Blob | null> => {
      if (!videoRef.current || !canvasRef.current || !track)
        throw new Error("Camera not ready");

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      let hdrApplied = false;
      let usedFrameCount = 1;

      if (settings.mode === "night") {
        const availableFrames = frameBufferRef.current.length;
        if (availableFrames === 0) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        } else {
          const framesToUse = Math.min(settings.frameCount, availableFrames);
          usedFrameCount = framesToUse;
          if (settings.enableHDR) {
            try {
              const toned = await webgpuAccumulateHDR(video, framesToUse, {
                maxFrames: framesToUse,
              });
              ctx.putImageData(toned, 0, 0);
              hdrApplied = true;
            } catch {
              const frames = frameBufferRef.current.slice(-framesToUse);
              const toned = await accumulateAndToneMap(
                frames,
                canvas.width,
                canvas.height,
                {
                  maxFrames: framesToUse,
                }
              );
              ctx.putImageData(toned, 0, 0);
              hdrApplied = true;
            }
          } else {
            const frames = frameBufferRef.current.slice(-framesToUse);
            await mergeFrames(ctx, frames, canvas.width, canvas.height);
          }
        }
      } else {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }

      const appliedRotation = imageOrientation;
      let finalCanvas = canvas;
      if (imageOrientation !== 0) {
        finalCanvas = applyOrientation(canvas, imageOrientation);
      }

      return new Promise<Blob>((resolve, reject) => {
        finalCanvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error("Failed to create blob"));
            (blob as any).orientationMeta = {
              deviceOrientation: imageOrientation,
              appliedRotation,
              deferred: false,
            };
            (blob as any).hdrMeta = {
              enabled: hdrApplied,
              frameCount: usedFrameCount,
              algorithm: hdrApplied
                ? "webgpu-accumulate-tone-map-v1"
                : settings.mode === "night" && usedFrameCount > 1
                ? "average-merge"
                : "single-frame",
            };
            resolve(blob);
          },
          "image/jpeg",
          jpegQuality
        );
      });
    },
    [videoRef, track, applyOrientation]
  );

  const mergeFrames = useCallback(
    async (
      ctx: CanvasRenderingContext2D,
      frames: ImageData[],
      width: number,
      height: number
    ) => {
      if (frames.length === 0) return;
      const mergedData = new Uint8ClampedArray(width * height * 4);
      const pixelCount = width * height;

      for (let i = 0; i < pixelCount * 4; i += 4) {
        let r = 0,
          g = 0,
          b = 0,
          a = 0;
        for (const frame of frames) {
          r += frame.data[i];
          g += frame.data[i + 1];
          b += frame.data[i + 2];
          a += frame.data[i + 3];
        }
        mergedData[i] = r / frames.length;
        mergedData[i + 1] = g / frames.length;
        mergedData[i + 2] = b / frames.length;
        mergedData[i + 3] = a / frames.length;
      }

      const mergedImageData = new ImageData(mergedData, width, height);
      ctx.putImageData(mergedImageData, 0, 0);
    },
    []
  );

  const captureLongExposure = useCallback(
    async (
      exposureTime: number,
      jpegQuality: number = 0.92,
      imageOrientation: number = 0
    ): Promise<Blob | null> => {
      if (!videoRef.current || !canvasRef.current || !track)
        throw new Error("Camera not ready");

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const frameInterval = 100;
      const frameCount = Math.max(
        1,
        Math.floor((exposureTime * 1000) / frameInterval)
      );
      const frames: ImageData[] = [];

      for (let i = 0; i < frameCount; i++) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        frames.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
        if (i < frameCount - 1) {
          await new Promise((r) => setTimeout(r, frameInterval));
        }
      }

      await mergeFramesWithMotionBlur(ctx, frames, canvas.width, canvas.height);

      let finalCanvas = canvas;
      if (imageOrientation !== 0) {
        finalCanvas = applyOrientation(canvas, imageOrientation);
      }

      return new Promise<Blob>((resolve, reject) => {
        finalCanvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Failed to create blob"));
          },
          "image/jpeg",
          jpegQuality
        );
      });
    },
    [videoRef, track, applyOrientation]
  );

  const mergeFramesWithMotionBlur = useCallback(
    async (
      ctx: CanvasRenderingContext2D,
      frames: ImageData[],
      width: number,
      height: number
    ) => {
      if (frames.length === 0) return;
      const mergedData = new Uint8ClampedArray(width * height * 4);
      const pixelCount = width * height;

      for (let i = 0; i < pixelCount * 4; i += 4) {
        let r = 0,
          g = 0,
          b = 0,
          a = 0;
        let totalWeight = 0;
        frames.forEach((frame, index) => {
          const weight = 1 / (index + 1);
          r += frame.data[i] * weight;
          g += frame.data[i + 1] * weight;
          b += frame.data[i + 2] * weight;
          a += frame.data[i + 3] * weight;
          totalWeight += weight;
        });
        mergedData[i] = r / totalWeight;
        mergedData[i + 1] = g / totalWeight;
        mergedData[i + 2] = b / totalWeight;
        mergedData[i + 3] = a / totalWeight;
      }

      const mergedImageData = new ImageData(mergedData, width, height);
      ctx.putImageData(mergedImageData, 0, 0);
    },
    []
  );

  // JS fallback HDR accumulate + tone map
  const accumulateAndToneMap = async (
    frames: ImageData[],
    width: number,
    height: number,
    options?: { maxFrames?: number; tone?: "reinhard" | "filmic" }
  ): Promise<ImageData> => {
    const count =
      options?.maxFrames && options.maxFrames > 0
        ? Math.min(frames.length, options.maxFrames)
        : frames.length;
    if (!count) return frames[0];

    let linearLUT = (accumulateAndToneMap as any)._linearLUT as
      | Float32Array
      | undefined;
    if (!linearLUT) {
      linearLUT = new Float32Array(256);
      for (let i = 0; i < 256; i++) linearLUT[i] = Math.pow(i / 255, 2.2);
      (accumulateAndToneMap as any)._linearLUT = linearLUT;
    }

    const pixels = width * height;
    const accum = new Float32Array(pixels * 3);

    for (let f = 0; f < count; f++) {
      const data = frames[f].data;
      for (let i = 0, p = 0; i < data.length; i += 4, p++) {
        const base = p * 3;
        accum[base] += linearLUT[data[i]];
        accum[base + 1] += linearLUT[data[i + 1]];
        accum[base + 2] += linearLUT[data[i + 2]];
      }
    }

    const out = new Uint8ClampedArray(pixels * 4);
    const tone = options?.tone || "reinhard";
    for (let p = 0, o = 0; p < pixels; p++, o += 4) {
      let r = accum[p * 3] / count;
      let g = accum[p * 3 + 1] / count;
      let b = accum[p * 3 + 2] / count;

      if (tone === "reinhard") {
        r = r / (1 + r);
        g = g / (1 + g);
        b = b / (1 + b);
      } else {
        r = r / (1 + r);
        g = g / (1 + g);
        b = b / (1 + b);
      }

      r = Math.pow(Math.max(0, Math.min(1, r)), 1 / 2.2);
      g = Math.pow(Math.max(0, Math.min(1, g)), 1 / 2.2);
      b = Math.pow(Math.max(0, Math.min(1, b)), 1 / 2.2);

      out[o] = (r * 255) | 0;
      out[o + 1] = (g * 255) | 0;
      out[o + 2] = (b * 255) | 0;
      out[o + 3] = 255;
    }

    return new ImageData(out, width, height);
  };

  return {
    canvasRef,
    startFrameBuffer,
    stopFrameBuffer,
    captureMultiFrame,
    captureLongExposure,
  };
};
