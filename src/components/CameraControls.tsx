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
        <button
          onClick={onOpenGallery}
          className="control-button flex items-center justify-center"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </button>

        {/* Main Capture Button */}
        <button
          onClick={onTakePhoto}
          disabled={isCapturing}
          className="capture-button flex items-center justify-center disabled:opacity-50"
        >
          <div className="w-16 h-16 rounded-full bg-black"></div>
        </button>

        {/* Burst Button */}
        <button
          onClick={onBurstCapture}
          disabled={isCapturing}
          className="control-button flex items-center justify-center disabled:opacity-50"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
