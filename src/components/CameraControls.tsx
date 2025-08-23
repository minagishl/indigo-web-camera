import { Images, Zap } from "lucide-preact";
import type { CameraMode } from "../types/camera";

interface CameraControlsProps {
  onTakePhoto: () => void;
  onBurstCapture: () => void;
  onOpenGallery: () => void;
  isCapturing: boolean;
  currentMode: CameraMode;
}

export function CameraControls({
  onTakePhoto,
  onBurstCapture,
  onOpenGallery,
  isCapturing,
  currentMode,
}: CameraControlsProps) {
  return (
    <div className="camera-controls">
      <div className="flex items-center justify-center gap-8">
        {/* Gallery Button */}
        <button onClick={onOpenGallery} className="control-button">
          <Images size={24} />
        </button>

        {/* Main Capture Button */}
        <button
          onClick={onTakePhoto}
          disabled={isCapturing}
          className="capture-button disabled:opacity-50"
        >
          <div className="w-16 h-16 rounded-full bg-black"></div>
        </button>

        {/* Mode-specific Button */}
        {currentMode === "night" && (
          <button
            onClick={onBurstCapture}
            disabled={isCapturing}
            className="control-button disabled:opacity-50"
          >
            <Zap size={24} />
          </button>
        )}
        {currentMode === "photo" && (
          <button
            onClick={onBurstCapture}
            disabled={isCapturing}
            className="control-button disabled:opacity-50"
          >
            <Zap size={24} />
          </button>
        )}
      </div>
    </div>
  );
}
