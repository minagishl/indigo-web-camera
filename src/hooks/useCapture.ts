import { useCallback, useRef } from "preact/hooks";
import { type RefObject } from "preact/compat";
import {
  createOrientedImageBlob,
  calculateImageOrientation,
} from "../utils/imageOrientation";

export const useCapture = (
  videoRef: RefObject<HTMLVideoElement>,
  track: MediaStreamTrack | null,
  deviceOrientation: number = 0
) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const videoToCanvas = useCallback(
    (width?: number, height?: number): HTMLCanvasElement => {
      const video = videoRef.current;
      if (!video || !canvasRef.current)
        throw new Error("Video or canvas not available");

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const cw = width || vw;
      const ch = height || vh;

      canvasRef.current.width = cw;
      canvasRef.current.height = ch;

      const ctx = canvasRef.current.getContext("2d")!;

      // Calculate aspect ratios
      const videoAspect = vw / vh;
      const canvasAspect = cw / ch;

      let sx = 0,
        sy = 0,
        sw = vw,
        sh = vh;

      if (videoAspect > canvasAspect) {
        // Video is wider than canvas - crop width
        sw = vh * canvasAspect;
        sx = (vw - sw) / 2;
      } else if (videoAspect < canvasAspect) {
        // Video is taller than canvas - crop height
        sh = vw / canvasAspect;
        sy = (vh - sh) / 2;
      }

      // Draw cropped video to canvas
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, cw, ch);

      return canvasRef.current;
    },
    [videoRef]
  );

  const canvasToBlob = useCallback(
    (
      canvas: HTMLCanvasElement,
      type = "image/jpeg",
      quality = 0.92
    ): Promise<Blob> => {
      return new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Failed to create blob from canvas"));
            }
          },
          type,
          quality
        );
      });
    },
    []
  );

  const takePhoto = useCallback(
    async (quality = 0.92): Promise<Blob | null> => {
      if (!track) return null;

      try {
        let blob: Blob | null = null;

        // Prefer ImageCapture if available
        if ("ImageCapture" in window) {
          try {
            const imageCapture = new ImageCapture(track);
            let opts = {};

            if (imageCapture.getPhotoCapabilities) {
              const caps = await imageCapture
                .getPhotoCapabilities()
                .catch(() => null);
              if (caps && caps.imageWidth && caps.imageHeight) {
                opts = {
                  imageWidth: caps.imageWidth.max,
                  imageHeight: caps.imageHeight.max,
                };
              }
            }

            blob = await imageCapture.takePhoto(opts).catch(() => null);
          } catch {
            // Fallback below
          }
        }

        if (!blob) {
          // Fallback: capture from video element
          const canvas = videoToCanvas();
          blob = await canvasToBlob(canvas, "image/jpeg", quality);
        }

        // Adjust image orientation based on device orientation
        if (blob && deviceOrientation !== 0) {
          const video = videoRef.current;
          if (video) {
            const orientationInfo =
              calculateImageOrientation(deviceOrientation);
            const orientedBlob = await createOrientedImageBlob(
              video,
              orientationInfo,
              quality
            );
            blob = orientedBlob;
          }
        }

        return blob;
      } catch (error) {
        console.error("Failed to take photo:", error);
        throw error;
      }
    },
    [track, videoToCanvas, canvasToBlob, deviceOrientation, videoRef]
  );

  const burstCapture = useCallback(
    async (count: number, quality = 0.92): Promise<Blob | null> => {
      if (!track) return null;

      try {
        const frames: ImageBitmap[] = [];
        let w = videoRef.current?.videoWidth || 0;
        let h = videoRef.current?.videoHeight || 0;

        if (
          "MediaStreamTrackProcessor" in window &&
          "MediaStreamTrackReader" in window
        ) {
          // Use MediaStreamTrackProcessor for precise frame capture
          const processor = new MediaStreamTrackProcessor({ track });
          const reader = processor.readable.getReader();

          for (let i = 0; i < count; i++) {
            const { value, done } = await reader.read();
            if (done || !value) break;

            const bitmap = await createImageBitmap(value);
            frames.push(bitmap);

            if (i === 0) {
              w = value.displayWidth;
              h = value.displayHeight;
            }

            value.close();
          }

          reader.releaseLock();
        } else {
          // Fallback: sample frames from video element
          for (let i = 0; i < count; i++) {
            await new Promise((resolve) => requestAnimationFrame(resolve));
            const canvas = videoToCanvas();
            const bitmap = await createImageBitmap(canvas);
            frames.push(bitmap);
          }
        }

        // Average stack for noise reduction
        const outputCanvas = document.createElement("canvas");
        outputCanvas.width = w;
        outputCanvas.height = h;
        const ctx = outputCanvas.getContext("2d")!;

        ctx.clearRect(0, 0, w, h);
        const alpha = 1 / frames.length;

        frames.forEach((bitmap) => {
          ctx.globalAlpha = alpha;

          // Apply proper aspect ratio cropping for each frame
          const bitmapAspect = bitmap.width / bitmap.height;
          const canvasAspect = w / h;

          let sx = 0,
            sy = 0,
            sw = bitmap.width,
            sh = bitmap.height;

          if (bitmapAspect > canvasAspect) {
            // Bitmap is wider than canvas - crop width
            sw = bitmap.height * canvasAspect;
            sx = (bitmap.width - sw) / 2;
          } else if (bitmapAspect < canvasAspect) {
            // Bitmap is taller than canvas - crop height
            sh = bitmap.width / canvasAspect;
            sy = (bitmap.height - sh) / 2;
          }

          ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, w, h);
        });

        ctx.globalAlpha = 1;

        let blob = await canvasToBlob(outputCanvas, "image/jpeg", quality);
        frames.forEach((bitmap) => bitmap.close && bitmap.close());

        // Adjust image orientation based on device orientation
        if (blob && deviceOrientation !== 0) {
          const video = videoRef.current;
          if (video) {
            const orientationInfo =
              calculateImageOrientation(deviceOrientation);
            const orientedBlob = await createOrientedImageBlob(
              video,
              orientationInfo,
              quality
            );
            blob = orientedBlob;
          }
        }

        return blob;
      } catch (error) {
        console.error("Failed to capture burst:", error);
        throw error;
      }
    },
    [track, videoRef, videoToCanvas, canvasToBlob, deviceOrientation]
  );

  return {
    canvasRef,
    takePhoto,
    burstCapture,
  };
};
