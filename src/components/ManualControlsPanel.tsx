import { useCallback } from "preact/hooks";
import {
  Settings,
  RotateCcw,
  Eye,
  Sun,
  Thermometer,
  Aperture,
} from "lucide-preact";
import type { ManualControls } from "../types/camera";

interface ManualControlsPanelProps {
  controls: ManualControls;
  isManualMode: boolean;
  controlRanges: {
    iso: { min: number; max: number; step: number } | null;
    focus: { min: number; max: number; step: number } | null;
    exposureCompensation: { min: number; max: number; step: number } | null;
    whiteBalance: { min: number; max: number; step: number } | null;
  } | null;
  onISO: (iso: number) => void;
  onShutterSpeed: (speed: number) => void;
  onFocus: (focus: number) => void;
  onExposureCompensation: (compensation: number) => void;
  onWhiteBalance: (temperature: number, tint: number) => void;
  onResetToAuto: () => void;
  onToggleManual: (enabled: boolean) => void;
}

export function ManualControlsPanel({
  controls,
  isManualMode,
  controlRanges,
  onISO,
  onShutterSpeed,
  onFocus,
  onExposureCompensation,
  onWhiteBalance,
  onResetToAuto,
  onToggleManual,
}: ManualControlsPanelProps) {
  const handleSliderChange = useCallback(
    (type: string, value: number) => {
      switch (type) {
        case "iso":
          onISO(value);
          break;
        case "shutterSpeed":
          onShutterSpeed(value);
          break;
        case "focus":
          onFocus(value);
          break;
        case "exposureCompensation":
          onExposureCompensation(value);
          break;
        case "whiteBalanceTemp":
          onWhiteBalance(value, controls.whiteBalance.tint);
          break;
        case "whiteBalanceTint":
          onWhiteBalance(controls.whiteBalance.temperature, value);
          break;
      }
    },
    [
      controls,
      onISO,
      onShutterSpeed,
      onFocus,
      onExposureCompensation,
      onWhiteBalance,
    ]
  );

  const formatShutterSpeed = (speed: number) => {
    if (speed >= 1) return `${speed}s`;
    return `1/${Math.round(1 / speed)}`;
  };

  const formatExposureCompensation = (ev: number) => {
    return `${ev > 0 ? "+" : ""}${ev.toFixed(1)} EV`;
  };

  if (!isManualMode) {
    return (
      <div className="manual-controls-toggle absolute bottom-32 right-4 z-10">
        <button
          onClick={() => onToggleManual(true)}
          className="control-button"
          title="Manual Controls"
        >
          <Settings size={20} />
        </button>
      </div>
    );
  }

  return (
    <div className="manual-controls-panel absolute bottom-32 right-4 z-10 bg-black/80 backdrop-blur-sm rounded-2xl p-4 max-w-xs">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Manual</h3>
          <div className="flex gap-2">
            <button
              onClick={onResetToAuto}
              className="control-button"
              title="Reset to Auto"
            >
              <RotateCcw size={16} />
            </button>
            <button
              onClick={() => onToggleManual(false)}
              className="control-button"
              title="Close Manual Controls"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>

        {/* ISO Control */}
        {controlRanges?.iso && (
          <div className="control-group">
            <div className="flex items-center gap-2 mb-2">
              <Aperture size={16} className="text-white/70" />
              <label className="text-sm font-medium text-white">
                ISO: <span className="text-white/70">{controls.iso}</span>
              </label>
            </div>
            <input
              type="range"
              min={controlRanges.iso.min}
              max={controlRanges.iso.max}
              step={controlRanges.iso.step}
              value={controls.iso}
              onChange={(e) =>
                handleSliderChange("iso", Number(e.currentTarget.value))
              }
              className="w-full"
            />
          </div>
        )}

        {/* Shutter Speed Control */}
        <div className="control-group">
          <div className="flex items-center gap-2 mb-2">
            <Eye size={16} className="text-white/70" />
            <label className="text-sm font-medium text-white">
              Shutter:{" "}
              <span className="text-white/70">
                {formatShutterSpeed(controls.shutterSpeed)}
              </span>
            </label>
          </div>
          <input
            type="range"
            min={1 / 4000}
            max={30}
            step={0.001}
            value={controls.shutterSpeed}
            onChange={(e) =>
              handleSliderChange("shutterSpeed", Number(e.currentTarget.value))
            }
            className="w-full"
          />
        </div>

        {/* Focus Control */}
        {controlRanges?.focus && (
          <div className="control-group">
            <div className="flex items-center gap-2 mb-2">
              <Eye size={16} className="text-white/70" />
              <label className="text-sm font-medium text-white">
                Focus:{" "}
                <span className="text-white/70">
                  {(controls.focus * 100).toFixed(0)}%
                </span>
              </label>
            </div>
            <input
              type="range"
              min={controlRanges.focus.min}
              max={controlRanges.focus.max}
              step={controlRanges.focus.step}
              value={controls.focus}
              onChange={(e) =>
                handleSliderChange("focus", Number(e.currentTarget.value))
              }
              className="w-full"
            />
          </div>
        )}

        {/* Exposure Compensation */}
        {controlRanges?.exposureCompensation && (
          <div className="control-group">
            <div className="flex items-center gap-2 mb-2">
              <Sun size={16} className="text-white/70" />
              <label className="text-sm font-medium text-white">
                Exposure:{" "}
                <span className="text-white/70">
                  {formatExposureCompensation(controls.exposureCompensation)}
                </span>
              </label>
            </div>
            <input
              type="range"
              min={controlRanges.exposureCompensation.min}
              max={controlRanges.exposureCompensation.max}
              step={controlRanges.exposureCompensation.step}
              value={controls.exposureCompensation}
              onChange={(e) =>
                handleSliderChange(
                  "exposureCompensation",
                  Number(e.currentTarget.value)
                )
              }
              className="w-full"
            />
          </div>
        )}

        {/* White Balance */}
        {controlRanges?.whiteBalance && (
          <div className="control-group">
            <div className="flex items-center gap-2 mb-2">
              <Thermometer size={16} className="text-white/70" />
              <label className="text-sm font-medium text-white">
                WB:{" "}
                <span className="text-white/70">
                  {controls.whiteBalance.temperature}K
                </span>
              </label>
            </div>
            <input
              type="range"
              min={controlRanges.whiteBalance.min}
              max={controlRanges.whiteBalance.max}
              step={controlRanges.whiteBalance.step}
              value={controls.whiteBalance.temperature}
              onChange={(e) =>
                handleSliderChange(
                  "whiteBalanceTemp",
                  Number(e.currentTarget.value)
                )
              }
              className="w-full"
            />
            <div className="mt-2">
              <label className="text-sm font-medium text-white">
                Tint:{" "}
                <span className="text-white/70">
                  {controls.whiteBalance.tint.toFixed(2)}
                </span>
              </label>
              <input
                type="range"
                min={-1}
                max={1}
                step={0.01}
                value={controls.whiteBalance.tint}
                onChange={(e) =>
                  handleSliderChange(
                    "whiteBalanceTint",
                    Number(e.currentTarget.value)
                  )
                }
                className="w-full"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
