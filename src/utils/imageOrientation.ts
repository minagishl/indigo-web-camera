/**
 * Utility functions for adjusting image orientation
 */

export interface OrientationInfo {
  rotation: number;
  flip: boolean;
}

/**
 * Adjust image orientation based on device orientation
 * @param orientation Device orientation in degrees
 * @returns Image orientation information
 */
export function calculateImageOrientation(
  orientation: number
): OrientationInfo {
  // Normalize orientation to 0-360 degree range
  const normalizedOrientation = ((orientation % 360) + 360) % 360;

  let rotation = 0;
  let flip = false;

  switch (normalizedOrientation) {
    case 0:
      rotation = 0;
      flip = false;
      break;
    case 90:
      rotation = 90;
      flip = false;
      break;
    case 180:
      rotation = 180;
      flip = false;
      break;
    case 270:
      rotation = 270;
      flip = false;
      break;
    default:
      // Round to nearest 90-degree increment for intermediate angles
      if (normalizedOrientation < 45 || normalizedOrientation >= 315) {
        rotation = 0;
      } else if (normalizedOrientation < 135) {
        rotation = 90;
      } else if (normalizedOrientation < 225) {
        rotation = 180;
      } else {
        rotation = 270;
      }
      flip = false;
  }

  return { rotation, flip };
}

/**
 * Draw image on Canvas with specified rotation and flip
 * @param canvas Target Canvas for drawing
 * @param image Image to draw (HTMLImageElement, HTMLVideoElement, ImageBitmap, etc.)
 * @param orientation Image orientation information
 */
export function drawImageWithOrientation(
  canvas: HTMLCanvasElement,
  image: CanvasImageSource,
  orientation: OrientationInfo
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { rotation, flip } = orientation;

  // Get canvas dimensions
  const { width, height } = canvas;

  // Reset context
  ctx.clearRect(0, 0, width, height);

  // Reset transformation matrix
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // Move to canvas center
  ctx.translate(width / 2, height / 2);

  // Apply rotation
  if (rotation !== 0) {
    ctx.rotate((rotation * Math.PI) / 180);
  }

  // Apply flip
  if (flip) {
    ctx.scale(-1, 1);
  }

  // Get image dimensions
  let imageWidth: number;
  let imageHeight: number;

  if (image instanceof HTMLVideoElement) {
    imageWidth = image.videoWidth;
    imageHeight = image.videoHeight;
  } else if (image instanceof HTMLImageElement) {
    imageWidth = image.naturalWidth;
    imageHeight = image.naturalHeight;
  } else if (image instanceof ImageBitmap) {
    imageWidth = image.width;
    imageHeight = image.height;
  } else {
    // Use canvas dimensions for other types
    imageWidth = width;
    imageHeight = height;
  }

  // Calculate dimensions after rotation
  let drawWidth = imageWidth;
  let drawHeight = imageHeight;

  if (rotation === 90 || rotation === 270) {
    // Swap width and height for 90 or 270 degree rotation
    [drawWidth, drawHeight] = [drawHeight, drawWidth];
  }

  // Draw image (centered)
  ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
}

/**
 * Create oriented image blob with adjusted orientation
 * @param image Original image
 * @param orientation Image orientation information
 * @param quality JPEG quality (0.1-1.0)
 * @returns Adjusted image blob
 */
export async function createOrientedImageBlob(
  image: CanvasImageSource,
  orientation: OrientationInfo,
  quality: number = 0.92
): Promise<Blob> {
  // Get image dimensions
  let imageWidth: number;
  let imageHeight: number;

  if (image instanceof HTMLVideoElement) {
    imageWidth = image.videoWidth;
    imageHeight = image.videoHeight;
  } else if (image instanceof HTMLImageElement) {
    imageWidth = image.naturalWidth;
    imageHeight = image.naturalHeight;
  } else if (image instanceof ImageBitmap) {
    imageWidth = image.width;
    imageHeight = image.height;
  } else {
    throw new Error("Unsupported image type");
  }

  // Calculate dimensions after rotation
  let canvasWidth = imageWidth;
  let canvasHeight = imageHeight;

  if (orientation.rotation === 90 || orientation.rotation === 270) {
    // Swap width and height for 90 or 270 degree rotation
    [canvasWidth, canvasHeight] = [canvasHeight, canvasWidth];
  }

  // Create new canvas
  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  // Draw image with adjusted orientation
  drawImageWithOrientation(canvas, image, orientation);

  // Return as blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to create blob from canvas"));
        }
      },
      "image/jpeg",
      quality
    );
  });
}
