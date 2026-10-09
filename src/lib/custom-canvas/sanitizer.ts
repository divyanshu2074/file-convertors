import { PDFDocument } from 'pdf-lib';
import { pdfjsLib } from '../pdfWorkerSetup';
import { CanvasShape } from './types';

/**
 * True Irreversible Redaction:
 * Standard PDF viewers (Acrobat, Chrome, Preview) can still select underlying text
 * if only a vector overlay box is drawn over the text.
 *
 * Professional PDF sanitization platforms (e.g. Adobe Acrobat Pro, SmallPDF, PDF24)
 * sanitize redacted pages by rendering the target page content and baked blackout
 * rectangles onto an ultra-sharp high-fidelity canvas (2.0x DPI scale) and replacing
 * the page content with the rasterized sanitized layer.
 *
 * This completely purges and eliminates all underlying text streams, glyphs, font objects,
 * and searchable metadata from the document binary, making text selection physically impossible.
 */
export async function sanitizeAndRedactPdf(
  pdfBuffer: ArrayBuffer,
  redactions: CanvasShape[]
): Promise<Uint8Array> {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer.slice(0)) });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  // Group redactions by page number
  const redactionsByPage = new Map<number, CanvasShape[]>();
  for (const r of redactions) {
    const list = redactionsByPage.get(r.page) || [];
    list.push(r);
    redactionsByPage.set(r.page, list);
  }

  // Load existing doc structure
  const originalDoc = await PDFDocument.load(pdfBuffer.slice(0), { ignoreEncryption: true });
  const sanitizedDoc = await PDFDocument.create();

  // Scale factor for crisp retina-quality rendering (2.0 = 144 DPI)
  const renderScale = 2.0;

  for (let p = 1; p <= numPages; p++) {
    const pageRedactions = redactionsByPage.get(p);

    if (!pageRedactions || pageRedactions.length === 0) {
      // Unredacted pages: copy vector page directly to preserve perfect vector text and links
      const [copiedPage] = await sanitizedDoc.copyPages(originalDoc, [p - 1]);
      sanitizedDoc.addPage(copiedPage);
    } else {
      // Redacted page: render to canvas, draw solid black boxes over underlying pixels,
      // and re-embed. Underlying text stream is completely annihilated.
      const page = await pdf.getPage(p);
      const viewport = page.getViewport({ scale: renderScale });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error('2D Canvas context unavailable');

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 1. Render page content
      await page.render({ canvasContext: ctx, viewport } as any).promise;

      // 2. Burn solid black redaction boxes permanently into the pixel buffer
      ctx.fillStyle = '#000000';
      const bleed = 2; // anti-aliasing edge purge bleed
      for (const r of pageRedactions) {
        // r.rect is in normalized fractions [0..1]
        const boxX = Math.max(0, r.rect.x * canvas.width - bleed);
        const boxY = Math.max(0, r.rect.y * canvas.height - bleed);
        const boxW = Math.min(canvas.width - boxX, r.rect.width * canvas.width + bleed * 2);
        const boxH = Math.min(canvas.height - boxY, r.rect.height * canvas.height + bleed * 2);

        ctx.fillRect(boxX, boxY, boxW, boxH);
      }

      // 3. Export image and embed into sanitized document
      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b || new Blob()), 'image/jpeg', 0.94)
      );
      const imgBytes = new Uint8Array(await blob.arrayBuffer());
      const embeddedJpg = await sanitizedDoc.embedJpg(imgBytes);

      // Add page with original unscaled PDF dimensions (points)
      const origViewport = page.getViewport({ scale: 1.0 });
      const newPage = sanitizedDoc.addPage([origViewport.width, origViewport.height]);

      newPage.drawImage(embeddedJpg, {
        x: 0,
        y: 0,
        width: origViewport.width,
        height: origViewport.height,
      });
    }
  }

  return await sanitizedDoc.save();
}
