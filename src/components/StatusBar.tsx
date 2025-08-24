import { tv } from "tailwind-variants";

export interface StatusBarProps {
  status: "Idle" | "Starting" | "Ready" | "Failed" | "Stopped";
  resolution: string;
  onResolutionClick?: () => void;
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
  onResolutionClick,
}: StatusBarProps) {
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
            <button
              className="px-3 text-xs text-white/70 hover:text-white transition-colors cursor-pointer"
              onClick={onResolutionClick}
              title="Click to toggle aspect ratio"
            >
              {resolution}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Settings button removed */}
        </div>
      </div>
    </div>
  );
}
