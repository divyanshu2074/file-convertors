import React, { useState, useEffect, lazy, Suspense } from 'react';
import { ToolDef, UploadedFile } from '../types';
import { DropZone } from './DropZone';
import { IconResolver } from './IconResolver';
import { X, ArrowLeft, ShieldCheck, Sparkles, Loader2 } from 'lucide-react';
import { setActiveTrackingTool } from '../lib/analytics';

const OrganizeWorkspace = lazy(() => import('./workspaces/OrganizeWorkspace').then((m) => ({ default: m.OrganizeWorkspace })));
const SignWorkspace = lazy(() => import('./workspaces/SignWorkspace').then((m) => ({ default: m.SignWorkspace })));
const EditWorkspace = lazy(() => import('./workspaces/EditWorkspace').then((m) => ({ default: m.EditWorkspace })));
const RedactWorkspace = lazy(() => import('./workspaces/RedactWorkspace').then((m) => ({ default: m.RedactWorkspace })));
const CompareWorkspace = lazy(() => import('./workspaces/CompareWorkspace').then((m) => ({ default: m.CompareWorkspace })));
const ScanWorkspace = lazy(() => import('./workspaces/ScanWorkspace').then((m) => ({ default: m.ScanWorkspace })));
const CropWorkspace = lazy(() => import('./workspaces/CropWorkspace').then((m) => ({ default: m.CropWorkspace })));
const FormsWorkspace = lazy(() => import('./workspaces/FormsWorkspace').then((m) => ({ default: m.FormsWorkspace })));
const OcrWorkspace = lazy(() => import('./workspaces/OcrWorkspace').then((m) => ({ default: m.OcrWorkspace })));
const MboxWorkspace = lazy(() => import('./workspaces/MboxWorkspace').then((m) => ({ default: m.MboxWorkspace })));
const GenericPdfWorkspace = lazy(() => import('./workspaces/GenericPdfWorkspace').then((m) => ({ default: m.GenericPdfWorkspace })));

const WorkspaceFallback = () => (
  <div className="flex flex-col items-center justify-center py-24 space-y-3 text-neutral-500">
    <Loader2 className="w-8 h-8 animate-spin text-neutral-900" />
    <p className="text-xs font-medium">Initializing secure client-side workspace engine...</p>
  </div>
);

interface WorkspaceModalProps {
  tool: ToolDef;
  onClose: () => void;
}

