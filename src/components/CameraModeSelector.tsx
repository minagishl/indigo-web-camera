import { Camera, Moon, Timer } from "lucide-preact";
import type { CameraMode } from "../types/camera";

interface CameraModeSelectorProps {
  currentMode: CameraMode;
  onModeChange: (mode: CameraMode) => void;
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
}: CameraModeSelectorProps) {
  return (
    <div className="camera-mode-selector absolute bottom-24 left-1/2 transform -translate-x-1/2 z-10">
      <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full p-2">
        {(Object.keys(MODE_CONFIGS) as CameraMode[]).map((mode) => {
          const config = MODE_CONFIGS[mode];
          const Icon = config.icon;
          const isActive = currentMode === mode;

          return (
            <button
              key={mode}
              onClick={() => onModeChange(mode)}
              className={`
                flex flex-col items-center gap-1 px-4 py-2 rounded-full transition-all
                ${
                  isActive
                    ? "bg-white text-black"
                    : "text-white hover:bg-white/20"
                }
              `}
            >
              <Icon size={20} />
              <div className="text-xs font-medium">{config.name}</div>
              <div className="text-xs opacity-70">{config.description}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
