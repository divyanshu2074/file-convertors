import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, Trash2, Download, Check, Sparkles, AlertCircle } from 'lucide-react';
import { jpgToPdf } from '../../lib/pdfEngine';
import { downloadUint8Array } from '../../lib/downloadHelper';
import confetti from 'canvas-confetti';

export const ScanWorkspace: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [filterMode, setFilterMode] = useState<'color' | 'contrast' | 'bw'>('contrast');
  const [capturedPages, setCapturedPages] = useState<{ id: string; dataUrl: string; buffer: ArrayBuffer }[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);

  // Start camera stream
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
        activeStream = s;
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      } catch (err) {
        console.warn('Camera access denied or unavailable:', err);
        setErrorMsg('Camera access is not available or was denied in this environment.');
      }
    })();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleCapture = async () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Apply document contrast/black and white filters
    if (filterMode === 'contrast' || filterMode === 'bw') {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        if (filterMode === 'bw') {
          const val = gray > 140 ? 255 : 0;
          d[i] = val;
          d[i + 1] = val;
          d[i + 2] = val;
        } else {
          // high contrast document enhancement
          const contrastVal = (gray - 128) * 1.5 + 128;
          d[i] = contrastVal;
          d[i + 1] = contrastVal;
          d[i + 2] = contrastVal;
        }
      }
      ctx.putImageData(imgData, 0, 0);
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.9));
    const buffer = await blob.arrayBuffer();

    setCapturedPages((prev) => [...prev, { id: `page-${Date.now()}`, dataUrl, buffer }]);
  };

  const handleRemovePage = (id: string) => {
    setCapturedPages((prev) => prev.filter((p) => p.id !== id));
  };

  const handleGeneratePdf = async () => {
    if (capturedPages.length === 0) return;
    try {
      setProcessing(true);
      const items = capturedPages.map((p, idx) => ({
        name: `scan_page_${idx + 1}.jpg`,
        buffer: p.buffer,
        type: 'image/jpeg',
      }));

      const pdfBytes = await jpgToPdf(items, { margin: 15 });
      downloadUint8Array(pdfBytes, 'scanned_document.pdf');
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.8 } });
      setDone(true);
    } catch (err) {
      console.error(err);
      alert('Error generating PDF: ' + String(err));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {errorMsg ? (
        <div className="p-8 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
          <h4 className="font-semibold text-sm">{errorMsg}</h4>
          <p className="text-xs text-amber-700 max-w-md mx-auto">
            You can also use the <strong>JPG to PDF</strong> tool to convert photos and scanned images directly from your device storage.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Live Camera Viewfinder */}
          <div className="lg:col-span-7 bg-neutral-900 rounded-2xl overflow-hidden p-4 flex flex-col items-center justify-between shadow-md space-y-4">
            <div className="w-full flex items-center justify-between text-white text-xs px-2">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Camera Scanner
              </span>

              {/* Filter mode */}
              <div className="flex bg-neutral-800 p-1 rounded-lg">
                {(['color', 'contrast', 'bw'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setFilterMode(m)}
                    className={`px-2.5 py-1 rounded capitalize text-[11px] ${
                      filterMode === m ? 'bg-white text-neutral-900 font-semibold' : 'text-neutral-400'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative w-full aspect-[4/3] bg-black rounded-xl overflow-hidden flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              {/* Document boundary guide box */}
              <div className="absolute inset-8 border-2 border-dashed border-white/60 rounded-xl pointer-events-none" />
            </div>

            <button
              onClick={handleCapture}
              className="px-6 py-3 rounded-full bg-white text-neutral-900 font-semibold text-xs flex items-center gap-2 shadow-lg hover:bg-neutral-100 transition-transform active:scale-95"
            >
              <Camera className="w-4 h-4 text-rose-600" />
              Capture Document Page
            </button>
          </div>

          {/* Captured Pages Tray */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-neutral-200 p-5 space-y-4 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-neutral-900">
                  Scanned Pages ({capturedPages.length})
                </h4>
                {capturedPages.length > 0 && (
                  <button
                    onClick={() => setCapturedPages([])}
                    className="text-xs text-neutral-500 hover:text-red-600 font-medium"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {capturedPages.length === 0 ? (
                <div className="py-16 text-center text-neutral-400 text-xs border-2 border-dashed border-neutral-200 rounded-xl">
                  Point camera at a document and click "Capture"
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 max-h-[48vh] overflow-y-auto p-1">
                  {capturedPages.map((page, idx) => (
                    <div
                      key={page.id}
                      className="group relative rounded-xl border border-neutral-200 overflow-hidden bg-neutral-50 aspect-[3/4]"
                    >
                      <img src={page.dataUrl} alt={`Scan ${idx + 1}`} className="w-full h-full object-cover" />
                      <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] bg-black/60 text-white font-bold">
                        {idx + 1}
                      </span>
                      <button
                        onClick={() => handleRemovePage(page.id)}
                        className="absolute top-2 right-2 p-1 rounded-md bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleGeneratePdf}
              disabled={processing || capturedPages.length === 0}
              className="w-full py-3 rounded-xl text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-200 text-white shadow-sm flex items-center justify-center gap-2 transition-all"
            >
              {done ? <Check className="w-4 h-4 text-emerald-400" /> : <Download className="w-4 h-4" />}
              {processing ? 'Creating PDF...' : done ? 'Downloaded!' : 'Save Scan as PDF'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
