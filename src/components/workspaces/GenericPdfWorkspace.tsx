import React, { useState } from 'react';
import { ToolDef, UploadedFile } from '../../types';
import {
  mergePdfs,
  splitPdf,
  compressPdf,
  rotatePdf,
  addPageNumbers,
  watermarkPdf,
  protectPdf,
  unlockPdf,
  convertToPdfA,
  repairPdf,
  pdfToJpg,
  jpgToPdf,
} from '../../lib/pdfEngine';
import {
  convertPdfToDocx,
  convertPdfToPptx,
  convertPdfToExcel,
  convertDocxToPdf,
  convertExcelToPdf,
  convertPptxToPdf,
  convertHtmlToPdf,
} from '../../lib/officeEngine';
import { downloadUint8Array, downloadBlob, downloadZip } from '../../lib/downloadHelper';
import { Download, Check, ArrowDown, ArrowUp, Sparkles, FileType } from 'lucide-react';
import confetti from 'canvas-confetti';

interface GenericWorkspaceProps {
  tool: ToolDef;
  files: UploadedFile[];
  onFilesReorder?: (newFiles: UploadedFile[]) => void;
}

export const GenericPdfWorkspace: React.FC<GenericWorkspaceProps> = ({ tool, files, onFilesReorder }) => {
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Tool specific states
  const [compressLevel, setCompressLevel] = useState<'recommended' | 'extreme' | 'low'>('recommended');
  const [splitMode, setSplitMode] = useState<'range' | 'all'>('range');
  const [splitRanges, setSplitRanges] = useState('1-2, 3-5');
  const [rotateAngle, setRotateAngle] = useState(90);
  const [pageNumberPos, setPageNumberPos] = useState<any>('bottom-center');
  const [pageNumberFormat, setPageNumberFormat] = useState<any>('page_n_of_total');
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.25);
  const [password, setPassword] = useState('');
  const [htmlInput, setHtmlInput] = useState(
    '<h1>Invoice Report</h1>\n<p>Generated automatically via 100% Client-Side PDF Suite.</p>\n<p>No server uploads required.</p>'
  );

  const mainFile = files[0];

  const handleExecute = async () => {
    try {
      setProcessing(true);
      setStatusMessage('Processing locally in-browser...');

      switch (tool.id) {
        case 'merge-pdf': {
          if (files.length < 2) {
            alert('Please select at least 2 PDF files to merge.');
            return;
          }
          const buffers = files.map((f) => f.arrayBuffer);
          const merged = await mergePdfs(buffers);
          downloadUint8Array(merged, 'merged_document.pdf');
          break;
        }

        case 'split-pdf': {
          if (!mainFile) return;
          const groups: number[][] = [];

          if (splitMode === 'all') {
            const { PDFDocument } = await import('pdf-lib');
            const doc = await PDFDocument.load(mainFile.arrayBuffer, { ignoreEncryption: true });
            const pageCount = doc.getPageCount();
            for (let p = 1; p <= pageCount; p++) {
              groups.push([p]);
            }
          } else {
            // Parse ranges e.g. "1-2, 3-5, 6"
            const parts = splitRanges.split(',').map((s) => s.trim());
            for (const part of parts) {
              if (part.includes('-')) {
                const [start, end] = part.split('-').map((n) => parseInt(n.trim()));
                if (!isNaN(start) && !isNaN(end)) {
                  const rangeArr = [];
                  for (let k = start; k <= end; k++) rangeArr.push(k);
                  groups.push(rangeArr);
                }
              } else {
                const single = parseInt(part);
                if (!isNaN(single)) groups.push([single]);
              }
            }
            if (groups.length === 0) groups.push([1]);
          }

          const results = await splitPdf(mainFile.arrayBuffer, groups);
          if (results.length === 0) {
            alert('No valid pages found in the specified range.');
            return;
          }

          if (results.length === 1) {
            downloadUint8Array(results[0].data, results[0].filename);
          } else {
            await downloadZip(
              results.map((r) => ({ name: r.filename, data: r.data })),
              'split_pdfs.zip'
            );
          }
          break;
        }

        case 'compress-pdf': {
          if (!mainFile) return;
          const compressed = await compressPdf(mainFile.arrayBuffer, compressLevel);
          downloadUint8Array(compressed, mainFile.name.replace(/\.pdf$/i, '_compressed.pdf'));
          break;
        }

        case 'rotate-pdf': {
          if (!mainFile) return;
          const rotated = await rotatePdf(mainFile.arrayBuffer, rotateAngle);
          downloadUint8Array(rotated, mainFile.name.replace(/\.pdf$/i, '_rotated.pdf'));
          break;
        }

        case 'page-numbers': {
          if (!mainFile) return;
          const numbered = await addPageNumbers(mainFile.arrayBuffer, {
            position: pageNumberPos,
            format: pageNumberFormat,
          });
          downloadUint8Array(numbered, mainFile.name.replace(/\.pdf$/i, '_numbered.pdf'));
          break;
        }

        case 'watermark-pdf': {
          if (!mainFile) return;
          const watermarked = await watermarkPdf(mainFile.arrayBuffer, {
            text: watermarkText,
            opacity: watermarkOpacity,
            angle: 45,
            fontSize: 48,
          });
          downloadUint8Array(watermarked, mainFile.name.replace(/\.pdf$/i, '_watermarked.pdf'));
          break;
        }

        case 'protect-pdf': {
          if (!mainFile) return;
          if (!password.trim()) {
            alert('Please enter a password to protect your PDF.');
            return;
          }
          const protectedData = await protectPdf(mainFile.arrayBuffer, password);
          downloadUint8Array(protectedData, mainFile.name.replace(/\.pdf$/i, '_protected.pdf'));
          break;
        }

        case 'unlock-pdf': {
          if (!mainFile) return;
          const unlocked = await unlockPdf(mainFile.arrayBuffer, password);
          downloadUint8Array(unlocked, mainFile.name.replace(/\.pdf$/i, '_unlocked.pdf'));
          break;
        }

        case 'pdf-to-pdfa': {
          if (!mainFile) return;
          const pdfa = await convertToPdfA(mainFile.arrayBuffer);
          downloadUint8Array(pdfa, mainFile.name.replace(/\.pdf$/i, '_archived_pdfa.pdf'));
          break;
        }

        case 'repair-pdf': {
          if (!mainFile) return;
          const repaired = await repairPdf(mainFile.arrayBuffer);
          downloadUint8Array(repaired, mainFile.name.replace(/\.pdf$/i, '_repaired.pdf'));
          break;
        }

        case 'pdf-to-word': {
          if (!mainFile) return;
          const docxBlob = await convertPdfToDocx(mainFile.arrayBuffer);
          downloadBlob(docxBlob, mainFile.name.replace(/\.pdf$/i, '.docx'));
          break;
        }

        case 'pdf-to-powerpoint': {
          if (!mainFile) return;
          const pptxBlob = await convertPdfToPptx(mainFile.arrayBuffer);
          downloadBlob(pptxBlob, mainFile.name.replace(/\.pdf$/i, '.pptx'));
          break;
        }

        case 'pdf-to-excel': {
          if (!mainFile) return;
          const xlsxBlob = await convertPdfToExcel(mainFile.arrayBuffer);
          downloadBlob(xlsxBlob, mainFile.name.replace(/\.pdf$/i, '.xlsx'));
          break;
        }

        case 'pdf-to-jpg': {
          if (!mainFile) return;
          const pageImages = await pdfToJpg(mainFile.arrayBuffer, { scale: 2.0, quality: 0.9 });
          if (pageImages.length === 1) {
            downloadBlob(pageImages[0].blob, `${mainFile.name.replace(/\.pdf$/i, '')}_page_1.jpg`);
          } else {
            await downloadZip(
              pageImages.map((p) => ({
                name: `page_${p.pageNumber}.jpg`,
                data: p.blob,
              })),
              `${mainFile.name.replace(/\.pdf$/i, '')}_images.zip`
            );
          }
          break;
        }

        case 'word-to-pdf': {
          if (!mainFile) return;
          const pdfBytes = await convertDocxToPdf(mainFile.arrayBuffer);
          downloadUint8Array(pdfBytes, mainFile.name.replace(/\.docx?$/i, '.pdf'));
          break;
        }

        case 'excel-to-pdf': {
          if (!mainFile) return;
          const pdfBytes = await convertExcelToPdf(mainFile.arrayBuffer);
          downloadUint8Array(pdfBytes, mainFile.name.replace(/\.(xlsx|xls|csv)$/i, '.pdf'));
          break;
        }

        case 'powerpoint-to-pdf': {
          if (!mainFile) return;
          const pdfBytes = await convertPptxToPdf(mainFile.arrayBuffer);
          downloadUint8Array(pdfBytes, mainFile.name.replace(/\.(pptx|ppt)$/i, '.pdf'));
          break;
        }

        case 'jpg-to-pdf': {
          if (files.length === 0) return;
          const items = files.map((f) => ({
            name: f.name,
            buffer: f.arrayBuffer,
            type: f.file.type || 'image/jpeg',
          }));
          const pdfBytes = await jpgToPdf(items);
          downloadUint8Array(pdfBytes, 'images_converted.pdf');
          break;
        }

        case 'html-to-pdf': {
          let content = htmlInput;
          if (mainFile) {
            const dec = new TextDecoder();
            content = dec.decode(mainFile.arrayBuffer);
          }
          const pdfBytes = await convertHtmlToPdf(content);
          downloadUint8Array(pdfBytes, 'webpage_document.pdf');
          break;
        }

        default:
          alert('Tool action executed.');
          break;
      }

      confetti({ particleCount: 70, spread: 60, origin: { y: 0.8 } });
      setDone(true);
    } catch (err) {
      console.error(err);
      alert('Operation failed: ' + String(err));
    } finally {
      setProcessing(false);
    }
  };

  const moveFile = (index: number, direction: 'up' | 'down') => {
    if (!onFilesReorder) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= files.length) return;
    const updated = [...files];
    const [item] = updated.splice(index, 1);
    updated.splice(targetIdx, 0, item);
    onFilesReorder(updated);
  };

  return (
    <div className="space-y-6">
      {/* Tool-specific configuration controls */}
      <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-xs space-y-4 text-left">
        <h4 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
          <FileType className="w-4 h-4 text-neutral-600" />
          {tool.title} Settings
        </h4>

        {/* Merge: Reorderable list */}
        {tool.id === 'merge-pdf' && (
          <div className="space-y-2">
            <p className="text-xs text-neutral-500">Order of files to merge into the final PDF:</p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {files.map((file, idx) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs"
                >
                  <span className="font-medium text-neutral-800 truncate max-w-xs">
                    {idx + 1}. {file.name}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveFile(idx, 'up')}
                      className="p-1 rounded hover:bg-neutral-200 disabled:opacity-30"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === files.length - 1}
                      onClick={() => moveFile(idx, 'down')}
                      className="p-1 rounded hover:bg-neutral-200 disabled:opacity-30"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Compress PDF */}
        {tool.id === 'compress-pdf' && (
          <div className="space-y-2">
            <span className="text-xs text-neutral-500 font-medium">Select Compression Profile:</span>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {[
                { id: 'extreme', title: 'Extreme', desc: 'Lowest file size, medium quality' },
                { id: 'recommended', title: 'Recommended', desc: 'Good balance of quality & size' },
                { id: 'low', title: 'High Quality', desc: 'Minimal compression, best visuals' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setCompressLevel(opt.id as any)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    compressLevel === opt.id
                      ? 'border-neutral-900 bg-neutral-900 text-white shadow-xs'
                      : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                  }`}
                >
                  <div className="font-semibold">{opt.title}</div>
                  <div className={`text-[10px] mt-0.5 ${compressLevel === opt.id ? 'text-neutral-300' : 'text-neutral-400'}`}>
                    {opt.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Split PDF */}
        {tool.id === 'split-pdf' && (
          <div className="space-y-3">
            <span className="text-xs text-neutral-700 font-medium">Split Method:</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setSplitMode('all')}
                className={`py-2 px-3 rounded-xl border font-medium transition-all ${
                  splitMode === 'all'
                    ? 'border-neutral-900 bg-neutral-900 text-white shadow-xs'
                    : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                }`}
              >
                Extract All Pages (Individual PDFs)
              </button>
              <button
                type="button"
                onClick={() => setSplitMode('range')}
                className={`py-2 px-3 rounded-xl border font-medium transition-all ${
                  splitMode === 'range'
                    ? 'border-neutral-900 bg-neutral-900 text-white shadow-xs'
                    : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                }`}
              >
                Custom Page Ranges
              </button>
            </div>

            {splitMode === 'range' && (
              <div className="space-y-1.5 pt-1">
                <span className="text-xs text-neutral-500 font-medium">Page Ranges to Extract:</span>
                <input
                  type="text"
                  value={splitRanges}
                  onChange={(e) => setSplitRanges(e.target.value)}
                  placeholder="e.g. 1-2, 3-5, 8"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-none"
                />
                <p className="text-[11px] text-neutral-400">
                  Enter comma-separated page ranges (e.g. 1-2, 3-5). Multiple ranges will be bundled into a ZIP archive.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Rotate PDF */}
        {tool.id === 'rotate-pdf' && (
          <div className="space-y-2">
            <span className="text-xs text-neutral-700 font-medium">Rotation Angle:</span>
            <div className="flex gap-2 text-xs">
              {[
                { angle: 90, label: '90° Clockwise' },
                { angle: 180, label: '180° Upside Down' },
                { angle: 270, label: '270° Counter-Clockwise' },
              ].map((r) => (
                <button
                  key={r.angle}
                  type="button"
                  onClick={() => setRotateAngle(r.angle)}
                  className={`px-3 py-2 rounded-xl border font-medium ${
                    rotateAngle === r.angle
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-200 hover:bg-neutral-50'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Page Numbers */}
        {tool.id === 'page-numbers' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-xs text-neutral-700 font-medium">Position:</span>
              <select
                value={pageNumberPos}
                onChange={(e) => setPageNumberPos(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200"
              >
                <option value="bottom-center">Bottom Center</option>
                <option value="bottom-right">Bottom Right</option>
                <option value="bottom-left">Bottom Left</option>
                <option value="top-center">Top Center</option>
                <option value="top-right">Top Right</option>
              </select>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-neutral-700 font-medium">Number Format:</span>
              <select
                value={pageNumberFormat}
                onChange={(e) => setPageNumberFormat(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200"
              >
                <option value="page_n_of_total">Page X of Y</option>
                <option value="n_of_total">X / Y</option>
                <option value="page_n">Page X</option>
                <option value="n">X</option>
              </select>
            </div>
          </div>
        )}

        {/* Watermark */}
        {tool.id === 'watermark-pdf' && (
          <div className="space-y-3">
            <div className="space-y-1">
              <span className="text-xs text-neutral-700 font-medium">Watermark Text:</span>
              <input
                type="text"
                value={watermarkText}
                onChange={(e) => setWatermarkText(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200"
              />
            </div>
            <div className="space-y-1">
              <span className="text-xs text-neutral-700 font-medium">
                Opacity: {Math.round(watermarkOpacity * 100)}%
              </span>
              <input
                type="range"
                min={0.05}
                max={0.8}
                step={0.05}
                value={watermarkOpacity}
                onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                className="w-full accent-neutral-900"
              />
            </div>
          </div>
        )}

        {/* Protect / Unlock Password */}
        {(tool.id === 'protect-pdf' || tool.id === 'unlock-pdf') && (
          <div className="space-y-1">
            <span className="text-xs text-neutral-700 font-medium">Password:</span>
            <input
              type="password"
              placeholder={tool.id === 'protect-pdf' ? 'Enter password to protect...' : 'Enter password if locked...'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200"
            />
          </div>
        )}

        {/* HTML to PDF input */}
        {tool.id === 'html-to-pdf' && (
          <div className="space-y-2">
            <span className="text-xs text-neutral-700 font-medium">Or Paste HTML / Webpage markup:</span>
            <textarea
              rows={5}
              value={htmlInput}
              onChange={(e) => setHtmlInput(e.target.value)}
              className="w-full p-3 font-mono text-xs rounded-xl border border-neutral-200 focus:outline-none"
            />
          </div>
        )}

        {/* Conversion feedback banner */}
        {(tool.id.includes('to-') || tool.id === 'repair-pdf' || tool.id === 'pdf-to-pdfa') && (
          <div className="p-3 bg-neutral-50 rounded-xl text-xs text-neutral-600 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              Engine executes 100% in local memory with zero data leaving your device.
            </span>
          </div>
        )}
      </div>

      {/* Main Execute Button */}
      <button
        onClick={handleExecute}
        disabled={processing || (files.length === 0 && tool.id !== 'html-to-pdf')}
        className="w-full py-3.5 rounded-2xl text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-200 text-white shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
      >
        {done ? <Check className="w-4 h-4 text-emerald-400" /> : <Download className="w-4 h-4" />}
        {processing ? (statusMessage || 'Processing...') : done ? 'Completed & Downloaded!' : `Convert & Download with ${tool.title}`}
      </button>
    </div>
  );
};
