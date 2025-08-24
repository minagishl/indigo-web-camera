import { useState, useCallback } from "preact/hooks";
import { RefreshCw, X } from "lucide-preact";
import { useCamera } from "../hooks/useCamera";
import { useCameraMode } from "../hooks/useCameraMode";
import { useCapture } from "../hooks/useCapture";
import { useAdvancedCapture } from "../hooks/useAdvancedCapture";
import { usePhotos } from "../hooks/usePhotos";
import { useManualControls } from "../hooks/useManualControls";
import { useDeviceOrientation } from "../hooks/useDeviceOrientation";
import { CameraControls } from "./CameraControls";
import { CameraModeSelector } from "./CameraModeSelector";

import { StatusBar } from "./StatusBar";
import { GalleryModal } from "./GalleryModal";
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
  const [activeTab, setActiveTab] = useState("settings");

  const camera = useCamera();
  const deviceOrientation = useDeviceOrientation();
  const { canvasRef, takePhoto, burstCapture } = useCapture(
    camera.videoRef,
    camera.state.track,
    deviceOrientation.getPhotoOrientation()
  );
  const advancedCapture = useAdvancedCapture(
    camera.videoRef,
    camera.state.track,
    deviceOrientation.getPhotoOrientation()
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
  }, [camera, advancedCapture, log, preferMax]);

  const handleStopCamera = useCallback(() => {
    camera.stopCamera();
    advancedCapture.stopFrameBuffer();
    log("Camera stopped");
  }, [camera, advancedCapture, log]);

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

      {/* Top Overlay */}
      <div className="top-overlay"></div>

      {/* Status Bar */}
      <StatusBar
        status={camera.state.status}
        resolution={camera.state.resolution}
      />

      {/* Bottom Overlay */}
      <div className="bottom-overlay"></div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-0 left-0 w-full h-full z-20">
          <div
            className="absolute top-0 left-0 w-full h-full bg-black/50 backdrop-blur-sm"
            onClick={() => setShowSettings(false)}
          ></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] bg-black/50 backdrop-blur rounded-3xl p-6 overflow-y-auto border border-white/30">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-white">
                Settings & Manual Controls
              </h2>
              <button
                onClick={() => setShowSettings(false)}
                className="size-10 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/20 mb-6">
              <button
                onClick={() => setActiveTab("settings")}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === "settings"
                    ? "text-white border-b-2 border-white"
                    : "text-white/70 hover:text-white"
                }`}
              >
                Camera Settings
              </button>
              <button
                onClick={() => setActiveTab("manual")}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === "manual"
                    ? "text-white border-b-2 border-white"
                    : "text-white/70 hover:text-white"
                }`}
              >
                Manual Controls
              </button>
            </div>

            {/* Settings Tab */}
            {activeTab === "settings" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Burst Count
                    </label>
                    <input
                      type="number"
                      min="2"
                      max="20"
                      value={burstCount}
                      onChange={(e) =>
                        setBurstCount(Number(e.currentTarget.value))
                      }
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-white/40 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      JPEG Quality
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.01"
                      value={jpegQuality}
                      onChange={(e) =>
                        setJpegQuality(Number(e.currentTarget.value))
                      }
                      className="w-full"
                    />
                    <span className="text-sm text-white/70">
                      {Math.round(jpegQuality * 100)}%
                    </span>
                  </div>
                </div>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={preferMax}
                    onChange={(e) => setPreferMax(e.currentTarget.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-white">
                    Request highest resolution
                  </span>
                </label>

                <div className="flex items-center gap-4">
                  <button
                    onClick={handleStartCamera}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl transition-colors"
                  >
                    Start Camera
                  </button>
                  <button
                    onClick={handleStopCamera}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl transition-colors"
                  >
                    Stop Camera
                  </button>
                </div>
              </div>
            )}

            {/* Manual Controls Tab */}
            {activeTab === "manual" && (
              <div className="space-y-6">
                {manualControls.isManualMode ? (
                  <>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-white">
                        Manual Mode Active
                      </h3>
                      <button
                        onClick={() => manualControls.resetToAuto()}
                        className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white text-sm rounded-xl transition-colors"
                      >
                        Reset to Auto
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {manualControls.getControlRanges()?.iso && (
                        <div>
                          <label className="block text-sm font-medium text-white/70 mb-2">
                            ISO
                          </label>
                          <input
                            type="range"
                            min={manualControls.getControlRanges()?.iso?.min}
                            max={manualControls.getControlRanges()?.iso?.max}
                            step={manualControls.getControlRanges()?.iso?.step}
                            value={manualControls.controls.iso}
                            onChange={(e) =>
                              manualControls.setISO(
                                Number(e.currentTarget.value)
                              )
                            }
                            className="w-full"
                          />
                          <span className="text-sm text-white/70">
                            {manualControls.controls.iso}
                          </span>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-white/70 mb-2">
                          Shutter Speed
                        </label>
                        <input
                          type="range"
                          min={1 / 4000}
                          max={30}
                          step={0.001}
                          value={manualControls.controls.shutterSpeed}
                          onChange={(e) =>
                            manualControls.setShutterSpeed(
                              Number(e.currentTarget.value)
                            )
                          }
                          className="w-full"
                        />
                        <span className="text-sm text-white/70">
                          {manualControls.controls.shutterSpeed >= 1
                            ? `${manualControls.controls.shutterSpeed}s`
                            : `1/${Math.round(
                                1 / manualControls.controls.shutterSpeed
                              )}s`}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-white/70 mb-4">
                      Manual controls are not available in current mode
                    </p>
                    <button
                      onClick={() => manualControls.setIsManualMode(true)}
                      className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl transition-colors"
                    >
                      Enable Manual Mode
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Camera Mode Selector */}
      <CameraModeSelector
        currentMode={cameraMode.captureSettings.mode}
        onModeChange={cameraMode.setMode}
        onBurstCapture={handleBurstCapture}
        isCapturing={isCapturing}
        onOpenSettings={() => setShowSettings(true)}
        showGrid={showGrid}
        onGridToggle={() => setShowGrid(!showGrid)}
        onOpenGallery={() => setShowGallery(true)}
      />

      {/* Manual Controls Panel */}
      {/* This component is now integrated into the Settings Panel */}

      {/* Camera Controls */}
      <CameraControls onTakePhoto={handleTakePhoto} isCapturing={isCapturing} />

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

      {/* Refresh Button Group */}
      <div className="refresh-button-group absolute bottom-8 right-8 z-10">
        <div className="bg-black/50 backdrop-blur rounded-full p-1">
          <button
            onClick={handleStartCamera}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white"
            title="Refresh Camera"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Log Panel */}
      {logMessage && <LogPanel message={logMessage} />}
    </div>
  );
}
