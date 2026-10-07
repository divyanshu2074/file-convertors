import React, { useState, useEffect } from 'react';
import { Crop, Download, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { renderPdfPage, cropPdf } from '../../lib/pdfEngine';
import { downloadUint8Array } from '../../lib/downloadHelper';
import { InteractivePreviewViewport } from '../InteractivePreviewViewport';
import confetti from 'canvas-confetti';

interface CropWorkspaceProps {
  pdfBuffer: ArrayBuffer;
  fileName: string;
}

export const CropWorkspace: React.FC<CropWorkspaceProps> = ({ pdfBuffer, fileName }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pagePreviewUrl, setPagePreviewUrl] = useState<string>('');
  const [pageDims, setPageDims] = useState({ width: 595, height: 842 });
  const [margins, setMargins] = useState({ top: 30, bottom: 30, left: 30, right: 30 });
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { canvas, width, height } = await renderPdfPage(pdfBuffer, currentPage, 1.0);
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

  const handleApplyCrop = async () => {
    try {
      setProcessing(true);
      const croppedBytes = await cropPdf(pdfBuffer, margins);
      downloadUint8Array(croppedBytes, fileName.replace(/\.pdf$/i, '_cropped.pdf'));
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.8 } });
      setDone(true);
    } catch (err) {
      console.error(err);
      alert('Error cropping PDF: ' + String(err));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Controls sidebar */}
      <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs space-y-5 text-left">
        <div>
          <h4 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
            <Crop className="w-4 h-4" />
            Adjust Crop Margins (pt)
          </h4>
          <p className="text-xs text-neutral-500 mt-0.5">
            Trim outer borders uniformly or set individual margin cutoffs.
          </p>
        </div>

        {/* Margin Sliders */}
        <div className="space-y-3">
          {(['top', 'bottom', 'left', 'right'] as const).map((side) => (
            <div key={side} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="capitalize font-medium text-neutral-700">{side} Margin:</span>
                <span className="text-neutral-500 font-mono">{margins[side]} pt</span>
              </div>
              <input
                type="range"
                min={0}
                max={150}
                value={margins[side]}
                onChange={(e) =>
                  setMargins((prev) => ({ ...prev, [side]: parseInt(e.target.value) || 0 }))
                }
                className="w-full accent-neutral-900"
              />
            </div>
          ))}
        </div>

        {/* Quick presets */}
        <div className="pt-2">
          <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block mb-2">
            Quick Presets
          </span>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <button
              onClick={() => setMargins({ top: 15, bottom: 15, left: 15, right: 15 })}
              className="py-1.5 px-2 rounded-lg border border-neutral-200 hover:bg-neutral-50"
            >
              Light (15pt)
            </button>
            <button
              onClick={() => setMargins({ top: 40, bottom: 40, left: 40, right: 40 })}
              className="py-1.5 px-2 rounded-lg border border-neutral-200 hover:bg-neutral-50"
            >
              Medium (40pt)
            </button>
            <button
              onClick={() => setMargins({ top: 75, bottom: 75, left: 75, right: 75 })}
              className="py-1.5 px-2 rounded-lg border border-neutral-200 hover:bg-neutral-50"
            >
              Heavy (75pt)
            </button>
          </div>
        </div>

        <button
          onClick={handleApplyCrop}
          disabled={processing}
          className="w-full py-3 rounded-xl text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-200 text-white shadow-sm flex items-center justify-center gap-2 transition-all mt-4"
        >
          {done ? <Check className="w-4 h-4 text-emerald-400" /> : <Download className="w-4 h-4" />}
          {processing ? 'Cropping...' : done ? 'Downloaded!' : 'Crop & Download PDF'}
        </button>
      </div>

      {/* Visual Crop Preview */}
      <div className="lg:col-span-7 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-neutral-700">Live Crop Preview</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1 rounded border border-neutral-200 disabled:opacity-40"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span>Page {currentPage}</span>
            <button
              onClick={() => setCurrentPage((p) => p + 1)}
              className="p-1 rounded border border-neutral-200"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <InteractivePreviewViewport maxHeight="64vh">
          {() =>
            pagePreviewUrl ? (
              <div className="relative shadow-lg rounded-sm overflow-hidden bg-white">
                <img src={pagePreviewUrl} alt="Crop Preview" className="max-h-[58vh] object-contain pointer-events-none" />
                {/* Overlaid crop box border */}
                <div
                  style={{
                    position: 'absolute',
                    top: `${margins.top * 0.7}px`,
                    bottom: `${margins.bottom * 0.7}px`,
                    left: `${margins.left * 0.7}px`,
                    right: `${margins.right * 0.7}px`,
                  }}
                  className="border-2 border-dashed border-rose-500 bg-rose-500/10 pointer-events-none"
                />
              </div>
            ) : (
              <span className="text-xs text-neutral-400 p-20">Rendering preview...</span>
            )
          }
        </InteractivePreviewViewport>
      </div>
    </div>
  );
};
