interface CameraControlsProps {
  onTakePhoto: () => void;
  isCapturing: boolean;
}

export function CameraControls({
  onTakePhoto,
  isCapturing,
}: CameraControlsProps) {
  return (
    <div className="capture-button-container" style={{ zIndex: 15 }}>
      <div className="flex items-center justify-center">
        {/* Main Capture Button with Ring */}
        <div className="bg-black/50 backdrop-blur rounded-full">
          <button
            onClick={onTakePhoto}
            disabled={isCapturing}
            className="capture-button disabled:opacity-50"
            style={{ touchAction: "manipulation" }}
          >
            <div className="size-12 rounded-full bg-white/90 backdrop-blur-sm border border-white/30"></div>
          </button>
        </div>
      </div>
    </div>
  );
}
