export type ToolCategory =
  | 'all'
  | 'organize'
  | 'optimize'
  | 'convert-to'
  | 'convert-from'
  | 'edit-security'
  | 'advanced';

export interface ToolDef {
  id: string;
  title: string;
  shortDesc: string;
  category: ToolCategory;
  iconName: string;
  color: string;
  acceptedFiles: string; // e.g. "application/pdf" or "image/*" or ".docx,.xlsx,.pptx"
  multiple?: boolean;
  badge?: string;
}

export interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  arrayBuffer: ArrayBuffer;
  pageCount?: number;
  previewUrl?: string;
}

export interface PageThumbnail {
  pageNumber: number; // 1-based original
  rotation: number; // 0, 90, 180, 270
  canvasDataUrl: string;
  deleted?: boolean;
}

export type ProcessingState = 'idle' | 'processing' | 'success' | 'error';
