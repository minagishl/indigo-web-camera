import { Settings, Grid3x3 } from "lucide-preact";
import { tv } from "tailwind-variants";

interface StatusBarProps {
  status: "Idle" | "Starting" | "Ready" | "Failed" | "Stopped";
  resolution: string;
  onSettingsClick: () => void;
  showGrid?: boolean;
  onGridToggle?: () => void;
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

export function StatusBar({
  status,
  resolution,
  onSettingsClick,
  showGrid = false,
  onGridToggle,
}: StatusBarProps) {
  return (
    <div className="status-bar">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-2 px-2 py-1 rounded text-xs bg-black/50 backdrop-blur">
            <div className={statusCircle({ status })} />
            {status}
          </span>
          <span className="px-2 py-1 rounded text-xs bg-black/50 backdrop-blur">
            {resolution}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onGridToggle && (
            <button
              onClick={onGridToggle}
              className={`control-button ${showGrid ? "bg-white/40" : ""}`}
            >
              <Grid3x3 size={16} />
            </button>
          )}
          <button onClick={onSettingsClick} className="control-button">
            <Settings size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
