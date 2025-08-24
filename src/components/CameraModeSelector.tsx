import {
  Camera,
  Moon,
  Timer,
  Zap,
  Settings,
  Grid3x3,
  Images,
  GripHorizontal,
} from "lucide-preact";
import { useRef, useEffect, useState } from "preact/hooks";
import type { CameraMode } from "../types/camera";

interface CameraModeSelectorProps {
  currentMode: CameraMode;
  onModeChange: (mode: CameraMode) => void;
  onBurstCapture: () => void;
  isCapturing: boolean;
  onOpenSettings?: () => void;
  showGrid?: boolean;
  onGridToggle?: () => void;
  onOpenGallery?: () => void;
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
  onOpenSettings,
  showGrid,
  onGridToggle,
  onOpenGallery,
}: CameraModeSelectorProps) {
  const modes = Object.keys(MODE_CONFIGS) as CameraMode[];
  const activeIndex = modes.indexOf(currentMode);

  const containerRef = useRef<HTMLDivElement>(null);
  const [centerOffset, setCenterOffset] = useState(0);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const showZapButton = currentMode === "photo" || currentMode === "night";

  // Calculate center alignment offset
  useEffect(() => {
    if (!containerRef.current) return;

    const updateOffset = () => {
      const container = containerRef.current!;
      const containerWidth = container.getBoundingClientRect().width;

      // Center align using the entire container width
      const offset = -containerWidth / 2;
      setCenterOffset(offset);
    };

    // Initial calculation
    updateOffset();

    // Monitor dynamic size changes with ResizeObserver
    const resizeObserver = new ResizeObserver(updateOffset);
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        closeMobileMenu();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile menu when screen size changes to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && showMobileMenu) {
        closeMobileMenu();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [showMobileMenu]);

  // Close mobile menu on initial render if screen is desktop size
  useEffect(() => {
    if (window.innerWidth >= 768 && showMobileMenu) {
      setShowMobileMenu(false);
      setIsClosing(false);
    }
  }, []);

  const toggleMobileMenu = () => {
    if (showMobileMenu) {
      closeMobileMenu();
    } else {
      setShowMobileMenu(true);
      setIsClosing(false);
    }
  };

  const closeMobileMenu = () => {
    if (!showMobileMenu || isClosing) return; // Do nothing if already closed

    setIsClosing(true);
    setTimeout(() => {
      setShowMobileMenu(false);
      setIsClosing(false);
    }, 200); // Hide after animation completes (0.2s)
  };

  return (
    <div
      className="camera-mode-selector absolute bottom-8 left-1/2"
      style={{
        transform: `translateX(${centerOffset}px)`,
        zIndex: 12,
        touchAction: "manipulation",
      }}
    >
      <div ref={containerRef} className="flex items-center gap-4">
        {/* Group 1: Camera Mode Selector */}
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
                style={{ touchAction: "manipulation" }}
              >
                <Icon size={18} />
              </button>
            );
          })}
        </div>

        {/* Group 2: Mobile Menu (GripHorizontal) and Desktop Icons */}
        <div className="relative">
          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <div className="manual-controls-group flex items-center bg-black/50 backdrop-blur rounded-full p-1">
              <button
                onClick={toggleMobileMenu}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white"
                title="Menu"
                style={{ touchAction: "manipulation" }}
              >
                <GripHorizontal size={18} />
              </button>
            </div>
          </div>

          {/* Desktop Icons */}
          <div className="hidden md:flex items-center bg-black/50 backdrop-blur rounded-full p-1 overflow-hidden">
            {/* Zap Button */}
            <div
              className={`zap-button-container ${
                showZapButton
                  ? "opacity-100 scale-100 w-10 ml-0"
                  : "opacity-0 scale-95 w-0 ml-0"
              }`}
            >
              <button
                onClick={onBurstCapture}
                disabled={isCapturing}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white disabled:opacity-50"
              >
                <Zap size={18} />
              </button>
            </div>

            {/* Manual Controls Button */}
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white"
                title="Manual Controls"
              >
                <Settings size={18} />
              </button>
            )}

            {/* Grid Button */}
            {onGridToggle && (
              <button
                onClick={() => onGridToggle()}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white ${
                  showGrid ? "bg-white/40" : ""
                }`}
                title="Toggle Grid"
              >
                <Grid3x3 size={18} />
              </button>
            )}

            {/* Gallery Button */}
            {onOpenGallery && (
              <button
                onClick={() => onOpenGallery()}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white"
                title="Open Gallery"
              >
                <Images size={18} />
              </button>
            )}
          </div>

          {/* Mobile Dropdown Menu */}
          {(showMobileMenu || isClosing) && (
            <div
              className={`mobile-menu-container absolute bottom-full right-0 mb-4 bg-black/50 backdrop-blur rounded-full p-1 z-20 transform -translate-y-1 ${
                isClosing ? "mobile-menu-closing" : ""
              }`}
            >
              {/* Zap Button */}
              {showZapButton && (
                <button
                  onClick={() => {
                    closeMobileMenu();
                    // Execute burst capture after closing menu
                    setTimeout(() => {
                      onBurstCapture();
                    }, 100);
                  }}
                  disabled={isCapturing}
                  className="mobile-menu-item size-10 flex items-center justify-center gap-3 rounded-full text-white/70 hover:text-white disabled:opacity-50"
                >
                  <Zap size={18} />
                </button>
              )}

              {/* Manual Controls Button */}
              {onOpenSettings && (
                <button
                  onClick={() => {
                    closeMobileMenu();
                    // Open Manual Controls after closing menu
                    setTimeout(() => {
                      onOpenSettings();
                    }, 100);
                  }}
                  className="mobile-menu-item size-10 flex items-center justify-center gap-3 rounded-full text-white/70 hover:text-white"
                >
                  <Settings size={18} />
                </button>
              )}

              {/* Grid Button */}
              {onGridToggle && (
                <button
                  onClick={() => {
                    closeMobileMenu();
                    // Toggle Grid after closing menu
                    setTimeout(() => {
                      onGridToggle();
                    }, 100);
                  }}
                  className={`mobile-menu-item size-10 flex items-center justify-center gap-3 rounded-full text-white/70 hover:text-white ${
                    showGrid ? "bg-white/20" : ""
                  }`}
                >
                  <Grid3x3 size={18} />
                </button>
              )}

              {/* Gallery Button */}
              {onOpenGallery && (
                <button
                  onClick={() => {
                    closeMobileMenu();
                    // Open Gallery after closing menu
                    setTimeout(() => {
                      onOpenGallery();
                    }, 100);
                  }}
                  className="mobile-menu-item size-10 flex items-center justify-center gap-3 rounded-full text-white/70 hover:text-white"
                >
                  <Images size={18} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
