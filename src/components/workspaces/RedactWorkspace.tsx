import React, { useState, useEffect, useRef } from 'react';
import { EyeOff, Download, Check, Trash2, ChevronLeft, ChevronRight, ShieldAlert, MousePointerClick } from 'lucide-react';
import { renderPdfPage, redactPdf } from '../../lib/pdfEngine';
import { downloadUint8Array } from '../../lib/downloadHelper';
import { InteractivePreviewViewport } from '../InteractivePreviewViewport';
import { TransformBox, BoxRect } from '../TransformBox';
import confetti from 'canvas-confetti';

interface RedactionBox {
  id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RedactWorkspaceProps {
  pdfBuffer: ArrayBuffer;
  fileName: string;
}

export const RedactWorkspace: React.FC<RedactWorkspaceProps> = ({ pdfBuffer, fileName }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pagePreviewUrl, setPagePreviewUrl] = useState<string>('');
  const [pageDims, setPageDims] = useState({ width: 595, height: 842 });
  const [redactions, setRedactions] = useState<RedactionBox[]>([]);
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

    const newBox: RedactionBox = {
      id: `redact-${Date.now()}`,
      page: currentPage,
      x: Math.max(0, clickX - 20),
      y: Math.max(0, clickY - 15),
      width: 140,
      height: 35,
    };

    setRedactions((prev) => [...prev, newBox]);
    setSelectedId(newBox.id);
  };

  const handleUpdateBox = (id: string, newRect: BoxRect) => {
    setRedactions((prev) =>
      prev.map((box) => (box.id === id ? { ...box, ...newRect } : box))
    );
  };

  const handleRemoveBox = (id: string) => {
    setRedactions((prev) => prev.filter((r) => r.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleApplyRedactions = async () => {
    try {
      setProcessing(true);
      const container = containerRef.current;
      const previewW = container?.clientWidth || pageDims.width;
      const previewH = container?.clientHeight || pageDims.height;

      const scaleX = pageDims.width / previewW;
      const scaleY = pageDims.height / previewH;

      const mappedRedactions = redactions.map((r) => {
        const pdfX = r.x * scaleX;
        const pdfY = (previewH - (r.y + r.height)) * scaleY;
        const pdfW = r.width * scaleX;
        const pdfH = r.height * scaleY;

        return {
          page: r.page,
          x: pdfX,
          y: pdfY,
          width: pdfW,
          height: pdfH,
        };
      });

      const redactedPdf = await redactPdf(pdfBuffer, mappedRedactions);
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

  const currentRedactions = redactions.filter((r) => r.page === currentPage);

  return (
    <div className="space-y-4">
      {/* Top Banner & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-neutral-900 text-white rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center">
            <EyeOff className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              Permanent Redaction
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-red-600 text-white">
                Irreversible
              </span>
            </h4>
            <p className="text-xs text-neutral-400">
              Blacks out and permanently erases confidential content from the document file.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
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
            {processing ? 'Applying Redaction...' : done ? 'Redacted!' : 'Apply Redactions & Download'}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-neutral-500 px-1">
        <span className="flex items-center gap-1.5">
          <MousePointerClick className="w-3.5 h-3.5 text-neutral-400" />
          Click to create blackout box. Drag box to move, and drag 4 corner handles to resize over text columns.
        </span>
        {selectedId && (
          <span className="text-red-600 font-medium">Selected Box: #{selectedId.slice(-4)}</span>
        )}
      </div>

      {/* Interactive PDF Page Preview Viewport */}
      <InteractivePreviewViewport maxHeight="64vh">
        {(zoom) =>
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

              {/* Overlaid Movable & Resizable Redaction blackout boxes */}
              {currentRedactions.map((box) => (
                <TransformBox
                  key={box.id}
                  rect={{ x: box.x, y: box.y, width: box.width, height: box.height }}
                  onChange={(newRect) => handleUpdateBox(box.id, newRect)}
                  onDelete={() => handleRemoveBox(box.id)}
                  isSelected={selectedId === box.id}
                  onSelect={() => setSelectedId(box.id)}
                  label="Blackout"
                  minWidth={25}
                  minHeight={15}
                  zoom={zoom}
                >
                  <div className="w-full h-full bg-black rounded shadow-xs" />
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
