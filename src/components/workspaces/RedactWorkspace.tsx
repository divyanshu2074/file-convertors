import React, { useState, useEffect, useRef } from 'react';
import {
  EyeOff,
  Download,
  Check,
  ChevronLeft,
  ChevronRight,
  MousePointerClick,
  Type,
  Square,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { renderPdfPage } from '../../lib/pdfEngine';
import { downloadUint8Array } from '../../lib/downloadHelper';
import { InteractivePreviewViewport } from '../InteractivePreviewViewport';
import { TransformBox, BoxRect } from '../TransformBox';
import {
  extractPageTextTokens,
  mergeTextTokensIntoBoxes,
  applyShapesToPdf,
  CanvasShape,
  TextToken,
  CoordinateTransformer,
  NormalizedRect,
} from '../../lib/custom-canvas';
import confetti from 'canvas-confetti';

interface RedactWorkspaceProps {
  pdfBuffer: ArrayBuffer;
  fileName: string;
}

export const RedactWorkspace: React.FC<RedactWorkspaceProps> = ({ pdfBuffer, fileName }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pagePreviewUrl, setPagePreviewUrl] = useState<string>('');
  const [pageDims, setPageDims] = useState({ width: 595, height: 842 });
  const [redactions, setRedactions] = useState<CanvasShape[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);

  // Redaction Mode: 'draw' | 'text-select'
  const [redactMode, setRedactMode] = useState<'draw' | 'text-select'>('draw');

  // Text Selection tokens
  const [tokens, setTokens] = useState<TextToken[]>([]);
  const [selectedTokenIds, setSelectedTokenIds] = useState<Set<string>>(new Set());
  const [isSelectingText, setIsSelectingText] = useState(false);

  // Drag-to-draw state
  const [isDrawingRect, setIsDrawingRect] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [currentDragRect, setCurrentDragRect] = useState<BoxRect | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Render Page Preview
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { canvas, width, height } = await renderPdfPage(pdfBuffer, currentPage, 1.2);
        if (mounted) {
          setPagePreviewUrl(canvas.toDataURL('image/jpeg', 0.95));
          setPageDims({ width, height });
        }
      } catch (err) {
        console.error(err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [pdfBuffer, currentPage]);

  // Load Text Tokens for Current Page
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await extractPageTextTokens(pdfBuffer, currentPage);
        if (mounted) {
          setTokens(res.tokens);
          setSelectedTokenIds(new Set());
        }
      } catch (err) {
        console.warn('Could not extract text tokens for page:', err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [pdfBuffer, currentPage]);

  // Handle Drag-to-Draw Redaction Box
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (redactMode === 'text-select') return;
    if (!containerRef.current) return;

    // Check if clicked directly on an existing handle
    if ((e.target as HTMLElement).closest('.group.select-none')) {
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const startX = Math.round(e.clientX - rect.left);
    const startY = Math.round(e.clientY - rect.top);

    setIsDrawingRect(true);
    setDragStart({ x: startX, y: startY });
    setCurrentDragRect({ x: startX, y: startY, width: 0, height: 0 });
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawingRect || !dragStart || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const currX = Math.round(e.clientX - rect.left);
    const currY = Math.round(e.clientY - rect.top);

    const x = Math.min(dragStart.x, currX);
    const y = Math.min(dragStart.y, currY);
    const width = Math.abs(currX - dragStart.x);
    const height = Math.abs(currY - dragStart.y);

    setCurrentDragRect({ x, y, width, height });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawingRect) return;
    setIsDrawingRect(false);
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }

    if (!currentDragRect || !containerRef.current) return;
    const cWidth = containerRef.current.clientWidth;
    const cHeight = containerRef.current.clientHeight;

    // Minimum 12px width/height to avoid accidental zero-size clicks
    const finalW = Math.max(25, currentDragRect.width);
    const finalH = Math.max(16, currentDragRect.height);

    const normRect: NormalizedRect = {
      x: Math.max(0, Math.min(1, currentDragRect.x / cWidth)),
      y: Math.max(0, Math.min(1, currentDragRect.y / cHeight)),
      width: Math.max(0.01, Math.min(1, finalW / cWidth)),
      height: Math.max(0.01, Math.min(1, finalH / cHeight)),
    };

    const newShape: CanvasShape = {
      id: `redact-${Date.now()}-${Math.random()}`,
      page: currentPage,
      type: 'redact',
      rect: normRect,
    };

    setRedactions((prev) => [...prev, newShape]);
    setSelectedId(newShape.id);
    setCurrentDragRect(null);
    setDragStart(null);
  };

  // Convert selected text tokens into permanent blackout shapes
  const handleRedactSelectedText = () => {
    if (selectedTokenIds.size === 0 || !containerRef.current) return;

    const selectedTokens = tokens.filter((t) => selectedTokenIds.has(t.id));
    const mergedBoxes = mergeTextTokensIntoBoxes(selectedTokens);

    const newShapes: CanvasShape[] = mergedBoxes.map((box) => ({
      id: `redact-text-${Date.now()}-${Math.random()}`,
      page: currentPage,
      type: 'redact',
      rect: box,
    }));

    setRedactions((prev) => [...prev, ...newShapes]);
    setSelectedTokenIds(new Set());
  };

  const handleUpdateShapePixels = (id: string, newPixelRect: BoxRect) => {
    if (!containerRef.current) return;
    const cWidth = containerRef.current.clientWidth;
    const cHeight = containerRef.current.clientHeight;

    const normRect: NormalizedRect = {
      x: Math.max(0, Math.min(1, newPixelRect.x / cWidth)),
      y: Math.max(0, Math.min(1, newPixelRect.y / cHeight)),
      width: Math.max(0.01, Math.min(1, newPixelRect.width / cWidth)),
      height: Math.max(0.01, Math.min(1, newPixelRect.height / cHeight)),
    };

    setRedactions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, rect: normRect } : s))
    );
  };

  const handleRemoveShape = (id: string) => {
    setRedactions((prev) => prev.filter((s) => s.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleApplyRedactions = async () => {
    try {
      setProcessing(true);
      const redactedPdf = await applyShapesToPdf(pdfBuffer, redactions);
      downloadUint8Array(redactedPdf, fileName.replace(/\.pdf$/i, '_redacted.pdf'));
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.8 } });
      setDone(true);
    } catch (err) {
      console.error(err);
      alert('Error redacting PDF: ' + String(err));
    } finally {
      setProcessing(false);
    }
  };

  const currentRedactions = redactions.filter((s) => s.page === currentPage);
  const containerW = containerRef.current?.clientWidth || pageDims.width;
  const containerH = containerRef.current?.clientHeight || pageDims.height;

  return (
    <div className="space-y-4">
      {/* Top Banner & Mode Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-neutral-900 text-white rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center">
            <EyeOff className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              Permanent Redaction Engine
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-red-600 text-white">
                Irreversible
              </span>
            </h4>
            <p className="text-xs text-neutral-400">
              Drag to draw blackout rectangles or select text words to redact permanently.
            </p>
          </div>
        </div>

        {/* Mode switcher & navigation */}
        <div className="flex items-center gap-3">
          {/* Mode Tabs */}
          <div className="flex bg-neutral-800 p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => setRedactMode('draw')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                redactMode === 'draw' ? 'bg-red-600 text-white shadow-xs' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Square className="w-3.5 h-3.5" />
              Drag Rectangle
            </button>
            <button
              onClick={() => setRedactMode('text-select')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                redactMode === 'text-select' ? 'bg-red-600 text-white shadow-xs' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              Select Text
            </button>
          </div>

          {/* Page Navigator */}
          <div className="flex items-center gap-1.5 text-xs text-neutral-300">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1 rounded-lg bg-neutral-800 disabled:opacity-40 hover:bg-neutral-700 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span>Page {currentPage}</span>
            <button
              onClick={() => setCurrentPage((p) => p + 1)}
              className="p-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={handleApplyRedactions}
            disabled={processing || redactions.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 disabled:bg-neutral-800 text-white shadow-sm transition-all cursor-pointer"
          >
            {done ? <Check className="w-4 h-4 text-white" /> : <Download className="w-4 h-4" />}
            {processing ? 'Applying...' : done ? 'Redacted!' : 'Apply & Download'}
          </button>
        </div>
      </div>

      {/* Action / Helper Bar */}
      <div className="flex items-center justify-between text-xs text-neutral-600 px-1">
        {redactMode === 'draw' ? (
          <span className="flex items-center gap-1.5">
            <MousePointerClick className="w-3.5 h-3.5 text-neutral-500" />
            Click and drag your mouse across any area on the document to draw a blackout box. Resize/move with handles.
          </span>
        ) : (
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Click text tokens to highlight them, then click "Redact Selected Text".
            </span>
            {selectedTokenIds.size > 0 && (
              <button
                onClick={handleRedactSelectedText}
                className="px-3 py-1 rounded-lg bg-red-600 text-white font-semibold text-xs shadow-xs hover:bg-red-700 transition-colors"
              >
                Redact {selectedTokenIds.size} Selected Token(s)
              </button>
            )}
          </div>
        )}

        <div className="flex items-center gap-3">
          <span className="font-medium text-neutral-700">
            Total Redactions: {redactions.length}
          </span>
          {redactions.length > 0 && (
            <button
              onClick={() => setRedactions([])}
              className="text-neutral-400 hover:text-rose-600 transition-colors"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Interactive PDF Page Preview Viewport */}
      <InteractivePreviewViewport maxHeight="64vh">
        {(zoom) =>
          pagePreviewUrl ? (
            <div
              ref={containerRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className={`relative inline-block shadow-lg rounded-sm overflow-visible bg-white select-none ${
                redactMode === 'draw' ? 'cursor-crosshair' : 'cursor-default'
              }`}
            >
              {/* PDF Background Canvas Image */}
              <img
                src={pagePreviewUrl}
                alt="PDF Page Preview"
                className="max-h-[58vh] object-contain block pointer-events-none"
              />

              {/* Text Selection Overlay (When in text-select mode) */}
              {redactMode === 'text-select' && (
                <div className="absolute inset-0 z-20 pointer-events-auto">
                  {tokens.map((tok) => {
                    const isSelected = selectedTokenIds.has(tok.id);
                    return (
                      <div
                        key={tok.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTokenIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(tok.id)) next.delete(tok.id);
                            else next.add(tok.id);
                            return next;
                          });
                        }}
                        style={{
                          left: `${tok.rect.x * 100}%`,
                          top: `${tok.rect.y * 100}%`,
                          width: `${tok.rect.width * 100}%`,
                          height: `${tok.rect.height * 100}%`,
                        }}
                        className={`absolute cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-red-500/50 border border-red-600'
                            : 'hover:bg-amber-300/30'
                        }`}
                        title={tok.str}
                      />
                    );
                  })}
                </div>
              )}

              {/* Live Dragging Rectangle Preview */}
              {isDrawingRect && currentDragRect && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${currentDragRect.x}px`,
                    top: `${currentDragRect.y}px`,
                    width: `${currentDragRect.width}px`,
                    height: `${currentDragRect.height}px`,
                  }}
                  className="bg-black/90 border-2 border-red-500 pointer-events-none z-30"
                />
              )}

              {/* Overlaid Movable & Resizable Redaction Blackout Boxes */}
              {containerRef.current &&
                currentRedactions.map((shape) => {
                  const pixelRect = CoordinateTransformer.normalizedToPixels(
                    shape.rect,
                    containerRef.current?.clientWidth || pageDims.width,
                    containerRef.current?.clientHeight || pageDims.height
                  );

                  return (
                    <TransformBox
                      key={shape.id}
                      rect={pixelRect}
                      onChange={(newPixelRect) => handleUpdateShapePixels(shape.id, newPixelRect)}
                      onDelete={() => handleRemoveShape(shape.id)}
                      isSelected={selectedId === shape.id}
                      onSelect={() => setSelectedId(shape.id)}
                      label="Blackout"
                      minWidth={20}
                      minHeight={15}
                      zoom={zoom}
                      boundsWidth={containerRef.current?.clientWidth}
                      boundsHeight={containerRef.current?.clientHeight}
                    >
                      <div className="w-full h-full bg-black rounded shadow-xs" />
                    </TransformBox>
                  );
                })}
            </div>
          ) : (
            <div className="p-20 text-xs text-neutral-400">Loading document preview...</div>
          )
        }
      </InteractivePreviewViewport>
    </div>
  );
};
