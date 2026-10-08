import React, { useRef, useState } from 'react';
import { UploadCloud, File as FileIcon, X, Plus } from 'lucide-react';
import { UploadedFile } from '../types';

interface DropZoneProps {
  acceptedFiles: string;
  multiple?: boolean;
  files: UploadedFile[];
  onFilesSelected: (files: File[]) => void;
  onRemoveFile: (id: string) => void;
  title?: string;
  subtitle?: string;
}

export const DropZone: React.FC<DropZoneProps> = ({
  acceptedFiles,
  multiple = false,
  files,
  onFilesSelected,
  onRemoveFile,
  title = 'Select PDF files',
  subtitle = 'or drop files right here',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="w-full space-y-4">
      {/* File Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragOver
            ? 'border-neutral-900 bg-neutral-100/80 scale-[1.01]'
            : 'border-neutral-300 hover:border-neutral-400 bg-neutral-50/60 hover:bg-neutral-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFiles === 'camera' ? undefined : acceptedFiles}
          multiple={multiple}
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center gap-3 pointer-events-none">
          <div className="w-12 h-12 rounded-2xl bg-white border border-neutral-200/80 flex items-center justify-center text-neutral-700 shadow-sm">
            <UploadCloud className="w-6 h-6 text-neutral-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-800">{title}</p>
            <p className="text-xs text-neutral-500 mt-0.5">{subtitle}</p>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-900 text-white shadow-sm mt-1">
            Choose Files
          </div>
        </div>
      </div>

      {/* Uploaded File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
              Selected Files ({files.length})
            </span>
            {multiple && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1 text-xs text-neutral-700 hover:text-neutral-950 font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                Add More
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
            {files.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-xl bg-white border border-neutral-200/80 shadow-xs text-left"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
                    <FileIcon className="w-4 h-4 text-neutral-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-neutral-800 truncate">{item.name}</p>
                    <p className="text-[11px] text-neutral-400">{formatSize(item.size)}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFile(item.id);
                  }}
                  className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
