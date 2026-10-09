import { TextToken, NormalizedRect } from './types';
import { pdfjsLib } from '../pdfWorkerSetup';

/**
 * Text Layer Token Extractor
 * Extracts word/token positions directly from PDF.js getTextContent
 * and translates them to Normalized [0..1] bounding boxes.
 */
export async function extractPageTextTokens(
  pdfBuffer: ArrayBuffer,
  pageNumber: number
): Promise<{ tokens: TextToken[]; viewportWidth: number; viewportHeight: number; rotation: number }> {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer.slice(0)) });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(pageNumber);

  // Unscaled viewport (scale = 1.0)
  const viewport = page.getViewport({ scale: 1.0 });
  const textContent = await page.getTextContent();
  const tokens: TextToken[] = [];

  const vpW = viewport.width;
  const vpH = viewport.height;
  const rotation = (page.rotate || 0) % 360;

  let idx = 0;
  for (const item of textContent.items as any[]) {
    const str = (item.str || '').trim();
    if (!str) continue;

    // item.transform is [scaleX, skewY, skewX, scaleY, transX, transY]
    // where transX, transY are in PDF points with bottom-left origin
    const tx = item.transform[4];
    const ty = item.transform[5];
    const itemW = item.width || 10;
    const itemH = item.height || Math.abs(item.transform[3]) || 12;

    // Convert PDF points (bottom-left) to viewport percentage [0..1] (top-left)
    const normX = Math.max(0, Math.min(1, tx / vpW));
    const normY = Math.max(0, Math.min(1, (vpH - (ty + itemH)) / vpH));
    const normW = Math.max(0, Math.min(1, itemW / vpW));
    const normH = Math.max(0, Math.min(1, itemH / vpH));

    tokens.push({
      id: `tok-${pageNumber}-${idx++}`,
      str,
      rect: {
        x: normX,
        y: normY,
        width: normW,
        height: normH,
      },
    });
  }

  return {
    tokens,
    viewportWidth: vpW,
    viewportHeight: vpH,
    rotation,
  };
}

/**
 * Combine contiguous or overlapping text token rectangles into consolidated lines
 */
export function mergeTextTokensIntoBoxes(tokens: TextToken[]): NormalizedRect[] {
  if (tokens.length === 0) return [];

  // Group tokens that share approximately the same vertical line (within 0.015 fraction)
  const lines: TextToken[][] = [];
  const sorted = [...tokens].sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x);

  for (const tok of sorted) {
    const existingLine = lines.find((line) => {
      const lineY = line[0].rect.y;
      return Math.abs(lineY - tok.rect.y) < 0.018;
    });

    if (existingLine) {
      existingLine.push(tok);
    } else {
      lines.push([tok]);
    }
  }

  return lines.map((line) => {
    let minX = 1;
    let minY = 1;
    let maxX = 0;
    let maxY = 0;

    for (const t of line) {
      minX = Math.min(minX, t.rect.x);
      minY = Math.min(minY, t.rect.y);
      maxX = Math.max(maxX, t.rect.x + t.rect.width);
      maxY = Math.max(maxY, t.rect.y + t.rect.height);
    }

    return {
      x: minX,
      y: minY,
      width: Math.max(0.01, maxX - minX),
      height: Math.max(0.01, maxY - minY),
    };
  });
}
