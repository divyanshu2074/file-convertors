import React, { useState, useRef, useEffect } from 'react';
import { Pen, Type, Upload, Download, Check, RefreshCw } from 'lucide-react';
import { renderPdfPage, signPdf } from '../../lib/pdfEngine';
import { downloadUint8Array } from '../../lib/downloadHelper';
import confetti from 'canvas-confetti';

interface SignWorkspaceProps {
  pdfBuffer: ArrayBuffer;
  fileName: string;
}

export const SignWorkspace: React.FC<SignWorkspaceProps> = ({ pdfBuffer, fileName }) => {
  const [mode, setMode] = useState<'draw' | 'type' | 'upload'>('draw');
  const [typedName, setTypedName] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pagePreviewUrl, setPagePreviewUrl] = useState<string>('');
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  // Signature placement coordinates relative to rendered preview
  const [signaturePos, setSignaturePos] = useState({ x: 100, y: 150, width: 140, height: 60 });
  const [pageDims, setPageDims] = useState({ width: 595, height: 842 });
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);

  // Drawing canvas refs
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Preview container ref
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Load current page preview
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { canvas, width, height } = await renderPdfPage(pdfBuffer, currentPage, 1.2);
        if (mounted) {
          setPagePreviewUrl(canvas.toDataURL('image/jpeg', 0.9));
          setPageDims({ width, height });
        }
      } catch (e) {
        console.error('Error rendering page preview:', e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [pdfBuffer, currentPage]);

  // Handle signature drawing canvas
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = drawCanvasRef.current;
    if (canvas) {
      setSignatureDataUrl(canvas.toDataURL('image/png'));
    }
  };

  const clearCanvas = () => {
    const canvas = drawCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      setSignatureDataUrl(null);
    }
  };

  // Handle Type Mode
  useEffect(() => {
    if (mode === 'type' && typedName.trim()) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 400;
      tempCanvas.height = 160;
      const ctx = tempCanvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
        ctx.font = 'italic 52px "Brush Script MT", cursive, sans-serif';
        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(typedName, 200, 80);
        setSignatureDataUrl(tempCanvas.toDataURL('image/png'));
      }
    }
  }, [mode, typedName]);

  // Handle Upload signature image
  const handleUploadSignature = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setSignatureDataUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Reposition signature by clicking on the document preview
  const handlePreviewClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!previewContainerRef.current) return;
    const rect = previewContainerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    setSignaturePos((prev) => ({
      ...prev,
      x: Math.max(0, Math.min(rect.width - prev.width, clickX - prev.width / 2)),
      y: Math.max(0, Math.min(rect.height - prev.height, clickY - prev.height / 2)),
    }));
  };

  const handleApplySignature = async () => {
    if (!signatureDataUrl) {
      alert('Please create or upload a signature first!');
      return;
    }

    try {
      setProcessing(true);
      const container = previewContainerRef.current;
      const previewW = container?.clientWidth || pageDims.width;
      const previewH = container?.clientHeight || pageDims.height;

      // Map from preview pixels to standard PDF coordinate points (bottom-left origin)
      const scaleX = pageDims.width / previewW;
      const scaleY = pageDims.height / previewH;

      const pdfX = signaturePos.x * scaleX;
      // In PDF, y=0 is at the bottom!
      const pdfY = (previewH - (signaturePos.y + signaturePos.height)) * scaleY;
      const pdfW = signaturePos.width * scaleX;
      const pdfH = signaturePos.height * scaleY;

      const signedBytes = await signPdf(pdfBuffer, signatureDataUrl, {
        page: currentPage,
        x: pdfX,
        y: pdfY,
        width: pdfW,
        height: pdfH,
      });

      downloadUint8Array(signedBytes, fileName.replace(/\.pdf$/i, '_signed.pdf'));
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.8 } });
      setDone(true);
    } catch (err) {
      console.error(err);
      alert('Error signing document: ' + String(err));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Signature creator sidebar */}
      <div className="lg:col-span-5 space-y-5 bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs">
        <h3 className="font-semibold text-neutral-900 text-sm">1. Create Your Signature</h3>

        {/* Mode selector */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-neutral-100 rounded-xl text-xs font-medium">
          <button
            onClick={() => setMode('draw')}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              mode === 'draw' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Pen className="w-3.5 h-3.5" />
            Draw
          </button>
          <button
            onClick={() => setMode('type')}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              mode === 'type' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            Type
          </button>
          <button
            onClick={() => setMode('upload')}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              mode === 'upload' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload
          </button>
        </div>

        {/* Draw Canvas */}
        {mode === 'draw' && (
          <div className="space-y-2">
            <div className="relative border-2 border-neutral-200 rounded-xl overflow-hidden bg-neutral-50/50">
              <canvas
                ref={drawCanvasRef}
                width={380}
                height={160}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                className="w-full h-40 cursor-crosshair"
              />
              <button
                onClick={clearCanvas}
                className="absolute top-2 right-2 p-1.5 rounded-lg text-xs text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200 transition-colors"
                title="Clear signature"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-neutral-400">Sign with your mouse, trackpad, or touch screen</p>
          </div>
        )}

        {/* Type Mode */}
        {mode === 'type' && (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Type your full name..."
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
            />
            {typedName && (
              <div className="h-28 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-center p-3">
                <span className="font-serif italic text-3xl text-neutral-900">{typedName}</span>
              </div>
            )}
          </div>
        )}

        {/* Upload Mode */}
        {mode === 'upload' && (
          <div className="space-y-3">
            <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-neutral-200 rounded-xl cursor-pointer hover:bg-neutral-50 transition-colors">
              <Upload className="w-6 h-6 text-neutral-400 mb-2" />
              <span className="text-xs font-semibold text-neutral-700">Upload signature image</span>
              <span className="text-[11px] text-neutral-400">PNG or JPG with transparent/white background</span>
              <input type="file" accept="image/png,image/jpeg" onChange={handleUploadSignature} className="hidden" />
            </label>
          </div>
        )}

        {/* Apply and Download */}
        <div className="pt-4 border-t border-neutral-100">
          <button
            onClick={handleApplySignature}
            disabled={processing || !signatureDataUrl}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-300 text-white shadow-sm transition-all"
          >
            {done ? <Check className="w-4 h-4 text-emerald-400" /> : <Download className="w-4 h-4" />}
            {processing ? 'Applying Signature...' : done ? 'Signed & Downloaded!' : 'Apply Signature & Download'}
          </button>
        </div>
      </div>

      {/* Document Placement Preview */}
      <div className="lg:col-span-7 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-700">2. Position Signature on Document</span>
          <div className="flex items-center gap-2 text-xs">
            <span>Page:</span>
            <input
              type="number"
              min={1}
              value={currentPage}
              onChange={(e) => setCurrentPage(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-14 px-2 py-1 rounded-lg border border-neutral-200 text-center"
            />
          </div>
        </div>

        <p className="text-[11px] text-neutral-400">Click anywhere on the preview to position your signature stamp</p>

        {/* Interactive PDF Page Preview Container */}
        <div
          ref={previewContainerRef}
          onClick={handlePreviewClick}
          className="relative max-h-[65vh] overflow-hidden rounded-xl border border-neutral-300 shadow-sm bg-neutral-100 flex items-center justify-center cursor-crosshair select-none"
        >
          {pagePreviewUrl ? (
            <div className="relative w-full flex justify-center">
              <img src={pagePreviewUrl} alt="PDF Page Preview" className="max-h-[60vh] object-contain shadow-xs" />

              {/* Draggable/Placed Signature overlay stamp */}
              {signatureDataUrl && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${signaturePos.x}px`,
                    top: `${signaturePos.y}px`,
                    width: `${signaturePos.width}px`,
                    height: `${signaturePos.height}px`,
                  }}
                  className="border-2 border-dashed border-rose-500 bg-rose-500/10 rounded pointer-events-none flex items-center justify-center p-1"
                >
                  <img src={signatureDataUrl} alt="Signature Stamp" className="max-w-full max-h-full object-contain" />
                </div>
              )}
            </div>
          ) : (
            <div className="p-20 text-xs text-neutral-400">Rendering preview...</div>
          )}
        </div>
      </div>
    </div>
  );
};
