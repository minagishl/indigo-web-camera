import { useState, useCallback } from "preact/hooks";
import { useCamera } from "../hooks/useCamera";
import { useCapture } from "../hooks/useCapture";
import { usePhotos } from "../hooks/usePhotos";
import { StatusBar } from "./StatusBar";
import { SettingsPanel } from "./SettingsPanel";
import { CameraControls } from "./CameraControls";
import { GalleryModal } from "./GalleryModal";
import { GalleryPreview } from "./GalleryPreview";
import { LogPanel } from "./LogPanel";

export function CameraApp() {
  const [showSettings, setShowSettings] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [logMessage, setLogMessage] = useState<string | null>(null);
  const [burstCount, setBurstCount] = useState(8);
  const [jpegQuality, setJpegQuality] = useState(0.92);
  const [preferMax, setPreferMax] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showGrid, setShowGrid] = useState(false);

  const camera = useCamera();
  const { canvasRef, takePhoto, burstCapture } = useCapture(
    camera.videoRef,
    camera.state.track
  );
  const photos = usePhotos();

  const log = useCallback((message: string) => {
    console.log(message);
    setLogMessage(message);
    setTimeout(() => setLogMessage(null), 3000);
  }, []);

  const handleTakePhoto = useCallback(async () => {
    if (!camera.state.track || isCapturing) return;

    try {
      setIsCapturing(true);
      const photo = await takePhoto(jpegQuality);
      if (photo) {
        photos.addPhoto(photo);
        log("Photo saved");
      }
    } catch {
      log("Failed to take photo");
    } finally {
      setIsCapturing(false);
    }
  }, [camera.state.track, isCapturing, takePhoto, jpegQuality, photos, log]);

  const handleBurstCapture = useCallback(async () => {
    if (!camera.state.track || isCapturing) return;

    try {
      setIsCapturing(true);
      const photo = await burstCapture(burstCount, jpegQuality);
      if (photo) {
        photos.addPhoto(photo);
        log("Burst capture complete");
      }
    } catch {
      log("Failed to capture burst");
    } finally {
      setIsCapturing(false);
    }
  }, [
    camera.state.track,
    isCapturing,
    burstCapture,
    burstCount,
    jpegQuality,
    photos,
    log,
  ]);

  const handleStartCamera = useCallback(() => {
    camera.startCamera(preferMax).catch((error) => {
      log(error.message || "Failed to start camera");
    });
  }, [camera, preferMax, log]);

  const handleStopCamera = useCallback(() => {
    camera.stopCamera();
    log("Camera stopped");
  }, [camera, log]);

  const handleSwitchCamera = useCallback(() => {
    camera.switchFacing().catch((error) => {
      log(error.message || "Failed to switch camera");
    });
  }, [camera, log]);

  const latestPhoto = photos.getLatestPhoto();

  return (
    <div className="camera-viewport text-white">
      {/* Video Preview */}
      <video
        ref={camera.videoRef}
        className="w-full h-full object-cover"
        playsInline
        autoPlay
        muted
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera Grid */}
      {showGrid && (
        <div className="camera-grid absolute top-0 left-0 w-full h-full pointer-events-none z-5">
          <div className="w-full h-full grid grid-cols-3 grid-rows-3">
            <div className="border-r border-b border-white/30"></div>
            <div className="border-r border-b border-white/30"></div>
            <div className="border-b border-white/30"></div>
            <div className="border-r border-b border-white/30"></div>
            <div className="border-r border-b border-white/30"></div>
            <div className="border-b border-white/30"></div>
            <div className="border-r border-white/30"></div>
            <div className="border-r border-white/30"></div>
            <div></div>
          </div>
        </div>
      )}

      {/* Status Bar */}
      <StatusBar
        status={camera.state.status}
        resolution={camera.state.resolution}
        onSettingsClick={() => setShowSettings(!showSettings)}
        showGrid={showGrid}
        onGridToggle={() => setShowGrid(!showGrid)}
      />

      {/* Settings Panel */}
      {showSettings && (
        <SettingsPanel
          devices={camera.state.devices}
          burstCount={burstCount}
          jpegQuality={jpegQuality}
          preferMax={preferMax}
          onBurstCountChange={setBurstCount}
          onJpegQualityChange={setJpegQuality}
          onPreferMaxChange={setPreferMax}
          onStartCamera={handleStartCamera}
          onStopCamera={handleStopCamera}
          onSwitchCamera={handleSwitchCamera}
          onDeviceChange={camera.switchDevice}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Gallery Preview */}
      {latestPhoto && (
        <GalleryPreview
          photo={latestPhoto}
          createObjectURL={photos.createObjectURL}
          onClick={() => setShowGallery(true)}
        />
      )}

      {/* Camera Controls */}
      <CameraControls
        onTakePhoto={handleTakePhoto}
        onBurstCapture={handleBurstCapture}
        onOpenGallery={() => setShowGallery(true)}
        isCapturing={isCapturing}
      />

      {/* Gallery Modal */}
      {showGallery && (
        <GalleryModal
          photos={photos.photos}
          createObjectURL={photos.createObjectURL}
          revokeObjectURL={photos.revokeObjectURL}
          onClose={() => setShowGallery(false)}
          onDelete={photos.deletePhoto}
        />
      )}

      {/* Log Panel */}
      {logMessage && <LogPanel message={logMessage} />}
    </div>
  );
}
