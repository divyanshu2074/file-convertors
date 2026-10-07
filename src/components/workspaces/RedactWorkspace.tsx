import React, { useState, useEffect, useRef } from 'react';
import { EyeOff, Download, Check, Trash2, ChevronLeft, ChevronRight, ShieldAlert } from 'lucide-react';
import { renderPdfPage, redactPdf } from '../../lib/pdfEngine';
import { downloadUint8Array } from '../../lib/downloadHelper';
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

    const newBox: RedactionBox = {
      id: `redact-${Date.now()}`,
      page: currentPage,
      x: clickX,
      y: clickY,
      width: 140,
      height: 35,
    };

    setRedactions((prev) => [...prev, newBox]);
  };

  const handleRemoveBox = (id: string) => {
    setRedactions((prev) => prev.filter((r) => r.id !== id));
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
    <div className="space-y-5">
      {/* Top Banner & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-neutral-900 text-white rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center">
            <EyeOff className="w-5 h-5" />
          </div>
          <div>
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
              className="p-1 rounded-lg bg-neutral-800 disabled:opacity-40"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span>Page {currentPage}</span>
            <button onClick={() => setCurrentPage((p) => p + 1)} className="p-1 rounded-lg bg-neutral-800">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={handleApplyRedactions}
            disabled={processing || redactions.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 disabled:bg-neutral-800 text-white shadow-sm transition-all"
          >
            {done ? <Check className="w-4 h-4 text-white" /> : <Download className="w-4 h-4" />}
            {processing ? 'Applying Redaction...' : done ? 'Redacted!' : 'Apply Redactions & Download'}
          </button>
        </div>
      </div>

      <p className="text-xs text-neutral-500">
        Click on any text or graphic in the preview below to place a blackout redaction box.
      </p>

      {/* Interactive PDF Page Preview */}
      <div
        ref={containerRef}
        onClick={handleCanvasClick}
        className="relative max-h-[65vh] overflow-hidden rounded-xl border border-neutral-300 shadow-sm bg-neutral-100 flex items-center justify-center cursor-crosshair select-none"
      >
        {pagePreviewUrl ? (
          <div className="relative w-full flex justify-center">
            <img src={pagePreviewUrl} alt="PDF Page Preview" className="max-h-[60vh] object-contain shadow-xs" />

            {/* Overlaid Redaction blackout boxes */}
            {currentRedactions.map((box) => (
              <div
                key={box.id}
                style={{
                  position: 'absolute',
                  left: `${box.x}px`,
                  top: `${box.y}px`,
                  width: `${box.width}px`,
                  height: `${box.height}px`,
                }}
                className="group bg-black rounded shadow-xs flex items-center justify-end pr-1 cursor-default"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => handleRemoveBox(box.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 bg-red-600 text-white rounded text-[10px] transition-opacity"
                  title="Remove redaction box"
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
