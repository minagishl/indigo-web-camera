import { X } from "lucide-preact";

interface SettingsPanelProps {
  devices: MediaDeviceInfo[];
  burstCount: number;
  jpegQuality: number;
  preferMax: boolean;
  onBurstCountChange: (count: number) => void;
  onJpegQualityChange: (quality: number) => void;
  onPreferMaxChange: (preferMax: boolean) => void;
  onStartCamera: () => void;
  onStopCamera: () => void;
  onSwitchCamera: () => void;
  onDeviceChange: (deviceId: string) => void;
  onClose: () => void;
}

export function SettingsPanel({
  devices,
  burstCount,
  jpegQuality,
  preferMax,
  onBurstCountChange,
  onJpegQualityChange,
  onPreferMaxChange,
  onStartCamera,
  onStopCamera,
  onSwitchCamera,
  onDeviceChange,
  onClose,
}: SettingsPanelProps) {
  return (
    <div className="settings-panel">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Settings</h3>
          <button onClick={onClose} className="control-button">
            <X size={20} />
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Camera</label>
          <div className="flex gap-2 mb-3">
            <button
              onClick={onStartCamera}
              className="px-4 py-2 rounded-lg bg-white text-black font-medium"
            >
              Start
            </button>
            <button
              onClick={onSwitchCamera}
              className="px-4 py-2 rounded-lg bg-white/20 text-white border border-white/30"
            >
              Switch
            </button>
            <button
              onClick={onStopCamera}
              className="px-4 py-2 rounded-lg bg-white/20 text-white border border-white/30"
            >
              Stop
            </button>
          </div>
          <select
            onChange={(e) => onDeviceChange(e.currentTarget.value)}
            className="w-full px-3 py-2 rounded-lg bg-white/10 text-white border border-white/20"
            disabled={devices.length === 0}
          >
            <option value="">Select device...</option>
            {devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Burst Count: <span className="text-white/70">{burstCount}</span>
          </label>
          <input
            type="range"
            min="1"
            max="16"
            step="1"
            value={burstCount}
            onChange={(e) => onBurstCountChange(Number(e.currentTarget.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            JPEG Quality:{" "}
            <span className="text-white/70">{jpegQuality.toFixed(2)}</span>
          </label>
          <input
            type="range"
            min="0.6"
            max="1"
            step="0.01"
            value={jpegQuality}
            onChange={(e) => onJpegQualityChange(Number(e.currentTarget.value))}
            className="w-full"
          />
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={preferMax}
            onChange={(e) => onPreferMaxChange(e.currentTarget.checked)}
            className="rounded"
          />
          <span className="text-sm">Request highest resolution</span>
        </label>
      </div>
    </div>
  );
}
