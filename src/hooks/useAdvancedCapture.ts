import { useCallback, useRef } from "preact/hooks";
import type { CaptureSettings } from "../types/camera";

export const useAdvancedCapture = (
  videoRef: React.RefObject<HTMLVideoElement>,
  track: MediaStreamTrack | null
) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameBufferRef = useRef<ImageData[]>([]);
  const isCapturingRef = useRef(false);

  // Continuous frame capture for buffer
  const startFrameBuffer = useCallback(() => {
    if (!videoRef.current || !track || isCapturingRef.current) {
      return;
    }

    // Create a temporary canvas for frame capture
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

      // Keep only recent frames (max 32 for Night mode)
      frameBufferRef.current.push(imageData);
      if (frameBufferRef.current.length > 32) {
        frameBufferRef.current.shift();
      }

      if (isCapturingRef.current) {
        requestAnimationFrame(captureFrame);
      }
    };

    captureFrame();
  }, [videoRef, track]);

  const stopFrameBuffer = useCallback(() => {
    isCapturingRef.current = false;
    frameBufferRef.current = [];
  }, []);

  // Helper function to apply orientation to canvas
  const applyOrientation = useCallback(
    (
      source: HTMLCanvasElement | HTMLImageElement,
      orientation: number
    ): HTMLCanvasElement => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;

      let width = source.width;
      let height = source.height;

      // Adjust canvas size based on orientation
      if (orientation === 90 || orientation === 270) {
        canvas.width = height;
        canvas.height = width;
      } else {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.save();

      // Move to center of canvas
      ctx.translate(canvas.width / 2, canvas.height / 2);

      // Apply rotation so that the arrow direction becomes the top of the image
      // For 90°: rotate counter-clockwise to make right side become top
      // For 270°: rotate clockwise to make left side become top
      ctx.rotate((-orientation * Math.PI) / 180);

      // Draw the image centered
      ctx.drawImage(source, -width / 2, -height / 2, width, height);

      ctx.restore();

      return canvas;
    },
    []
  );

  // Multi-frame capture and processing
  const captureMultiFrame = useCallback(
    async (
      settings: CaptureSettings,
      jpegQuality: number = 0.92,
      imageOrientation: number = 0
    ): Promise<Blob | null> => {
      if (!videoRef.current || !canvasRef.current || !track) {
        throw new Error("Camera not ready");
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // For Night mode, use buffered frames
      if (settings.mode === "night") {
        const availableFrames = frameBufferRef.current.length;

        if (availableFrames === 0) {
          // Fallback to single frame
          console.log("Night mode: No buffered frames, using single frame");
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        } else {
          // Use available frames (minimum 1, up to requested count)
          const framesToUse = Math.min(settings.frameCount, availableFrames);
          console.log(
            `Night mode: Using ${framesToUse} frames out of ${availableFrames} available`
          );
          await mergeFrames(
            ctx,
            frameBufferRef.current.slice(-framesToUse),
            canvas.width,
            canvas.height
          );
        }
      } else {
        // Standard single frame capture
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }

      // Apply orientation if needed
      let finalCanvas = canvas;
      if (imageOrientation !== 0) {
        finalCanvas = applyOrientation(canvas, imageOrientation);
      }

      // Convert to blob
      return new Promise<Blob>((resolve, reject) => {
        finalCanvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Failed to create blob from canvas"));
            }
          },
          "image/jpeg",
          jpegQuality
        );
      });
    },
    [videoRef, track, applyOrientation]
  );

  // Frame merging algorithm for noise reduction
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

      // Average pixels across frames
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

  // Long exposure simulation
  const captureLongExposure = useCallback(
    async (
      exposureTime: number,
      jpegQuality: number = 0.92,
      imageOrientation: number = 0
    ): Promise<Blob | null> => {
      if (!videoRef.current || !canvasRef.current || !track) {
        throw new Error("Camera not ready");
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Capture frames over time for motion blur effect
      const frameInterval = 100; // ms
      const frameCount = Math.max(
        1,
        Math.floor((exposureTime * 1000) / frameInterval)
      );
      const frames: ImageData[] = [];

      for (let i = 0; i < frameCount; i++) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        frames.push(ctx.getImageData(0, 0, canvas.width, canvas.height));

        if (i < frameCount - 1) {
          await new Promise((resolve) => setTimeout(resolve, frameInterval));
        }
      }

      // Merge frames with motion blur
      await mergeFramesWithMotionBlur(ctx, frames, canvas.width, canvas.height);

      // Apply orientation if needed
      let finalCanvas = canvas;
      if (imageOrientation !== 0) {
        finalCanvas = applyOrientation(canvas, imageOrientation);
      }

      return new Promise<Blob>((resolve, reject) => {
        finalCanvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Failed to create blob from canvas"));
            }
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

      // Weighted average for motion blur effect
      for (let i = 0; i < pixelCount * 4; i += 4) {
        let r = 0,
          g = 0,
          b = 0,
          a = 0;
        let totalWeight = 0;

        frames.forEach((frame, index) => {
          const weight = 1 / (index + 1); // More recent frames have higher weight
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

  return {
    canvasRef,
    startFrameBuffer,
    stopFrameBuffer,
    captureMultiFrame,
    captureLongExposure,
  };
};
