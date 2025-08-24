import { Camera, Moon, Timer, Zap } from "lucide-preact";
import { useRef, useEffect, useState } from "preact/hooks";
import type { CameraMode } from "../types/camera";

interface CameraModeSelectorProps {
  currentMode: CameraMode;
  onModeChange: (mode: CameraMode) => void;
  onBurstCapture: () => void;
  isCapturing: boolean;
}

const MODE_CONFIGS = {
  photo: {
    name: "Photo",
    icon: Camera,
    description: "Zero shutter lag",
  },
  night: {
    name: "Night",
    icon: Moon,
    description: "Multi-frame",
  },
  longExposure: {
    name: "Long",
    icon: Timer,
    description: "Motion blur",
  },
} as const;

export function CameraModeSelector({
  currentMode,
  onModeChange,
  onBurstCapture,
  isCapturing,
}: CameraModeSelectorProps) {
  const modes = Object.keys(MODE_CONFIGS) as CameraMode[];
  const activeIndex = modes.indexOf(currentMode);

  const containerRef = useRef<HTMLDivElement>(null);
  const [centerOffset, setCenterOffset] = useState(0);

  const showZapButton = currentMode === "photo" || currentMode === "night";

  // Calculate center alignment offset
  useEffect(() => {
    if (!containerRef.current) return;

    const updateOffset = () => {
      const container = containerRef.current!;
      const containerRect = container.getBoundingClientRect();
      const containerWidth = containerRect.width;

      // When Zap button is not displayed (longExposure mode),
      // calculate center alignment using only the mode selector width
      if (!showZapButton) {
        // Mode selector width: 3 buttons + padding + gap
        const modeSelectorWidth = 3 * 40 + 8 + 0; // 3 buttons × 40px + 8px padding + 0px gap
        const offset = -modeSelectorWidth / 2;
        setCenterOffset(offset);
      } else {
        // When Zap button is displayed, center align using the entire container width
        const offset = -containerWidth / 2;
        setCenterOffset(offset);
      }
    };

    // Initial calculation
    updateOffset();

    // Monitor dynamic size changes with ResizeObserver
    const resizeObserver = new ResizeObserver(updateOffset);
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, [showZapButton]);

  return (
    <div
      className="camera-mode-selector absolute bottom-24 left-1/2 z-10"
      style={{
        transform: `translateX(${centerOffset}px)`,
      }}
    >
      <div ref={containerRef} className="flex items-center gap-3">
        {/* Mode selector with sliding background */}
        <div className="flex items-center bg-black/50 backdrop-blur rounded-full p-1 relative">
          {/* Sliding background */}
          <div
            className="mode-slider-bg absolute top-1 bottom-1 w-10 h-10 bg-white/40 rounded-full"
            style={{
              left: `${4 + activeIndex * 40}px`, // 4px padding + 40px per button
            }}
          />

          {modes.map((mode) => {
            const config = MODE_CONFIGS[mode];
            const Icon = config.icon;

            return (
              <button
                key={mode}
                onClick={() => onModeChange(mode)}
                className="w-10 h-10 rounded-full flex items-center justify-center relative z-10 text-white/70 hover:text-white"
              >
                <Icon size={18} />
              </button>
            );
          })}
        </div>

        {/* Independent Zap button */}
        <div
          className={`zap-button-container transition-all duration-300 ${
            showZapButton
              ? "opacity-100 scale-100"
              : "opacity-0 scale-90 pointer-events-none"
          }`}
        >
          <button
            onClick={onBurstCapture}
            disabled={isCapturing}
            className="control-button disabled:opacity-50"
          >
            <Zap size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
