import React, { useState, useEffect, useRef } from 'react';
import { Type, Square, Download, Check, Trash2, ChevronLeft, ChevronRight, MousePointerClick } from 'lucide-react';
import { renderPdfPage, editPdf } from '../../lib/pdfEngine';
import { downloadUint8Array } from '../../lib/downloadHelper';
import { InteractivePreviewViewport } from '../InteractivePreviewViewport';
import { TransformBox, BoxRect } from '../TransformBox';
import confetti from 'canvas-confetti';

interface Annotation {
  id: string;
  page: number;
  type: 'text' | 'rect';
  x: number;
  y: number;
  text?: string;
  width: number;
  height: number;
  color: { r: number; g: number; b: number };
  fontSize?: number;
}

interface EditWorkspaceProps {
  pdfBuffer: ArrayBuffer;
  fileName: string;
}

export const EditWorkspace: React.FC<EditWorkspaceProps> = ({ pdfBuffer, fileName }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pagePreviewUrl, setPagePreviewUrl] = useState<string>('');
  const [pageDims, setPageDims] = useState({ width: 595, height: 842 });
  const [toolType, setToolType] = useState<'text' | 'rect'>('text');
  const [textInput, setTextInput] = useState('Important Note');
  const [selectedColor, setSelectedColor] = useState<{ r: number; g: number; b: number }>({ r: 0.9, g: 0.1, b: 0.1 });
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { canvas, width, height } = await renderPdfPage(pdfBuffer, currentPage, 1.2);
        if (mounted) {
          setPagePreviewUrl(canvas.toDataURL('image/jpeg', 0.9));
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

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = Math.round(e.clientX - rect.left);
    const clickY = Math.round(e.clientY - rect.top);

    const initialW = toolType === 'text' ? Math.max(120, textInput.length * 9) : 140;
    const initialH = toolType === 'text' ? 32 : 60;

    const newAnn: Annotation = {
      id: `ann-${Date.now()}`,
      page: currentPage,
      type: toolType,
      x: Math.max(0, clickX - 20),
      y: Math.max(0, clickY - 15),
      text: toolType === 'text' ? textInput : undefined,
      width: initialW,
      height: initialH,
      color: selectedColor,
      fontSize: 14,
    };

    setAnnotations((prev) => [...prev, newAnn]);
    setSelectedId(newAnn.id);
  };

  const handleUpdateRect = (id: string, newRect: BoxRect) => {
    setAnnotations((prev) =>
      prev.map((ann) => (ann.id === id ? { ...ann, ...newRect } : ann))
    );
  };

  const handleRemoveAnnotation = (id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleSave = async () => {
    try {
      setProcessing(true);
      const container = containerRef.current;
      const previewW = container?.clientWidth || pageDims.width;
      const previewH = container?.clientHeight || pageDims.height;

      const scaleX = pageDims.width / previewW;
      const scaleY = pageDims.height / previewH;

      // Transform annotations to standard PDF coordinate points (bottom-left origin)
      const mappedAnnotations = annotations.map((ann) => {
        const pdfX = ann.x * scaleX;
        const pdfY = (previewH - (ann.y + ann.height)) * scaleY;
        const pdfW = ann.width * scaleX;
        const pdfH = ann.height * scaleY;

        return {
          page: ann.page,
          type: ann.type,
          x: pdfX,
          y: pdfY,
          width: pdfW,
          height: pdfH,
          text: ann.text,
          color: ann.color,
          fontSize: ann.fontSize || 14,
        };
      });

      const updatedPdf = await editPdf(pdfBuffer, mappedAnnotations);
      downloadUint8Array(updatedPdf, fileName.replace(/\.pdf$/i, '_edited.pdf'));
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.8 } });
      setDone(true);
    } catch (err) {
      console.error(err);
      alert('Error editing PDF: ' + String(err));
    } finally {
      setProcessing(false);
    }
  };

  const currentAnnotations = annotations.filter((a) => a.page === currentPage);
  const activeAnnotation = annotations.find((a) => a.id === selectedId);

  return (
    <div className="space-y-4">
      {/* Edit Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-neutral-200 shadow-xs">
        {/* Tool selector */}
        <div className="flex items-center gap-2">
          <div className="flex bg-neutral-100 p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => setToolType('text')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                toolType === 'text' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              Add Text
            </button>
            <button
              onClick={() => setToolType('rect')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                toolType === 'rect' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500'
              }`}
            >
              <Square className="w-3.5 h-3.5" />
              Draw Rectangle
            </button>
          </div>

          {toolType === 'text' && (
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Text to stamp..."
              className="px-3 py-1.5 text-xs rounded-xl border border-neutral-200 w-44 focus:outline-none"
            />
          )}

          {/* Color picker */}
          <div className="flex items-center gap-1 pl-2 border-l border-neutral-200">
            {[
              { r: 0.9, g: 0.1, b: 0.1, hex: '#ef4444' }, // red
              { r: 0.1, g: 0.4, b: 0.9, hex: '#3b82f6' }, // blue
              { r: 0.1, g: 0.7, b: 0.3, hex: '#10b981' }, // green
              { r: 0.1, g: 0.1, b: 0.1, hex: '#171717' }, // black
            ].map((col) => (
              <button
                key={col.hex}
                onClick={() => setSelectedColor({ r: col.r, g: col.g, b: col.b })}
                style={{ backgroundColor: col.hex }}
                className={`w-5 h-5 rounded-full border-2 transition-transform cursor-pointer ${
                  selectedColor.r === col.r && selectedColor.g === col.g ? 'scale-110 border-neutral-900' : 'border-transparent'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Selected annotation properties */}
        {activeAnnotation && activeAnnotation.type === 'text' && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-neutral-500">Font:</span>
            <input
              type="number"
              min={9}
              max={72}
              value={activeAnnotation.fontSize || 14}
              onChange={(e) => {
                const sz = parseInt(e.target.value) || 14;
                setAnnotations((prev) =>
                  prev.map((a) => (a.id === activeAnnotation.id ? { ...a, fontSize: sz } : a))
                );
              }}
              className="w-14 px-2 py-1 rounded-lg border border-neutral-200 text-center"
            />
            <span className="text-neutral-400">pt</span>
          </div>
        )}

        {/* Page navigator & save */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1 rounded-lg border border-neutral-200 disabled:opacity-40 hover:bg-neutral-50 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-1 font-medium">Page {currentPage}</span>
            <button
              onClick={() => setCurrentPage((p) => p + 1)}
              className="p-1 rounded-lg border border-neutral-200 hover:bg-neutral-50 cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={handleSave}
            disabled={processing || annotations.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-300 text-white shadow-sm transition-all cursor-pointer"
          >
            {done ? <Check className="w-4 h-4 text-emerald-400" /> : <Download className="w-4 h-4" />}
            {processing ? 'Saving...' : done ? 'Downloaded!' : 'Save & Download'}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-neutral-500 px-1">
        <span className="flex items-center gap-1.5">
          <MousePointerClick className="w-3.5 h-3.5 text-neutral-400" />
          Click anywhere on the preview to stamp. Drag to move, or use circular corner handles to resize.
        </span>
        {activeAnnotation && (
          <span className="text-indigo-600 font-medium">Selected: {activeAnnotation.type.toUpperCase()} #{activeAnnotation.id.slice(-4)}</span>
        )}
      </div>

      {/* Interactive PDF Page Preview Viewport */}
      <InteractivePreviewViewport maxHeight="64vh">
        {() =>
          pagePreviewUrl ? (
            <div
              ref={containerRef}
              onClick={handleCanvasClick}
              className="relative inline-block cursor-crosshair shadow-lg rounded-sm overflow-visible bg-white select-none"
            >
              <img
                src={pagePreviewUrl}
                alt="PDF Page Preview"
                className="max-h-[58vh] object-contain block pointer-events-none"
              />

              {/* Overlaid Movable & Resizable annotations */}
              {currentAnnotations.map((ann) => (
                <TransformBox
                  key={ann.id}
                  rect={{ x: ann.x, y: ann.y, width: ann.width, height: ann.height }}
                  onChange={(newRect) => handleUpdateRect(ann.id, newRect)}
                  onDelete={() => handleRemoveAnnotation(ann.id)}
                  isSelected={selectedId === ann.id}
                  onSelect={() => setSelectedId(ann.id)}
                  label={ann.type === 'text' ? 'Text' : 'Rect'}
                  minWidth={ann.type === 'text' ? 40 : 25}
                  minHeight={ann.type === 'text' ? 20 : 20}
                >
                  {ann.type === 'text' ? (
                    <div
                      style={{
                        color: `rgb(${ann.color.r * 255}, ${ann.color.g * 255}, ${ann.color.b * 255})`,
                        fontSize: `${ann.fontSize || 14}px`,
                      }}
                      className="font-semibold bg-white/85 px-1.5 py-0.5 rounded shadow-xs w-full h-full flex items-center justify-center text-center overflow-hidden"
                    >
                      {ann.text}
                    </div>
                  ) : (
                    <div
                      style={{
                        borderColor: `rgb(${ann.color.r * 255}, ${ann.color.g * 255}, ${ann.color.b * 255})`,
                      }}
                      className="w-full h-full border-2 border-dashed bg-black/5 rounded"
                    />
                  )}
                </TransformBox>
              ))}
            </div>
          ) : (
            <div className="p-20 text-xs text-neutral-400">Loading document preview...</div>
          )
        }
      </InteractivePreviewViewport>
    </div>
  );
};
