import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
  Hand,
  Move,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface InteractivePreviewViewportProps {
  children: (zoom: number) => React.ReactNode;
  maxHeight?: string;
  className?: string;
  initialZoom?: number;
}

export const InteractivePreviewViewport: React.FC<InteractivePreviewViewportProps> = ({
  children,
  maxHeight = '65vh',
  className = '',
  initialZoom = 1.0,
}) => {
  const [zoom, setZoom] = useState(initialZoom);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPanMode, setIsPanMode] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const panStartRef = useRef<{ clientX: number; clientY: number; panX: number; panY: number }>({
    clientX: 0,
    clientY: 0,
    panX: 0,
    panY: 0,
  });

  // Maximum allowed pan distance based on zoom
  const maxPanRange = Math.max(800, Math.round(1200 * zoom));

  const clampPan = useCallback(
    (x: number, y: number) => {
      return {
        x: Math.max(-maxPanRange, Math.min(maxPanRange, x)),
        y: Math.max(-maxPanRange, Math.min(maxPanRange, y)),
      };
    },
    [maxPanRange]
  );

  const handleZoomIn = () =>
    setZoom((z) => Math.min(3.0, Math.round((z + 0.15) * 100) / 100));

  const handleZoomOut = () =>
    setZoom((z) => Math.max(0.4, Math.round((z - 0.15) * 100) / 100));

  const handleReset = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn('Fullscreen request failed:', err);
      setIsFullscreen((f) => !f);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Spacebar pan mode detection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' &&
        !isSpacePressed &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        setIsSpacePressed(true);
      } else if (
        (e.key === '+' || e.key === '=') &&
        (e.ctrlKey || e.metaKey) &&
        containerRef.current?.contains(document.activeElement)
      ) {
        e.preventDefault();
        handleZoomIn();
      } else if (
        (e.key === '-' || e.key === '_') &&
        (e.ctrlKey || e.metaKey) &&
        containerRef.current?.contains(document.activeElement)
      ) {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleReset();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isSpacePressed]);

  // Non-passive native wheel listener:
  // Prevents browser webpage zoom on Ctrl+Wheel,
  // Prevents background page scrolling on normal wheel,
  // and smoothly scrolls/zooms the document preview.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      // 100% prevent browser webpage zoom and prevent outer window scrolling
      e.preventDefault();
      e.stopPropagation();

      if (e.ctrlKey || e.metaKey) {
        // Ctrl + Wheel: Zoom Document
        const delta = e.deltaY < 0 ? 0.12 : -0.12;
        setZoom((z) => Math.min(3.0, Math.max(0.4, Math.round((z + delta) * 100) / 100)));
      } else if (e.shiftKey) {
        // Shift + Wheel: Horizontal Scroll
        setPan((prev) => {
          const next = clampPan(prev.x - e.deltaY, prev.y);
          return next;
        });
      } else {
        // Normal Wheel: Vertical Scroll (and horizontal trackpad delta if present)
        setPan((prev) => {
          const nextX = prev.x - (e.deltaX || 0);
          const nextY = prev.y - e.deltaY;
          return clampPan(nextX, nextY);
        });
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
    };
  }, [clampPan]);

  // Pointer-based Pan Handling
  const handlePointerDown = (e: React.PointerEvent) => {
    const isMiddleClick = e.button === 1;
    const isPanTrigger = isPanMode || isSpacePressed || isMiddleClick;

    if (!isPanTrigger) return;

    e.preventDefault();
    e.stopPropagation();

    setIsPanning(true);
    panStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };

    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPanning) return;
    e.preventDefault();
    e.stopPropagation();

    const dx = e.clientX - panStartRef.current.clientX;
    const dy = e.clientY - panStartRef.current.clientY;

    setPan(clampPan(panStartRef.current.panX + dx, panStartRef.current.panY + dy));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isPanning) {
      setIsPanning(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  // Custom Draggable Scrollbar calculations
  const verticalFraction = Math.max(0, Math.min(1, (pan.y + maxPanRange) / (2 * maxPanRange)));
  const horizontalFraction = Math.max(0, Math.min(1, (pan.x + maxPanRange) / (2 * maxPanRange)));

  // Handle Dragging Vertical Scrollbar Thumb
  const handleVScrollThumbDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    const track = e.currentTarget.parentElement;
    if (!track) return;

    const trackRect = track.getBoundingClientRect();
    const startY = e.clientY;
    const initialPanY = pan.y;

    const onMove = (moveEv: PointerEvent) => {
      const deltaY = moveEv.clientY - startY;
      const moveRatio = deltaY / Math.max(1, trackRect.height);
      const newPanY = initialPanY + moveRatio * (2 * maxPanRange);
      setPan((p) => clampPan(p.x, newPanY));
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // Handle Dragging Horizontal Scrollbar Thumb
  const handleHScrollThumbDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    const track = e.currentTarget.parentElement;
    if (!track) return;

    const trackRect = track.getBoundingClientRect();
    const startX = e.clientX;
    const initialPanX = pan.x;

    const onMove = (moveEv: PointerEvent) => {
      const deltaX = moveEv.clientX - startX;
      const moveRatio = deltaX / Math.max(1, trackRect.width);
      const newPanX = initialPanX + moveRatio * (2 * maxPanRange);
      setPan((p) => clampPan(newPanX, p.y));
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // Click on Track jumps scroll
  const handleVTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const ratio = Math.max(0, Math.min(1, clickY / rect.height));
    const targetPanY = ratio * (2 * maxPanRange) - maxPanRange;
    setPan((p) => clampPan(p.x, targetPanY));
  };

  const handleHTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetPanX = ratio * (2 * maxPanRange) - maxPanRange;
    setPan((p) => clampPan(targetPanX, p.y));
  };

  const showPanOverlay = isPanMode || isSpacePressed;

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col rounded-2xl border border-neutral-300 shadow-xs bg-neutral-100/70 dark:bg-neutral-950/80 overflow-hidden select-none transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none bg-neutral-950 border-none' : ''
      } ${className}`}
    >
      {/* Top Floating Control Bar */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-1 p-1 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md rounded-xl border border-neutral-200/90 dark:border-neutral-700/90 shadow-md">
        {/* Pan Hand Toggle */}
        <button
          type="button"
          onClick={() => setIsPanMode(!isPanMode)}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-medium ${
            isPanMode
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
          title={isPanMode ? 'Pan Mode Active (Drag to Pan)' : 'Pan / Hand Tool (or Hold Space)'}
        >
          <Hand className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-[11px]">{isPanMode ? 'Pan On' : 'Pan'}</span>
        </button>

        <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-700 my-auto mx-0.5" />

        <button
          type="button"
          onClick={handleZoomOut}
          disabled={zoom <= 0.4}
          className="p-1.5 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 transition-colors cursor-pointer"
          title="Zoom Out (or Ctrl + Wheel Down)"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <span className="text-[11px] font-mono font-medium text-neutral-700 dark:text-neutral-300 px-1.5 min-w-[42px] text-center select-none">
          {Math.round(zoom * 100)}%
        </span>

        <button
          type="button"
          onClick={handleZoomIn}
          disabled={zoom >= 3.0}
          className="p-1.5 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 transition-colors cursor-pointer"
          title="Zoom In (or Ctrl + Wheel Up)"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={handleReset}
          className="p-1.5 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ml-0.5 border-l border-neutral-200 dark:border-neutral-700 cursor-pointer"
          title="Reset Zoom (100%) & Center View"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={toggleFullscreen}
          className="p-1.5 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ml-0.5 cursor-pointer"
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen View'}
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Main Interactive Viewport Canvas */}
      <div
        ref={viewportRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          maxHeight: isFullscreen ? '100vh' : maxHeight,
          cursor: showPanOverlay ? (isPanning ? 'grabbing' : 'grab') : 'default',
        }}
        className="relative flex-1 w-full overflow-hidden flex items-center justify-center p-2 sm:p-8 touch-none"
      >
        {/* Scaled & Translated Document Container */}
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isPanning ? 'none' : 'transform 0.08s ease-out',
          }}
          className="relative flex items-center justify-center shrink-0 will-change-transform"
        >
          {children(zoom)}

          {/* Transparent Pan Drag Overlay (Active during Pan Mode or Space pressed) */}
          {showPanOverlay && (
            <div
              className={`absolute inset-0 z-40 ${
                isPanning ? 'cursor-grabbing' : 'cursor-grab'
              } bg-transparent`}
              onPointerDown={handlePointerDown}
              title="Pan Tool Active (Drag to Pan)"
            />
          )}
        </div>

        {/* Functional Custom Draggable Vertical Scrollbar */}
        <div
          onClick={handleVTrackClick}
          className="absolute right-1.5 top-14 bottom-6 w-3 bg-neutral-200/50 hover:bg-neutral-200/80 dark:bg-neutral-800/40 dark:hover:bg-neutral-800/80 rounded-full transition-colors cursor-pointer z-20 group"
        >
          <div
            onPointerDown={handleVScrollThumbDrag}
            style={{
              top: `${verticalFraction * 78}%`,
            }}
            className="absolute left-0.5 right-0.5 h-12 rounded-full bg-neutral-400/70 group-hover:bg-neutral-600 dark:bg-neutral-500/70 dark:group-hover:bg-neutral-300 transition-colors cursor-grab active:cursor-grabbing shadow-xs"
            title="Drag to scroll vertically"
          />
        </div>

        {/* Functional Custom Draggable Horizontal Scrollbar */}
        <div
          onClick={handleHTrackClick}
          className="absolute left-6 right-12 bottom-1.5 h-3 bg-neutral-200/50 hover:bg-neutral-200/80 dark:bg-neutral-800/40 dark:hover:bg-neutral-800/80 rounded-full transition-colors cursor-pointer z-20 group"
        >
          <div
            onPointerDown={handleHScrollThumbDrag}
            style={{
              left: `${horizontalFraction * 80}%`,
            }}
            className="absolute top-0.5 bottom-0.5 w-14 rounded-full bg-neutral-400/70 group-hover:bg-neutral-600 dark:bg-neutral-500/70 dark:group-hover:bg-neutral-300 transition-colors cursor-grab active:cursor-grabbing shadow-xs"
            title="Drag to scroll horizontally"
          />
        </div>
      </div>

      {/* Helpful bottom status indicator */}
      <div className="px-3 sm:px-4 py-1.5 bg-neutral-200/40 dark:bg-neutral-900/40 border-t border-neutral-200/50 text-[10px] text-neutral-500 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 truncate">
          <Move className="w-3 h-3 text-neutral-400 shrink-0" />
          <span className="hidden sm:inline">Wheel: Scroll • Ctrl + Wheel: Zoom • Hold Space or Toggle Pan to Drag</span>
          <span className="sm:hidden">Drag to pan • Use + / - to zoom</span>
        </span>
        {(pan.x !== 0 || pan.y !== 0 || zoom !== 1.0) && (
          <button
            onClick={handleReset}
            className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
          >
            Center & Reset View
          </button>
        )}
      </div>
    </div>
  );
};