export const WorkspaceModal: React.FC<WorkspaceModalProps> = ({ tool, onClose }) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);

  useEffect(() => {
    setActiveTrackingTool({ id: tool.id, title: tool.title });
    return () => {
      setActiveTrackingTool(null);
    };
  }, [tool]);

  const handleFilesSelected = async (newFiles: File[]) => {
    const loadedFiles: UploadedFile[] = [];

    for (const file of newFiles) {
      // Memory Protection: Do NOT load entire file into memory upfront for mbox-to-csv or files > 200MB!
      // This allows multi-gigabyte MBOX files (e.g. Google Takeout 500MB - 5GB) to stream chunk-by-chunk without OOM crashes.
      const shouldSkipBuffer = tool.id === 'mbox-to-csv' || file.size > 200 * 1024 * 1024;
      const buffer = shouldSkipBuffer ? new ArrayBuffer(0) : await file.arrayBuffer();
      loadedFiles.push({
        id: `file-${Date.now()}-${Math.random()}`,
        file,
        name: file.name,
        size: file.size,
        arrayBuffer: buffer,
      });
    }

    if (tool.multiple) {
      setFiles((prev) => [...prev, ...loadedFiles]);
    } else {
      setFiles(loadedFiles.slice(0, 1));
    }
  };

  const handleRemoveFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleResetFiles = () => {
    setFiles([]);
  };

  const hasFiles = files.length > 0;
  const isCameraTool = tool.id === 'scan-to-pdf';
  const isHtmlTool = tool.id === 'html-to-pdf';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-neutral-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-neutral-50 rounded-2xl sm:rounded-3xl border border-neutral-200 shadow-2xl overflow-hidden flex flex-col max-h-[96vh] sm:max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-3.5 sm:px-6 py-2.5 sm:py-4 bg-white border-b border-neutral-200 gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              onClick={onClose}
              className="p-1 sm:p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center text-white shadow-xs shrink-0`}>
              <IconResolver name={tool.iconName} className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-semibold text-neutral-900 truncate">{tool.title}</h3>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                  <ShieldCheck className="w-3 h-3" />
                  Client-side
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-neutral-500 truncate hidden xs:block">{tool.shortDesc}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {hasFiles && (
              <button
                type="button"
                onClick={handleResetFiles}
                className="text-xs text-neutral-500 hover:text-neutral-800 px-2 sm:px-2.5 py-1.5 rounded-lg hover:bg-neutral-100 cursor-pointer whitespace-nowrap"
              >
                Change Files
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 sm:p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-3 sm:p-6 overflow-y-auto flex-1">
          <Suspense fallback={<WorkspaceFallback />}>
            {/* If camera tool, render directly without dropzone */}
            {isCameraTool ? (
              <ScanWorkspace />
            ) : !hasFiles && !isHtmlTool ? (
              <div className="max-w-xl mx-auto py-3 sm:py-8">
                <DropZone
                  acceptedFiles={tool.acceptedFiles}
                  multiple={tool.multiple}
                  files={files}
                  onFilesSelected={handleFilesSelected}
                  onRemoveFile={handleRemoveFile}
                  title={`Select file${tool.multiple ? 's' : ''} for ${tool.title}`}
                  subtitle={`Supports ${tool.acceptedFiles || 'all document types'}`}
                />
              </div>
            ) : (
              <div>
                {/* Specialized Interactive Workspaces */}
                {tool.id === 'organize-pdf' && files[0] && (
                  <OrganizeWorkspace
                    pdfBuffer={files[0].arrayBuffer}
                    fileName={files[0].name}
                    onClose={onClose}
                  />
                )}

                {tool.id === 'sign-pdf' && files[0] && (
                  <SignWorkspace
                    pdfBuffer={files[0].arrayBuffer}
                    fileName={files[0].name}
                  />
                )}

                {tool.id === 'edit-pdf' && files[0] && (
                  <EditWorkspace
                    pdfBuffer={files[0].arrayBuffer}
                    fileName={files[0].name}
                  />
                )}

                {tool.id === 'redact-pdf' && files[0] && (
                  <RedactWorkspace
                    pdfBuffer={files[0].arrayBuffer}
                    fileName={files[0].name}
                  />
                )}

                {tool.id === 'compare-pdf' && (
                  <CompareWorkspace files={files} />
                )}

                {tool.id === 'crop-pdf' && files[0] && (
                  <CropWorkspace
                    pdfBuffer={files[0].arrayBuffer}
                    fileName={files[0].name}
                  />
                )}

                {tool.id === 'pdf-forms' && files[0] && (
                  <FormsWorkspace
                    pdfBuffer={files[0].arrayBuffer}
                    fileName={files[0].name}
                  />
                )}

                {tool.id === 'ocr-pdf' && files[0] && (
                  <OcrWorkspace
                    pdfBuffer={files[0].arrayBuffer}
                    fileName={files[0].name}
                  />
                )}

                {tool.id === 'mbox-to-csv' && files[0] && (
                  <MboxWorkspace
                    file={files[0].file}
                    arrayBuffer={files[0].arrayBuffer}
                    fileName={files[0].name}
                  />
                )}

                {/* Generic Workspace for remaining tools */}
                {tool.id !== 'organize-pdf' &&
                  tool.id !== 'sign-pdf' &&
                  tool.id !== 'edit-pdf' &&
                  tool.id !== 'redact-pdf' &&
                  tool.id !== 'compare-pdf' &&
                  tool.id !== 'crop-pdf' &&
                  tool.id !== 'pdf-forms' &&
                  tool.id !== 'ocr-pdf' &&
                  tool.id !== 'mbox-to-csv' && (
                    <GenericPdfWorkspace
                      tool={tool}
                      files={files}
                      onFilesReorder={setFiles}
                    />
                  )}
              </div>
            )}
          </Suspense>
        </div>
      </div>
    </div>
  );
};
