import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Minimize2, RotateCcw, Hand } from 'lucide-react';

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPanMode, setIsPanMode] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Pan dragging state
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number }>({
    x: 0,
    y: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });

  const handleZoomIn = () => setZoom((z) => Math.min(3.0, Math.round((z + 0.15) * 100) / 100));
  const handleZoomOut = () => setZoom((z) => Math.max(0.4, Math.round((z - 0.15) * 100) / 100));
  const handleResetZoom = () => {
    setZoom(1.0);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
    }
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

  // Mouse wheel zoom when Ctrl/Cmd is pressed
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.1 : -0.1;
      setZoom((z) => Math.min(3.0, Math.max(0.4, Math.round((z + delta) * 100) / 100)));
    }
  };

  // Hand / Pan Tool dragging logic
  const handlePanMouseDown = (e: React.PointerEvent) => {
    if (!isPanMode || !scrollContainerRef.current) return;
    isPanningRef.current = true;
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: scrollContainerRef.current.scrollLeft,
      scrollTop: scrollContainerRef.current.scrollTop,
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePanMouseMove = (e: React.PointerEvent) => {
    if (!isPanningRef.current || !scrollContainerRef.current) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    scrollContainerRef.current.scrollLeft = panStartRef.current.scrollLeft - dx;
    scrollContainerRef.current.scrollTop = panStartRef.current.scrollTop - dy;
  };

  const handlePanMouseUp = (e: React.PointerEvent) => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      try {
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col rounded-2xl border border-neutral-300 shadow-xs bg-neutral-900/5 dark:bg-neutral-950/80 overflow-hidden transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none bg-neutral-950 border-none' : ''
      } ${className}`}
    >
      {/* Top Floating Control Bar */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-1 p-1 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 shadow-md">
        {/* Pan Hand Toggle */}
        <button
          type="button"
          onClick={() => setIsPanMode(!isPanMode)}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            isPanMode
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
          title={isPanMode ? 'Pan Mode Active (Drag to Pan Canvas)' : 'Enable Pan / Hand Tool'}
        >
          <Hand className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-700 my-auto mx-0.5" />

        <button
          type="button"
          onClick={handleZoomOut}
          disabled={zoom <= 0.4}
          className="p-1.5 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 transition-colors cursor-pointer"
          title="Zoom Out (or Ctrl + Wheel)"
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
          title="Zoom In (or Ctrl + Wheel)"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={handleResetZoom}
          className="p-1.5 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ml-0.5 border-l border-neutral-200 dark:border-neutral-700 cursor-pointer"
          title="Reset Zoom & Scroll"
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

      {/* Scrollable Viewport Canvas Area */}
      <div
        ref={scrollContainerRef}
        onWheel={handleWheel}
        onPointerDown={handlePanMouseDown}
        onPointerMove={handlePanMouseMove}
        onPointerUp={handlePanMouseUp}
        onPointerCancel={handlePanMouseUp}
        style={{
          maxHeight: isFullscreen ? '100vh' : maxHeight,
          cursor: isPanMode ? (isPanningRef.current ? 'grabbing' : 'grab') : 'default',
        }}
        className="flex-1 w-full overflow-auto p-8 sm:p-12 select-none touch-pan-x touch-pan-y"
      >
        {/* Center alignment wrapper that expands naturally when scaled */}
        <div className="min-w-full min-h-full flex items-center justify-center p-4">
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
              transition: isPanningRef.current ? 'none' : 'transform 0.12s ease-out',
            }}
            className="relative flex items-center justify-center shrink-0"
          >
            {children(zoom)}
          </div>
        </div>
      </div>
    </div>
  );
};

