import { useState, useCallback } from "preact/hooks";
import { useCamera } from "../hooks/useCamera";
import { useCapture } from "../hooks/useCapture";
import { useAdvancedCapture } from "../hooks/useAdvancedCapture";
import { usePhotos } from "../hooks/usePhotos";
import { useCameraMode } from "../hooks/useCameraMode";
import { useManualControls } from "../hooks/useManualControls";
import { StatusBar } from "./StatusBar";
import { SettingsPanel } from "./SettingsPanel";
import { CameraControls } from "./CameraControls";
import { CameraModeSelector } from "./CameraModeSelector";
import { ManualControlsPanel } from "./ManualControlsPanel";
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
  const advancedCapture = useAdvancedCapture(
    camera.videoRef,
    camera.state.track
  );
  const photos = usePhotos();
  const cameraMode = useCameraMode();
  const manualControls = useManualControls(camera.state.track);

  const log = useCallback((message: string) => {
    console.log(message);
    setLogMessage(message);
    setTimeout(() => setLogMessage(null), 3000);
  }, []);

  const handleTakePhoto = useCallback(async () => {
    if (!camera.state.track || isCapturing) return;

    try {
      setIsCapturing(true);
      let photo: Blob | null = null;

      if (cameraMode.captureSettings.mode === "night") {
        photo = await advancedCapture.captureMultiFrame(
          cameraMode.captureSettings,
          jpegQuality
        );
        if (photo) {
          const photoObject = {
            id: `photo_${Date.now()}_${Math.random()
              .toString(36)
              .substr(2, 9)}`,
            blob: photo,
            timestamp: Date.now(),
            label: `Night mode (${cameraMode.captureSettings.frameCount} frames)`,
          };
          photos.addPhoto(photoObject);
          log(
            `Night mode: ${cameraMode.captureSettings.frameCount} frames captured`
          );
        } else {
          throw new Error("Night mode capture failed");
        }
      } else if (cameraMode.captureSettings.mode === "longExposure") {
        photo = await advancedCapture.captureLongExposure(2, jpegQuality); // 2 second exposure
        if (photo) {
          const photoObject = {
            id: `photo_${Date.now()}_${Math.random()
              .toString(36)
              .substr(2, 9)}`,
            blob: photo,
            timestamp: Date.now(),
            label: "Long exposure (2s)",
          };
          photos.addPhoto(photoObject);
          log("Long exposure captured");
        } else {
          throw new Error("Long exposure capture failed");
        }
      } else {
        photo = await takePhoto(jpegQuality);
        if (photo) {
          const photoObject = {
            id: `photo_${Date.now()}_${Math.random()
              .toString(36)
              .substr(2, 9)}`,
            blob: photo,
            timestamp: Date.now(),
            label: "Photo",
          };
          photos.addPhoto(photoObject);
          log("Photo saved");
        } else {
          throw new Error("Photo capture failed");
        }
      }
    } catch (error) {
      log("Failed to take photo");
      console.error(error);
    } finally {
      setIsCapturing(false);
    }
  }, [
    camera.state.track,
    isCapturing,
    takePhoto,
    advancedCapture,
    cameraMode.captureSettings,
    jpegQuality,
    photos,
    log,
  ]);

  const handleBurstCapture = useCallback(async () => {
    if (!camera.state.track || isCapturing) return;

    try {
      setIsCapturing(true);
      const photo = await burstCapture(burstCount, jpegQuality);
      if (photo) {
        const photoObject = {
          id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          blob: photo,
          timestamp: Date.now(),
          label: `Burst (${burstCount} shots)`,
        };
        photos.addPhoto(photoObject);
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
    camera
      .startCamera(preferMax)
      .then(() => {
        // Start frame buffer for advanced modes
        advancedCapture.startFrameBuffer();
      })
      .catch((error) => {
        log(error.message || "Failed to start camera");
      });
  }, [camera, preferMax, advancedCapture, log]);

  const handleStopCamera = useCallback(() => {
    camera.stopCamera();
    advancedCapture.stopFrameBuffer();
    log("Camera stopped");
  }, [camera, advancedCapture, log]);

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
      <canvas ref={advancedCapture.canvasRef} className="hidden" />

      {/* Camera Grid */}
      {showGrid && (
        <div className="camera-grid absolute top-0 left-0 w-full h-full pointer-events-none z-5">
          <div className="w-full h-full grid grid-cols-3 grid-rows-3">
            <div className="border-r-2 border-b-2 border-white/30"></div>
            <div className="border-r-2 border-b-2 border-white/30"></div>
            <div className="border-b-2 border-white/30"></div>
            <div className="border-r-2 border-b-2 border-white/30"></div>
            <div className="border-r-2 border-b-2 border-white/30"></div>
            <div className="border-b-2 border-white/30"></div>
            <div className="border-r-2 border-white/30"></div>
            <div className="border-r-2 border-white/30"></div>
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

      {/* Camera Mode Selector */}
      <CameraModeSelector
        currentMode={cameraMode.captureSettings.mode}
        onModeChange={cameraMode.setMode}
        onBurstCapture={handleBurstCapture}
        isCapturing={isCapturing}
      />

      {/* Manual Controls Panel */}
      <ManualControlsPanel
        controls={manualControls.controls}
        isManualMode={manualControls.isManualMode}
        controlRanges={manualControls.getControlRanges()}
        onISO={manualControls.setISO}
        onShutterSpeed={manualControls.setShutterSpeed}
        onFocus={manualControls.setFocus}
        onExposureCompensation={manualControls.setExposureCompensation}
        onWhiteBalance={manualControls.setWhiteBalance}
        onResetToAuto={manualControls.resetToAuto}
        onToggleManual={manualControls.setIsManualMode}
      />

      {/* Camera Controls */}
      <CameraControls
        onTakePhoto={handleTakePhoto}
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
