import React, { useState } from 'react';
import { ScanText, Download, Copy, Check, Sparkles, Languages } from 'lucide-react';
import { performPdfOcr, OcrProgress } from '../../lib/ocrEngine';
import { downloadBlob } from '../../lib/downloadHelper';
import confetti from 'canvas-confetti';

interface OcrWorkspaceProps {
  pdfBuffer: ArrayBuffer;
  fileName: string;
}

export const OcrWorkspace: React.FC<OcrWorkspaceProps> = ({ pdfBuffer, fileName }) => {
  const [language, setLanguage] = useState('eng');
  const [progressInfo, setProgressInfo] = useState<OcrProgress | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleStartOcr = async () => {
    try {
      setProcessing(true);
      const res = await performPdfOcr(pdfBuffer, language, (info) => {
        setProgressInfo(info);
      });
      setExtractedText(res.fullText);
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.8 } });
    } catch (err) {
      console.error(err);
      alert('Error during OCR recognition: ' + String(err));
    } finally {
      setProcessing(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(extractedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([extractedText], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, fileName.replace(/\.pdf$/i, '_ocr_text.txt'));
  };

  return (
    <div className="space-y-6">
      {/* Configuration & Action Card */}
      <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
            <ScanText className="w-4 h-4 text-purple-600" />
            Client-Side Optical Character Recognition (OCR)
          </h4>
          <p className="text-xs text-neutral-500">
            Extracts text directly in your browser using WebAssembly. No data leaves your computer.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Language selector */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 text-xs">
            <Languages className="w-3.5 h-3.5 text-neutral-500" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={processing}
              className="bg-transparent border-none text-neutral-800 font-medium focus:outline-none cursor-pointer"
            >
              <option value="eng">English</option>
              <option value="spa">Spanish (Español)</option>
              <option value="fra">French (Français)</option>
              <option value="deu">German (Deutsch)</option>
              <option value="ita">Italian (Italiano)</option>
              <option value="hin">Hindi</option>
            </select>
          </div>

          <button
            onClick={handleStartOcr}
            disabled={processing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-300 text-white shadow-sm transition-all"
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            {processing ? 'Processing OCR...' : 'Start OCR Extraction'}
          </button>
        </div>
      </div>

      {/* Progress Indicator */}
      {processing && progressInfo && (
        <div className="p-4 rounded-xl bg-purple-50 border border-purple-100 space-y-2">
          <div className="flex justify-between text-xs text-purple-900 font-medium">
            <span>{progressInfo.status}</span>
            <span>{Math.round(progressInfo.progress * 100)}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-purple-200 overflow-hidden">
            <div
              className="h-full bg-purple-600 transition-all duration-300"
              style={{ width: `${Math.round(progressInfo.progress * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Extracted Text Result Box */}
      {extractedText && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-700">Extracted Text</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 text-xs text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
              <button
                onClick={handleDownloadTxt}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-800 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download as .TXT
              </button>
            </div>
          </div>

          <textarea
            readOnly
            value={extractedText}
            rows={14}
            className="w-full p-4 rounded-xl border border-neutral-200 bg-white font-mono text-xs text-neutral-800 focus:outline-none"
          />
        </div>
      )}
    </div>
  );
};
