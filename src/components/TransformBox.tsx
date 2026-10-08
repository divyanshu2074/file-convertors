import React, { useRef, useState, useEffect } from 'react';
import { Trash2, Move } from 'lucide-react';

export interface BoxRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TransformBoxProps {
  rect: BoxRect;
  onChange: (newRect: BoxRect) => void;
  onDelete?: () => void;
  boundsWidth?: number;
  boundsHeight?: number;
  children: React.ReactNode;
  isSelected?: boolean;
  onSelect?: () => void;
  minWidth?: number;
  minHeight?: number;
  aspectRatio?: number;
  lockAspectRatio?: boolean;
  label?: string;
  zoom?: number;
}

type HandleType = 'nw' | 'ne' | 'se' | 'sw' | 'move' | null;

export const TransformBox: React.FC<TransformBoxProps> = ({
  rect,
  onChange,
  onDelete,
  children,
  isSelected = true,
  onSelect,
  minWidth = 30,
  minHeight = 20,
  lockAspectRatio = false,
  label,
  zoom = 1.0,
}) => {
  const [activeHandle, setActiveHandle] = useState<HandleType>(null);
  const dragStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    rect: BoxRect;
  } | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const handlePointerDown = (e: React.PointerEvent, handle: HandleType) => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

    if (onSelect) onSelect();

    setActiveHandle(handle);
    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      rect: { ...rect },
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeHandle || !dragStartRef.current) return;
    e.stopPropagation();

    const clientX = e.clientX;
    const clientY = e.clientY;

    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }

    rafIdRef.current = requestAnimationFrame(() => {
      if (!dragStartRef.current) return;
      // Crucial: divide pointer delta by zoom factor so movement matches the cursor 1:1 regardless of zoom level
      const currentZoom = zoom > 0 ? zoom : 1.0;
      const dx = (clientX - dragStartRef.current.pointerX) / currentZoom;
      const dy = (clientY - dragStartRef.current.pointerY) / currentZoom;
      const initial = dragStartRef.current.rect;

      if (activeHandle === 'move') {
        const nextX = Math.max(0, initial.x + dx);
        const nextY = Math.max(0, initial.y + dy);
        onChange({
          ...initial,
          x: Math.round(nextX),
          y: Math.round(nextY),
        });
        return;
      }

      let newX = initial.x;
      let newY = initial.y;
      let newW = initial.width;
      let newH = initial.height;

      if (activeHandle === 'se') {
        newW = Math.max(minWidth, initial.width + dx);
        newH = lockAspectRatio ? newW * (initial.height / initial.width) : Math.max(minHeight, initial.height + dy);
      } else if (activeHandle === 'sw') {
        const potentialW = Math.max(minWidth, initial.width - dx);
        newX = initial.x + (initial.width - potentialW);
        newW = potentialW;
        newH = lockAspectRatio ? newW * (initial.height / initial.width) : Math.max(minHeight, initial.height + dy);
      } else if (activeHandle === 'ne') {
        newW = Math.max(minWidth, initial.width + dx);
        const potentialH = Math.max(minHeight, initial.height - dy);
        newY = initial.y + (initial.height - potentialH);
        newH = lockAspectRatio ? newW * (initial.height / initial.width) : potentialH;
      } else if (activeHandle === 'nw') {
        const potentialW = Math.max(minWidth, initial.width - dx);
        const potentialH = Math.max(minHeight, initial.height - dy);
        newX = initial.x + (initial.width - potentialW);
        newY = initial.y + (initial.height - potentialH);
        newW = potentialW;
        newH = lockAspectRatio ? newW * (initial.height / initial.width) : potentialH;
      }

      onChange({
        x: Math.round(newX),
        y: Math.round(newY),
        width: Math.round(newW),
        height: Math.round(newH),
      });
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (activeHandle) {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      try {
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {
        // ignore
      }
      setActiveHandle(null);
      dragStartRef.current = null;
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: `${rect.x}px`,
        top: `${rect.y}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (onSelect) onSelect();
      }}
      className={`group select-none ${
        isSelected
          ? 'ring-2 ring-indigo-500 ring-offset-1 ring-offset-transparent cursor-move'
          : 'hover:ring-1 hover:ring-indigo-300 cursor-pointer'
      }`}
      onPointerDown={(e) => handlePointerDown(e, 'move')}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Target Content */}
      <div className="w-full h-full pointer-events-none overflow-hidden flex items-center justify-center">
        {children}
      </div>

      {isSelected && (
        <>
          {/* Top Info Bar / Delete Handle */}
          <div className="absolute -top-7 left-0 flex items-center gap-1.5 z-20 pointer-events-auto">
            {label && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-600 text-white shadow-xs">
                {label}
              </span>
            )}
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-neutral-900/90 text-neutral-300 shadow-xs">
              {Math.round(rect.width)} × {Math.round(rect.height)}
            </span>
            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="p-1 rounded bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors"
                title="Delete item"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Center Move Hint icon */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-40 transition-opacity">
            <Move className="w-5 h-5 text-indigo-700" />
          </div>

          {/* 4 Corner Resize Handles */}
          <div
            onPointerDown={(e) => handlePointerDown(e, 'nw')}
            className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-full cursor-nwse-resize shadow-xs z-30"
          />
          <div
            onPointerDown={(e) => handlePointerDown(e, 'ne')}
            className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-full cursor-nesw-resize shadow-xs z-30"
          />
          <div
            onPointerDown={(e) => handlePointerDown(e, 'se')}
            className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-full cursor-nwse-resize shadow-xs z-30"
          />
          <div
            onPointerDown={(e) => handlePointerDown(e, 'sw')}
            className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-full cursor-nesw-resize shadow-xs z-30"
          />
        </>
      )}
    </div>
  );
};
