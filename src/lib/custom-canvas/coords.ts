import { NormalizedRect, PdfPointRect, PageDimensions, ColorRGBA } from './types';

/**
 * Coordinate Transformer
 * Handles deterministic conversions between:
 * - DOM Element Screen / Container Pixels
 * - Normalized Unit Space ([0..1])
 * - PDF Specification Points (origin bottom-left, taking rotation into account)
 */
export class CoordinateTransformer {
  /**
   * Convert DOM Mouse/Pointer event coordinates relative to container into Normalized [0..1]
   */
  static clientToNormalized(
    clientX: number,
    clientY: number,
    containerRect: DOMRect
  ): { x: number; y: number } {
    if (containerRect.width === 0 || containerRect.height === 0) {
      return { x: 0, y: 0 };
    }
    const relX = clientX - containerRect.left;
    const relY = clientY - containerRect.top;

    const normX = Math.max(0, Math.min(1, relX / containerRect.width));
    const normY = Math.max(0, Math.min(1, relY / containerRect.height));
    return { x: normX, y: normY };
  }

  /**
   * Convert normalized [0..1] rectangle into DOM layout pixels inside a container
   */
  static normalizedToPixels(
    norm: NormalizedRect,
    containerWidth: number,
    containerHeight: number
  ): { x: number; y: number; width: number; height: number } {
    return {
      x: norm.x * containerWidth,
      y: norm.y * containerHeight,
      width: norm.width * containerWidth,
      height: norm.height * containerHeight,
    };
  }

  /**
   * Convert normalized [0..1] rectangle into exact PDF points (origin at bottom-left)
   * Respects page rotation if specified
   */
  static normalizedToPdfPoints(
    norm: NormalizedRect,
    pageDims: PageDimensions
  ): PdfPointRect {
    const { width: pw, height: ph, rotation = 0 } = pageDims;
    const effectiveRot = ((rotation % 360) + 360) % 360;

    // Normal unrotated page:
    // x = norm.x * pw
    // y = (1 - (norm.y + norm.height)) * ph
    if (effectiveRot === 0) {
      return {
        x: norm.x * pw,
        y: (1 - (norm.y + norm.height)) * ph,
        width: norm.width * pw,
        height: norm.height * ph,
      };
    }

    if (effectiveRot === 90) {
      // 90 deg clockwise rotated: width & height swap visually
      return {
        x: norm.y * pw,
        y: norm.x * ph,
        width: norm.height * pw,
        height: norm.width * ph,
      };
    }

    if (effectiveRot === 180) {
      return {
        x: (1 - (norm.x + norm.width)) * pw,
        y: norm.y * ph,
        width: norm.width * pw,
        height: norm.height * ph,
      };
    }

    if (effectiveRot === 270) {
      return {
        x: (1 - (norm.y + norm.height)) * pw,
        y: (1 - (norm.x + norm.width)) * ph,
        width: norm.height * pw,
        height: norm.width * ph,
      };
    }

    return {
      x: norm.x * pw,
      y: (1 - (norm.y + norm.height)) * ph,
      width: norm.width * pw,
      height: norm.height * ph,
    };
  }

  /**
   * Helper to format ColorRGBA into CSS rgba() string
   */
  static toCssRgba(c?: ColorRGBA | 'transparent', defaultColor = 'rgba(0,0,0,1)'): string {
    if (!c || c === 'transparent') return 'transparent';
    return `rgba(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}, ${c.a ?? 1})`;
  }

  /**
   * Parse hex color string (e.g. #3b82f6) into ColorRGBA
   */
  static hexToRgba(hex: string, alpha = 1.0): ColorRGBA {
    let clean = hex.replace('#', '');
    if (clean.length === 3) {
      clean = clean.split('').map((char) => char + char).join('');
    }
    const num = parseInt(clean, 16);
    return {
      r: ((num >> 16) & 255) / 255,
      g: ((num >> 8) & 255) / 255,
      b: (num & 255) / 255,
      a: alpha,
    };
  }

  /**
   * Convert ColorRGBA to hex string
   */
  static rgbaToHex(c: ColorRGBA): string {
    const r = Math.round(c.r * 255).toString(16).padStart(2, '0');
    const g = Math.round(c.g * 255).toString(16).padStart(2, '0');
    const b = Math.round(c.b * 255).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }
}
