/**
 * Custom Canvas & Vector Annotation Engine Types
 */

export interface ColorRGBA {
  r: number; // 0..1
  g: number; // 0..1
  b: number; // 0..1
  a: number; // 0..1
}

export interface NormalizedRect {
  x: number; // 0..1 (fraction of page width from left)
  y: number; // 0..1 (fraction of page height from top)
  width: number; // 0..1 (fraction of page width)
  height: number; // 0..1 (fraction of page height)
}

export interface PdfPointRect {
  x: number; // points from left
  y: number; // points from bottom
  width: number; // points width
  height: number; // points height
}

export type ShapeType = 'rect' | 'ellipse' | 'line' | 'arrow' | 'text' | 'pen' | 'redact';

export interface BaseShape {
  id: string;
  page: number; // 1-based page number
  type: ShapeType;
  // Normalized 0..1 bounding box or coordinates
  rect: NormalizedRect;
  fillColor?: ColorRGBA | 'transparent';
  strokeColor?: ColorRGBA | 'transparent';
  strokeWidth?: number; // Normalized or point thickness
  opacity?: number; // 0..1
}

export interface TextShape extends BaseShape {
  type: 'text';
  text: string;
  fontSize: number; // points (e.g. 14)
  fontFamily?: string;
  textColor: ColorRGBA;
  backgroundColor?: ColorRGBA | 'transparent';
}

export interface PenShape extends BaseShape {
  type: 'pen';
  // Points normalized relative to page dimensions
  points: { x: number; y: number }[];
  isHighlighter?: boolean;
}

export interface RedactShape extends BaseShape {
  type: 'redact';
  // Text content captured if from text selection
  sourceText?: string;
}

export type CanvasShape = BaseShape | TextShape | PenShape | RedactShape;

export interface TextToken {
  id: string;
  str: string;
  rect: NormalizedRect; // 0..1 relative to page viewport
}

export interface PageDimensions {
  width: number; // standard PDF points
  height: number; // standard PDF points
  rotation: number; // 0, 90, 180, 270
}
