import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import { CanvasShape, PageDimensions, ColorRGBA } from './types';
import { CoordinateTransformer } from './coords';

/**
 * PDF-Lib Vector Renderer Adapter
 * Renders vector shapes, text, drawings, and redactions into pdf-lib PDFDocument
 * with sub-pixel coordinate accuracy.
 */
export async function applyShapesToPdf(
  pdfBuffer: ArrayBuffer,
  shapes: CanvasShape[]
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBuffer.slice(0), { ignoreEncryption: true });
  const helveticaFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const pageCount = doc.getPageCount();

  // Group shapes by page number
  const pageMap = new Map<number, CanvasShape[]>();
  for (const s of shapes) {
    const list = pageMap.get(s.page) || [];
    list.push(s);
    pageMap.set(s.page, list);
  }

  for (let p = 1; p <= pageCount; p++) {
    const pageShapes = pageMap.get(p);
    if (!pageShapes || pageShapes.length === 0) continue;

    const page = doc.getPage(p - 1);
    const { width: pageWidth, height: pageHeight } = page.getSize();
    const rotation = page.getRotation().angle || 0;

    const pageDims: PageDimensions = {
      width: pageWidth,
      height: pageHeight,
      rotation,
    };

    for (const shape of pageShapes) {
      const pdfBox = CoordinateTransformer.normalizedToPdfPoints(shape.rect, pageDims);

      switch (shape.type) {
        case 'redact': {
          // Permanent Solid Blackout Rectangle
          page.drawRectangle({
            x: pdfBox.x,
            y: pdfBox.y,
            width: pdfBox.width,
            height: pdfBox.height,
            color: rgb(0, 0, 0),
            borderColor: rgb(0, 0, 0),
            borderWidth: 1,
            opacity: 1.0,
          });
          break;
        }

        case 'rect': {
          const fill = shape.fillColor && shape.fillColor !== 'transparent'
            ? rgb(shape.fillColor.r, shape.fillColor.g, shape.fillColor.b)
            : undefined;

          const stroke = shape.strokeColor && shape.strokeColor !== 'transparent'
            ? rgb(shape.strokeColor.r, shape.strokeColor.g, shape.strokeColor.b)
            : undefined;

          page.drawRectangle({
            x: pdfBox.x,
            y: pdfBox.y,
            width: pdfBox.width,
            height: pdfBox.height,
            color: fill,
            borderColor: stroke,
            borderWidth: shape.strokeWidth ?? 1.5,
            opacity: shape.opacity ?? 1.0,
          });
          break;
        }

        case 'ellipse': {
          const fill = shape.fillColor && shape.fillColor !== 'transparent'
            ? rgb(shape.fillColor.r, shape.fillColor.g, shape.fillColor.b)
            : undefined;

          const stroke = shape.strokeColor && shape.strokeColor !== 'transparent'
            ? rgb(shape.strokeColor.r, shape.strokeColor.g, shape.strokeColor.b)
            : undefined;

          page.drawEllipse({
            x: pdfBox.x + pdfBox.width / 2,
            y: pdfBox.y + pdfBox.height / 2,
            xScale: pdfBox.width / 2,
            yScale: pdfBox.height / 2,
            color: fill,
            borderColor: stroke,
            borderWidth: shape.strokeWidth ?? 1.5,
            opacity: shape.opacity ?? 1.0,
          });
          break;
        }

        case 'line': {
          const stroke = shape.strokeColor && shape.strokeColor !== 'transparent'
            ? rgb(shape.strokeColor.r, shape.strokeColor.g, shape.strokeColor.b)
            : rgb(0.1, 0.1, 0.1);

          page.drawLine({
            start: { x: pdfBox.x, y: pdfBox.y + pdfBox.height },
            end: { x: pdfBox.x + pdfBox.width, y: pdfBox.y },
            color: stroke,
            thickness: shape.strokeWidth ?? 2,
            opacity: shape.opacity ?? 1.0,
          });
          break;
        }

        case 'arrow': {
          const stroke = shape.strokeColor && shape.strokeColor !== 'transparent'
            ? rgb(shape.strokeColor.r, shape.strokeColor.g, shape.strokeColor.b)
            : rgb(0.1, 0.1, 0.1);

          const startX = pdfBox.x;
          const startY = pdfBox.y + pdfBox.height;
          const endX = pdfBox.x + pdfBox.width;
          const endY = pdfBox.y;

          // Main shaft
          page.drawLine({
            start: { x: startX, y: startY },
            end: { x: endX, y: endY },
            color: stroke,
            thickness: shape.strokeWidth ?? 2.5,
            opacity: shape.opacity ?? 1.0,
          });

          // Arrowhead
          const angle = Math.atan2(endY - startY, endX - startX);
          const headLen = Math.min(18, Math.max(8, pdfBox.width * 0.2));
          const leftHeadX = endX - headLen * Math.cos(angle - Math.PI / 6);
          const leftHeadY = endY - headLen * Math.sin(angle - Math.PI / 6);
          const rightHeadX = endX - headLen * Math.cos(angle + Math.PI / 6);
          const rightHeadY = endY - headLen * Math.sin(angle + Math.PI / 6);

          page.drawLine({
            start: { x: endX, y: endY },
            end: { x: leftHeadX, y: leftHeadY },
            color: stroke,
            thickness: shape.strokeWidth ?? 2.5,
          });
          page.drawLine({
            start: { x: endX, y: endY },
            end: { x: rightHeadX, y: rightHeadY },
            color: stroke,
            thickness: shape.strokeWidth ?? 2.5,
          });
          break;
        }

        case 'text': {
          const textShape = shape as any;
          const textColor = textShape.textColor
            ? rgb(textShape.textColor.r, textShape.textColor.g, textShape.textColor.b)
            : rgb(0, 0, 0);

          // Background box if present
          if (textShape.backgroundColor && textShape.backgroundColor !== 'transparent') {
            const bg = rgb(
              textShape.backgroundColor.r,
              textShape.backgroundColor.g,
              textShape.backgroundColor.b
            );
            page.drawRectangle({
              x: pdfBox.x,
              y: pdfBox.y,
              width: pdfBox.width,
              height: pdfBox.height,
              color: bg,
              opacity: textShape.backgroundColor.a ?? 1.0,
            });
          }

          // Measure font
          const fSize = textShape.fontSize || 14;
          page.drawText(textShape.text || '', {
            x: pdfBox.x + 4,
            y: pdfBox.y + (pdfBox.height - fSize) / 2 + 2,
            size: fSize,
            font: helveticaFont,
            color: textColor,
          });
          break;
        }

        case 'pen': {
          const penShape = shape as any;
          if (penShape.points && penShape.points.length > 1) {
            const stroke = penShape.strokeColor && penShape.strokeColor !== 'transparent'
              ? rgb(penShape.strokeColor.r, penShape.strokeColor.g, penShape.strokeColor.b)
              : rgb(0.1, 0.1, 0.1);

            const isHighlighter = Boolean(penShape.isHighlighter);
            const opacity = isHighlighter ? 0.35 : (penShape.opacity ?? 1.0);
            const thickness = isHighlighter ? 14 : (penShape.strokeWidth ?? 2.5);

            for (let i = 0; i < penShape.points.length - 1; i++) {
              const pt1 = penShape.points[i];
              const pt2 = penShape.points[i + 1];

              const p1Pdf = CoordinateTransformer.normalizedToPdfPoints(
                { x: pt1.x, y: pt1.y, width: 0, height: 0 },
                pageDims
              );
              const p2Pdf = CoordinateTransformer.normalizedToPdfPoints(
                { x: pt2.x, y: pt2.y, width: 0, height: 0 },
                pageDims
              );

              page.drawLine({
                start: { x: p1Pdf.x, y: p1Pdf.y },
                end: { x: p2Pdf.x, y: p2Pdf.y },
                color: stroke,
                thickness,
                opacity,
              });
            }
          }
          break;
        }
      }
    }
  }

  return await doc.save();
}
