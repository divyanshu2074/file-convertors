import React, { useState, useRef, useEffect } from 'react';
import { Pen, Type, Upload, Download, Check, RefreshCw, ChevronLeft, ChevronRight, Stamp } from 'lucide-react';
import { renderPdfPage, signPdf } from '../../lib/pdfEngine';
import { downloadUint8Array } from '../../lib/downloadHelper';
import { InteractivePreviewViewport } from '../InteractivePreviewViewport';
import { TransformBox, BoxRect } from '../TransformBox';
import confetti from 'canvas-confetti';

interface SignWorkspaceProps {
  pdfBuffer: ArrayBuffer;
  fileName: string;
}

export const SignWorkspace: React.FC<SignWorkspaceProps> = ({ pdfBuffer, fileName }) => {
  const [mode, setMode] = useState<'draw' | 'type' | 'upload'>('draw');
  const [typedName, setTypedName] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagePreviewUrl, setPagePreviewUrl] = useState<string>('');
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  // Signature placement coordinates relative to rendered preview
  const [signaturePos, setSignaturePos] = useState<BoxRect>({ x: 80, y: 120, width: 160, height: 70 });
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
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.lineTo(e.clientX - canvas.getBoundingClientRect().left, e.clientY - canvas.getBoundingClientRect().top);
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

  const handleApplySignature = async () => {
    if (!signatureDataUrl) return;

    try {
      setProcessing(true);
      const container = previewContainerRef.current;
      const previewW = container?.clientWidth || pageDims.width;
      const previewH = container?.clientHeight || pageDims.height;

      // Map from preview pixels to standard PDF coordinate points (bottom-left origin)
      const scaleX = pageDims.width / previewW;
      const scaleY = pageDims.height / previewH;

      const pdfX = signaturePos.x * scaleX;
      // In PDF, y=0 is at the bottom
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
      <div className="lg:col-span-5 space-y-5 bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs text-left">
        <h3 className="font-semibold text-neutral-900 text-sm flex items-center gap-2">
          <Stamp className="w-4 h-4 text-neutral-700" />
          1. Create Your Signature
        </h3>

        {/* Mode selector */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-neutral-100 rounded-xl text-xs font-medium">
          <button
            onClick={() => setMode('draw')}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mode === 'draw' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Pen className="w-3.5 h-3.5" />
            Draw
          </button>
          <button
            onClick={() => setMode('type')}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mode === 'type' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            Type
          </button>
          <button
            onClick={() => setMode('upload')}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
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

        {/* Instructions */}
        <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-neutral-600 space-y-1">
          <p className="font-medium text-neutral-800">Move & Resize Controls:</p>
          <p className="text-[11px] text-neutral-500 leading-normal">
            Drag the signature stamp anywhere on the preview. Use the 4 circular corner handles to scale it to any size.
          </p>
        </div>

        {/* Apply and Download */}
        <div className="pt-2">
          <button
            onClick={handleApplySignature}
            disabled={processing || !signatureDataUrl}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-300 text-white shadow-sm transition-all cursor-pointer"
          >
            {done ? <Check className="w-4 h-4 text-emerald-400" /> : <Download className="w-4 h-4" />}
            {processing ? 'Applying Signature...' : done ? 'Signed & Downloaded!' : 'Apply Signature & Download'}
          </button>
        </div>
      </div>

      {/* Document Placement Preview */}
      <div className="lg:col-span-7 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-700">2. Position & Resize on Document</span>
          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1 rounded-lg border border-neutral-200 disabled:opacity-40 hover:bg-neutral-50 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-medium px-1">Page {currentPage}</span>
            <button
              onClick={() => setCurrentPage((p) => p + 1)}
              className="p-1 rounded-lg border border-neutral-200 hover:bg-neutral-50 cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Interactive Viewport with Zoom, Fit & Fullscreen */}
        <InteractivePreviewViewport maxHeight="64vh">
          {(zoom) =>
            pagePreviewUrl ? (
              <div
                ref={previewContainerRef}
                className="relative inline-block shadow-lg rounded-sm overflow-visible bg-white"
              >
                <img
                  src={pagePreviewUrl}
                  alt="PDF Page Preview"
                  className="max-h-[58vh] object-contain block pointer-events-none"
                />

                {/* Movable and Resizable Signature Stamp */}
                {signatureDataUrl && (
                  <TransformBox
                    rect={signaturePos}
                    onChange={(newRect) => setSignaturePos(newRect)}
                    label="Signature"
                    minWidth={50}
                    minHeight={25}
                    zoom={zoom}
                  >
                    <img
                      src={signatureDataUrl}
                      alt="Signature Stamp"
                      className="w-full h-full object-contain pointer-events-none"
                    />
                  </TransformBox>
                )}
              </div>
            ) : (
              <div className="p-20 text-xs text-neutral-400">Rendering preview...</div>
            )
          }
        </InteractivePreviewViewport>
      </div>
    </div>
  );
};
