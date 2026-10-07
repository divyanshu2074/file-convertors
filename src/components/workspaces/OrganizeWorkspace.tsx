import React, { useState, useEffect } from 'react';
import { RotateCw, Trash2, Undo2, ArrowRight, Download, Check } from 'lucide-react';
import { renderThumbnails, organizePdf } from '../../lib/pdfEngine';
import { downloadUint8Array } from '../../lib/downloadHelper';
import confetti from 'canvas-confetti';

interface PageItem {
  id: string;
  originalPage: number;
  rotation: number;
  dataUrl: string;
  deleted: boolean;
}

interface OrganizeWorkspaceProps {
  pdfBuffer: ArrayBuffer;
  fileName: string;
  onClose: () => void;
}

export const OrganizeWorkspace: React.FC<OrganizeWorkspaceProps> = ({
  pdfBuffer,
  fileName,
  onClose,
}) => {
  const [pages, setPages] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const thumbs = await renderThumbnails(pdfBuffer, 0.4);
        if (mounted) {
          setPages(
            thumbs.map((t, idx) => ({
              id: `page-${idx}-${t.pageNumber}`,
              originalPage: t.pageNumber,
              rotation: 0,
              dataUrl: t.dataUrl,
              deleted: false,
            }))
          );
        }
      } catch (err) {
        console.error('Failed to render thumbnails:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [pdfBuffer]);

  const handleRotate = (index: number) => {
    setPages((prev) =>
      prev.map((p, i) => (i === index ? { ...p, rotation: (p.rotation + 90) % 360 } : p))
    );
  };

  const handleToggleDelete = (index: number) => {
    setPages((prev) =>
      prev.map((p, i) => (i === index ? { ...p, deleted: !p.deleted } : p))
    );
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const updated = [...pages];
    const [movedItem] = updated.splice(draggedIndex, 1);
    updated.splice(index, 0, movedItem);
    setDraggedIndex(index);
    setPages(updated);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSaveOrganized = async () => {
    try {
      setProcessing(true);
      const activePages = pages.filter((p) => !p.deleted);
      if (activePages.length === 0) {
        alert('Please keep at least one page!');
        return;
      }

      const operations = activePages.map((p) => ({
        originalPage: p.originalPage,
        rotation: p.rotation,
      }));

      const organizedData = await organizePdf(pdfBuffer, operations);
      const outName = fileName.replace(/\.pdf$/i, '_organized.pdf');
      downloadUint8Array(organizedData, outName);

      confetti({ particleCount: 70, spread: 60, origin: { y: 0.8 } });
      setDone(true);
    } catch (err) {
      console.error(err);
      alert('Error organizing PDF: ' + String(err));
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-neutral-600">Generating page thumbnails client-side...</p>
      </div>
    );
  }

  const activeCount = pages.filter((p) => !p.deleted).length;

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-neutral-50 rounded-2xl border border-neutral-200">
        <div>
          <p className="text-sm font-semibold text-neutral-900">
            Organizing Pages ({activeCount} active of {pages.length} total)
          </p>
          <p className="text-xs text-neutral-500">
            Drag to reorder • Click rotate to turn 90° • Click trash to delete/restore
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveOrganized}
            disabled={processing || activeCount === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-300 text-white shadow-sm transition-all"
          >
            {done ? <Check className="w-4 h-4 text-emerald-400" /> : <Download className="w-4 h-4" />}
            {processing ? 'Processing...' : done ? 'Downloaded!' : 'Save & Download PDF'}
          </button>
        </div>
      </div>

      {/* Pages Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-h-[60vh] overflow-y-auto p-2">
        {pages.map((page, index) => (
          <div
            key={page.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`group relative rounded-xl border p-2 flex flex-col items-center gap-2 bg-white transition-all cursor-grab active:cursor-grabbing shadow-xs ${
              page.deleted
                ? 'opacity-40 border-dashed border-red-300 bg-red-50/20'
                : 'border-neutral-200 hover:border-neutral-400 hover:shadow-md'
            }`}
          >
            {/* Page number badge */}
            <span className="absolute top-3 left-3 px-2 py-0.5 rounded-md text-[10px] font-bold bg-neutral-900/80 text-white backdrop-blur-xs">
              {index + 1}
            </span>

            {/* Thumbnail Canvas */}
            <div className="w-full aspect-[1/1.4] flex items-center justify-center overflow-hidden rounded-lg bg-neutral-100">
              <img
                src={page.dataUrl}
                alt={`Page ${page.originalPage}`}
                style={{ transform: `rotate(${page.rotation}deg)` }}
                className="max-h-full max-w-full object-contain transition-transform duration-200"
              />
            </div>

            {/* Actions for this page */}
            <div className="flex items-center justify-between w-full pt-1 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => handleRotate(index)}
                title="Rotate 90° clockwise"
                className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => handleToggleDelete(index)}
                title={page.deleted ? 'Restore page' : 'Delete page'}
                className={`p-1.5 rounded-lg transition-colors ${
                  page.deleted
                    ? 'text-emerald-600 hover:bg-emerald-50'
                    : 'text-neutral-400 hover:text-red-600 hover:bg-red-50'
                }`}
              >
                {page.deleted ? <Undo2 className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
