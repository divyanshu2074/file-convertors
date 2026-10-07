import React, { useState, useEffect } from 'react';
import { GitCompare, ChevronLeft, ChevronRight, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { renderPdfPage, extractPdfText } from '../../lib/pdfEngine';
import { UploadedFile } from '../../types';

interface CompareWorkspaceProps {
  files: UploadedFile[];
}

export const CompareWorkspace: React.FC<CompareWorkspaceProps> = ({ files }) => {
  const [page, setPage] = useState(1);
  const [docAUrl, setDocAUrl] = useState<string>('');
  const [docBUrl, setDocBUrl] = useState<string>('');
  const [textA, setTextA] = useState<string>('');
  const [textB, setTextB] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const fileA = files[0];
  const fileB = files[1];

  useEffect(() => {
    if (!fileA || !fileB) return;
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        // Render current page of both documents
        const [resA, resB] = await Promise.all([
          renderPdfPage(fileA.arrayBuffer, page, 1.0).catch(() => null),
          renderPdfPage(fileB.arrayBuffer, page, 1.0).catch(() => null),
        ]);

        // Extract text
        const [txtA, txtB] = await Promise.all([
          extractPdfText(fileA.arrayBuffer).catch(() => null),
          extractPdfText(fileB.arrayBuffer).catch(() => null),
        ]);

        if (mounted) {
          if (resA) setDocAUrl(resA.canvas.toDataURL('image/jpeg', 0.9));
          if (resB) setDocBUrl(resB.canvas.toDataURL('image/jpeg', 0.9));
          if (txtA && txtA.pages[page - 1]) setTextA(txtA.pages[page - 1].text);
          if (txtB && txtB.pages[page - 1]) setTextB(txtB.pages[page - 1].text);
        }
      } catch (err) {
        console.error('Error comparing documents:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [fileA, fileB, page]);

  if (!fileA || !fileB) {
    return (
      <div className="p-12 text-center text-neutral-500">
        <GitCompare className="w-10 h-10 mx-auto text-neutral-400 mb-3" />
        <p className="font-semibold text-neutral-800">Please select two PDF documents to compare</p>
        <p className="text-xs text-neutral-400 mt-1">Upload Original Version and Modified Version</p>
      </div>
    );
  }

  const isExactTextMatch = textA === textB && textA.length > 0;

  return (
    <div className="space-y-5">
      {/* Top Navigator & Status */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-neutral-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <GitCompare className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-neutral-900">Side-by-Side Document Comparison</h4>
            <div className="flex items-center gap-2 mt-0.5">
              {isExactTextMatch ? (
                <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Text content matches exactly on page {page}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-medium text-amber-600">
                  <AlertCircle className="w-3.5 h-3.5" /> Differences detected on page {page}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Page Switcher */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="p-1.5 rounded-lg border border-neutral-200 disabled:opacity-40 hover:bg-neutral-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-medium">Page {page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Side-by-side Visual Viewport */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Document A */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-neutral-100">
            <span className="font-semibold text-neutral-800 truncate max-w-[200px]">Doc A: {fileA.name}</span>
            <span className="text-neutral-400">Original</span>
          </div>
          <div className="h-[48vh] flex items-center justify-center bg-neutral-50 rounded-xl overflow-hidden border border-neutral-100">
            {docAUrl ? (
              <img src={docAUrl} alt="Doc A Preview" className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-xs text-neutral-400">Rendering...</span>
            )}
          </div>
          {textA && (
            <div className="max-h-24 overflow-y-auto p-2 bg-neutral-50 rounded-lg text-[11px] font-mono text-neutral-600">
              {textA.substring(0, 300)}...
            </div>
          )}
        </div>

        {/* Document B */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-neutral-100">
            <span className="font-semibold text-neutral-800 truncate max-w-[200px]">Doc B: {fileB.name}</span>
            <span className="text-neutral-400">Modified</span>
          </div>
          <div className="h-[48vh] flex items-center justify-center bg-neutral-50 rounded-xl overflow-hidden border border-neutral-100">
            {docBUrl ? (
              <img src={docBUrl} alt="Doc B Preview" className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-xs text-neutral-400">Rendering...</span>
            )}
          </div>
          {textB && (
            <div className="max-h-24 overflow-y-auto p-2 bg-neutral-50 rounded-lg text-[11px] font-mono text-neutral-600">
              {textB.substring(0, 300)}...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
