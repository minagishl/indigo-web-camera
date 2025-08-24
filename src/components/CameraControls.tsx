import { Images } from "lucide-preact";

interface CameraControlsProps {
  onTakePhoto: () => void;
  onOpenGallery: () => void;
  isCapturing: boolean;
}

export function CameraControls({
  onTakePhoto,
  onOpenGallery,
  isCapturing,
}: CameraControlsProps) {
  return (
    <div className="camera-controls">
      <div className="flex items-center justify-center gap-4">
        {/* Gallery Button */}
        <button onClick={onOpenGallery} className="control-button">
          <Images size={18} />
        </button>

        {/* Main Capture Button */}
        <button
          onClick={onTakePhoto}
          disabled={isCapturing}
          className="capture-button disabled:opacity-50"
        >
          <div className="size-14 rounded-full bg-black"></div>
        </button>
      </div>
    </div>
  );
}
