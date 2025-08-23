import { Images, Zap } from "lucide-preact";

interface CameraControlsProps {
  onTakePhoto: () => void;
  onBurstCapture: () => void;
  onOpenGallery: () => void;
  isCapturing: boolean;
}

export function CameraControls({
  onTakePhoto,
  onBurstCapture,
  onOpenGallery,
  isCapturing,
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

        {/* Burst Button */}
        <button
          onClick={onBurstCapture}
          disabled={isCapturing}
          className="control-button disabled:opacity-50"
        >
          <Zap size={24} />
        </button>
      </div>
    </div>
  );
}
