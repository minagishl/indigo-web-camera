import { tv } from "tailwind-variants";
import { useDeviceOrientation } from "../hooks/useDeviceOrientation";

interface StatusBarProps {
  status: "Idle" | "Starting" | "Ready" | "Failed" | "Stopped";
  resolution: string;
}

const statusCircle = tv({
  base: "w-2 h-2 rounded-full",
  variants: {
    status: {
      Ready: "bg-green-600/80",
      Failed: "bg-red-600/80",
      Idle: "bg-gray-600/80",
      Starting: "bg-yellow-600/80",
      Stopped: "bg-gray-600/80",
    },
  },
});

export function StatusBar({ status, resolution }: StatusBarProps) {
  const deviceOrientation = useDeviceOrientation();

  const getOrientationText = () => {
    const orientation = deviceOrientation.getPhotoOrientation();
    switch (orientation) {
      case 0:
        return "0°";
      case 90:
        return "90°";
      case 180:
        return "180°";
      case 270:
        return "270°";
      default:
        return `${orientation}°`;
    }
  };

  return (
    <div className="status-bar">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-black/50 backdrop-blur rounded-full p-1 h-12">
            <span className="flex items-center gap-2 px-3 text-xs text-white/70">
              <div className={statusCircle({ status })} />
              {status}
            </span>
            <div className="w-px h-4 bg-white/30 mx-1"></div>
            <span className="px-3 text-xs text-white/70">{resolution}</span>
            {deviceOrientation.isOrientationAvailable() && (
              <>
                <div className="w-px h-4 bg-white/30 mx-1"></div>
                <span className="px-3 text-xs text-white/70">
                  📱 {getOrientationText()}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Settings button removed */}
        </div>
      </div>
    </div>
  );
}
