import { Settings, Grid3x3 } from "lucide-preact";

interface StatusBarProps {
  status: string;
  resolution: string;
  onSettingsClick: () => void;
  showGrid?: boolean;
  onGridToggle?: () => void;
}

export function StatusBar({
  status,
  resolution,
  onSettingsClick,
  showGrid = false,
  onGridToggle,
}: StatusBarProps) {
  const getStatusColor = (status: string) => {
    if (status === "Ready") return "bg-green-600/80";
    if (status === "Failed") return "bg-red-600/80";
    return "bg-black/50";
  };

  return (
    <div className="status-bar">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded-full text-sm backdrop-blur ${getStatusColor(
              status
            )}`}
          >
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
              <Grid3x3 size={20} />
            </button>
          )}
          <button onClick={onSettingsClick} className="control-button">
            <Settings size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}
