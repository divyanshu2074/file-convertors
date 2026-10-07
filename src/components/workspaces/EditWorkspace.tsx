import React, { useState, useEffect, useRef } from 'react';
import { Type, Square, Download, Check, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { renderPdfPage, editPdf } from '../../lib/pdfEngine';
import { downloadUint8Array } from '../../lib/downloadHelper';
import confetti from 'canvas-confetti';

interface Annotation {
  id: string;
  page: number;
  type: 'text' | 'rect';
  x: number;
  y: number;
  text?: string;
  width?: number;
  height?: number;
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
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const newAnn: Annotation = {
      id: `ann-${Date.now()}`,
      page: currentPage,
      type: toolType,
      x: clickX,
      y: clickY,
      text: toolType === 'text' ? textInput : undefined,
      width: toolType === 'rect' ? 120 : undefined,
      height: toolType === 'rect' ? 50 : undefined,
      color: selectedColor,
      fontSize: 14,
    };

    setAnnotations((prev) => [...prev, newAnn]);
  };

  const handleRemoveAnnotation = (id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSave = async () => {
    try {
      setProcessing(true);
      const container = containerRef.current;
      const previewW = container?.clientWidth || pageDims.width;
      const previewH = container?.clientHeight || pageDims.height;

      const scaleX = pageDims.width / previewW;
      const scaleY = pageDims.height / previewH;

      // Transform annotations to PDF coordinates
      const mappedAnnotations = annotations.map((ann) => {
        const pdfX = ann.x * scaleX;
        const pdfY = (previewH - ann.y) * scaleY;
        const pdfW = ann.width ? ann.width * scaleX : undefined;
        const pdfH = ann.height ? ann.height * scaleY : undefined;

        return {
          page: ann.page,
          type: ann.type,
          x: pdfX,
          y: pdfY,
          width: pdfW,
          height: pdfH,
          text: ann.text,
          color: ann.color,
          fontSize: ann.fontSize,
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

  return (
    <div className="space-y-5">
      {/* Edit Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-neutral-200 shadow-xs">
        {/* Tool selector */}
        <div className="flex items-center gap-2">
          <div className="flex bg-neutral-100 p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => setToolType('text')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                toolType === 'text' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              Add Text
            </button>
            <button
              onClick={() => setToolType('rect')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
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
              className="px-3 py-1.5 text-xs rounded-xl border border-neutral-200 w-40 focus:outline-none"
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
                className={`w-6 h-6 rounded-full border-2 transition-transform ${
                  selectedColor.r === col.r && selectedColor.g === col.g ? 'scale-110 border-neutral-900' : 'border-transparent'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Page navigator & save */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1 rounded-lg border border-neutral-200 disabled:opacity-40"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span>Page {currentPage}</span>
            <button
              onClick={() => setCurrentPage((p) => p + 1)}
              className="p-1 rounded-lg border border-neutral-200"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={handleSave}
            disabled={processing || annotations.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-300 text-white shadow-sm transition-all"
          >
            {done ? <Check className="w-4 h-4 text-emerald-400" /> : <Download className="w-4 h-4" />}
            {processing ? 'Saving...' : done ? 'Downloaded!' : 'Save & Download'}
          </button>
        </div>
      </div>

      <p className="text-xs text-neutral-400">Click anywhere on the preview to place your annotation.</p>

      {/* Interactive PDF Page Preview */}
      <div className="relative max-h-[65vh] overflow-hidden rounded-xl border border-neutral-300 shadow-sm bg-neutral-100 flex items-center justify-center select-none p-2">
        {pagePreviewUrl ? (
          <div
            ref={containerRef}
            onClick={handleCanvasClick}
            className="relative inline-block cursor-crosshair shadow-md"
          >
            <img src={pagePreviewUrl} alt="PDF Page Preview" className="max-h-[60vh] object-contain block" />

            {/* Overlaid annotations */}
            {currentAnnotations.map((ann) => (
              <div
                key={ann.id}
                style={{
                  position: 'absolute',
                  left: `${ann.x}px`,
                  top: `${ann.y}px`,
                }}
                className="group -translate-y-1/2 flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                {ann.type === 'text' && (
                  <span
                    style={{
                      color: `rgb(${ann.color.r * 255}, ${ann.color.g * 255}, ${ann.color.b * 255})`,
                      fontSize: `${ann.fontSize}px`,
                    }}
                    className="font-semibold bg-white/70 px-1.5 py-0.5 rounded shadow-xs"
                  >
                    {ann.text}
                  </span>
                )}

                {ann.type === 'rect' && (
                  <div
                    style={{
                      width: `${ann.width}px`,
                      height: `${ann.height}px`,
                      borderColor: `rgb(${ann.color.r * 255}, ${ann.color.g * 255}, ${ann.color.b * 255})`,
                    }}
                    className="border-2 border-dashed bg-black/5 rounded"
                  />
                )}

                <button
                  type="button"
                  onClick={() => handleRemoveAnnotation(ann.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 bg-red-600 text-white rounded-full transition-opacity shadow-xs"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-20 text-xs text-neutral-400">Loading document preview...</div>
        )}
      </div>
    </div>
  );
};
