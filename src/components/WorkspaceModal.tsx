import React, { useState, useEffect } from 'react';
import { ToolDef, UploadedFile } from '../types';
import { DropZone } from './DropZone';
import { IconResolver } from './IconResolver';
import { X, ArrowLeft, ShieldCheck, Sparkles } from 'lucide-react';
import { setActiveTrackingTool } from '../lib/analytics';
import { OrganizeWorkspace } from './workspaces/OrganizeWorkspace';
import { SignWorkspace } from './workspaces/SignWorkspace';
import { EditWorkspace } from './workspaces/EditWorkspace';
import { RedactWorkspace } from './workspaces/RedactWorkspace';
import { CompareWorkspace } from './workspaces/CompareWorkspace';
import { ScanWorkspace } from './workspaces/ScanWorkspace';
import { CropWorkspace } from './workspaces/CropWorkspace';
import { FormsWorkspace } from './workspaces/FormsWorkspace';
import { OcrWorkspace } from './workspaces/OcrWorkspace';
import { GenericPdfWorkspace } from './workspaces/GenericPdfWorkspace';

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
      const buffer = await file.arrayBuffer();
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

              {/* Generic Workspace for remaining tools */}
              {tool.id !== 'organize-pdf' &&
                tool.id !== 'sign-pdf' &&
                tool.id !== 'edit-pdf' &&
                tool.id !== 'redact-pdf' &&
                tool.id !== 'compare-pdf' &&
                tool.id !== 'crop-pdf' &&
                tool.id !== 'pdf-forms' &&
                tool.id !== 'ocr-pdf' && (
                  <GenericPdfWorkspace
                    tool={tool}
                    files={files}
                    onFilesReorder={setFiles}
                  />
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
