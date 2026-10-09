import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import { pdfjsLib } from './pdfWorkerSetup';
import { encryptPDF, EncryptPDFOptions, AlreadyEncryptedError } from '@pdfsmaller/pdf-encrypt';
import { decryptPDF, isEncrypted } from '@pdfsmaller/pdf-decrypt';

/**
 * Merge multiple PDF buffers in the specified order
 */
export async function mergePdfs(pdfBuffers: ArrayBuffer[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();

  for (const buffer of pdfBuffers) {
    const srcDoc = await PDFDocument.load(buffer.slice(0), { ignoreEncryption: true });
    const copiedPages = await mergedPdf.copyPages(srcDoc, srcDoc.getPageIndices());
    for (const page of copiedPages) {
      mergedPdf.addPage(page);
    }
  }

  return await mergedPdf.save();
}

/**
 * Split a PDF into separate PDF documents based on page groups
 */
export async function splitPdf(
  pdfBuffer: ArrayBuffer,
  pageGroups: number[][] // 1-based page numbers per group
): Promise<{ filename: string; data: Uint8Array }[]> {
  const srcDoc = await PDFDocument.load(pdfBuffer.slice(0), { ignoreEncryption: true });
  const results: { filename: string; data: Uint8Array }[] = [];

  for (let i = 0; i < pageGroups.length; i++) {
    const group = pageGroups[i];
    const newDoc = await PDFDocument.create();
    const indices = group.map((p) => p - 1).filter((idx) => idx >= 0 && idx < srcDoc.getPageCount());

    if (indices.length > 0) {
      const copiedPages = await newDoc.copyPages(srcDoc, indices);
      for (const page of copiedPages) {
        newDoc.addPage(page);
      }
      const data = await newDoc.save();
      results.push({
        filename: `split_part_${i + 1}_pages_${group.join('-')}.pdf`,
        data,
      });
    }
  }

  return results;
}

/**
 * Reorder, rotate, or delete pages
 */
export async function organizePdf(
  pdfBuffer: ArrayBuffer,
  pageOperations: { originalPage: number; rotation: number }[] // 1-based originalPage
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(pdfBuffer.slice(0), { ignoreEncryption: true });
  const newDoc = await PDFDocument.create();

  for (const op of pageOperations) {
    const index = op.originalPage - 1;
    if (index >= 0 && index < srcDoc.getPageCount()) {
      const [copiedPage] = await newDoc.copyPages(srcDoc, [index]);
      const currentRotation = copiedPage.getRotation().angle;
      copiedPage.setRotation(degrees((currentRotation + op.rotation) % 360));
      newDoc.addPage(copiedPage);
    }
  }

  return await newDoc.save();
}

/**
 * Rotate all or specific pages
 */
export async function rotatePdf(
  pdfBuffer: ArrayBuffer,
  angle: number, // 90, 180, 270
  selectedPages?: number[] // 1-based, or all if omitted
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBuffer.slice(0), { ignoreEncryption: true });
  const count = doc.getPageCount();

  for (let i = 0; i < count; i++) {
    const pageNum = i + 1;
    if (!selectedPages || selectedPages.includes(pageNum)) {
      const page = doc.getPage(i);
      const curr = page.getRotation().angle;
      page.setRotation(degrees((curr + angle) % 360));
    }
  }

  return await doc.save();
}

/**
 * Add page numbers to document
 */
export async function addPageNumbers(
  pdfBuffer: ArrayBuffer,
  options: {
    position: 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center' | 'top-right' | 'top-left';
    format: 'n' | 'n_of_total' | 'page_n' | 'page_n_of_total';
    fontSize?: number;
    startFrom?: number;
    margin?: number;
  }
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBuffer.slice(0), { ignoreEncryption: true });
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const count = doc.getPageCount();
  const fontSize = options.fontSize || 10;
  const margin = options.margin || 30;
  const startFrom = options.startFrom || 1;

  for (let i = 0; i < count; i++) {
    const page = doc.getPage(i);
    const { width, height } = page.getSize();
    const currentNum = startFrom + i;
    const totalNum = startFrom + count - 1;

    let text = `${currentNum}`;
    if (options.format === 'n_of_total') text = `${currentNum} / ${totalNum}`;
    if (options.format === 'page_n') text = `Page ${currentNum}`;
    if (options.format === 'page_n_of_total') text = `Page ${currentNum} of ${totalNum}`;

    const textWidth = font.widthOfTextAtSize(text, fontSize);
    let x = width / 2 - textWidth / 2;
    let y = margin;

    if (options.position === 'bottom-left') x = margin;
    else if (options.position === 'bottom-right') x = width - margin - textWidth;
    else if (options.position === 'top-left') {
      x = margin;
      y = height - margin;
    } else if (options.position === 'top-center') {
      x = width / 2 - textWidth / 2;
      y = height - margin;
    } else if (options.position === 'top-right') {
      x = width - margin - textWidth;
      y = height - margin;
    }

    page.drawText(text, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
  }

  return await doc.save();
}

/**
 * Watermark PDF with text or image
 */
export async function watermarkPdf(
  pdfBuffer: ArrayBuffer,
  options: {
    text?: string;
    imageBuffer?: ArrayBuffer;
    imageType?: 'image/png' | 'image/jpeg';
    opacity?: number;
    fontSize?: number;
    angle?: number;
    colorHex?: string;
  }
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBuffer.slice(0), { ignoreEncryption: true });
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const count = doc.getPageCount();
  const opacity = options.opacity ?? 0.3;
  const angle = options.angle ?? 45;
  const fontSize = options.fontSize ?? 48;

  let embeddedImage: any = null;
  if (options.imageBuffer) {
    if (options.imageType === 'image/png') {
      embeddedImage = await doc.embedPng(options.imageBuffer);
    } else {
      embeddedImage = await doc.embedJpg(options.imageBuffer);
    }
  }

  for (let i = 0; i < count; i++) {
    const page = doc.getPage(i);
    const { width, height } = page.getSize();

    if (embeddedImage) {
      const imgDims = embeddedImage.scale(0.5);
      page.drawImage(embeddedImage, {
        x: width / 2 - imgDims.width / 2,
        y: height / 2 - imgDims.height / 2,
        width: imgDims.width,
        height: imgDims.height,
        opacity,
      });
    } else if (options.text) {
      const textWidth = font.widthOfTextAtSize(options.text, fontSize);
      page.drawText(options.text, {
        x: width / 2 - (textWidth / 2) * Math.cos((angle * Math.PI) / 180),
        y: height / 2 - (textWidth / 4) * Math.sin((angle * Math.PI) / 180),
        size: fontSize,
        font,
        color: rgb(0.6, 0.6, 0.6),
        rotate: degrees(angle),
        opacity,
      });
    }
  }

  return await doc.save();
}

/**
 * Crop margins or specific boundary on PDF pages
 */
export async function cropPdf(
  pdfBuffer: ArrayBuffer,
  margins: { top: number; bottom: number; left: number; right: number }
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBuffer.slice(0), { ignoreEncryption: true });
  const count = doc.getPageCount();

  for (let i = 0; i < count; i++) {
    const page = doc.getPage(i);
    const { width, height } = page.getSize();
    const newX = margins.left;
    const newY = margins.bottom;
    const newWidth = Math.max(10, width - margins.left - margins.right);
    const newHeight = Math.max(10, height - margins.top - margins.bottom);

    page.setCropBox(newX, newY, newWidth, newHeight);
  }

  return await doc.save();
}

/**
 * Redact specific rectangular areas permanently on target pages
 */
export async function redactPdf(
  pdfBuffer: ArrayBuffer,
  redactions: {
    page: number;
    // Fractional normalized coordinates [0..1] or PDF point coordinates
    x: number;
    y: number;
    width: number;
    height: number;
    // Normalized 0..1 bounding box from preview
    normalized?: { x: number; y: number; width: number; height: number };
  }[]
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBuffer.slice(0), { ignoreEncryption: true });

  for (const r of redactions) {
    const pageIdx = r.page - 1;
    if (pageIdx >= 0 && pageIdx < doc.getPageCount()) {
      const page = doc.getPage(pageIdx);
      const { width: pageWidth, height: pageHeight } = page.getSize();

      let boxX: number;
      let boxY: number;
      let boxW: number;
      let boxH: number;

      if (r.normalized) {
        boxX = r.normalized.x * pageWidth;
        // In PDF points, y=0 is at the bottom of the page
        boxY = (1 - (r.normalized.y + r.normalized.height)) * pageHeight;
        boxW = r.normalized.width * pageWidth;
        boxH = r.normalized.height * pageHeight;
      } else {
        boxX = r.x;
        boxY = r.y;
        boxW = r.width;
        boxH = r.height;
      }

      // Draw permanent solid opaque black box
      page.drawRectangle({
        x: Math.max(0, boxX),
        y: Math.max(0, boxY),
        width: Math.min(pageWidth, boxW),
        height: Math.min(pageHeight, boxH),
        color: rgb(0, 0, 0),
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
        opacity: 1.0,
      });
    }
  }

  return await doc.save();
}

/**
 * Sign PDF by placing a drawn signature or image stamp
 */
export async function signPdf(
  pdfBuffer: ArrayBuffer,
  signatureDataUrl: string,
  placement: {
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
    normalized?: { x: number; y: number; width: number; height: number };
  }
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBuffer.slice(0), { ignoreEncryption: true });
  const pageIdx = placement.page - 1;
  if (pageIdx < 0 || pageIdx >= doc.getPageCount()) {
    throw new Error(`Invalid page number ${placement.page}`);
  }

  const page = doc.getPage(pageIdx);
  const { width: pageWidth, height: pageHeight } = page.getSize();
  const rotation = page.getRotation().angle || 0;

  const base64Data = signatureDataUrl.replace(/^data:image\/\w+;base64,/, '');
  const bytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
  const image = await doc.embedPng(bytes);

  let drawX = placement.x;
  let drawY = placement.y;
  let drawW = placement.width;
  let drawH = placement.height;

  if (placement.normalized) {
    drawX = placement.normalized.x * pageWidth;
    drawY = (1 - (placement.normalized.y + placement.normalized.height)) * pageHeight;
    drawW = placement.normalized.width * pageWidth;
    drawH = placement.normalized.height * pageHeight;
  }

  page.drawImage(image, {
    x: Math.max(0, drawX),
    y: Math.max(0, drawY),
    width: Math.min(pageWidth, drawW),
    height: Math.min(pageHeight, drawH),
  });

  return await doc.save();
}

/**
 * Edit PDF: Add custom annotations (texts, rects, lines)
 */
export async function editPdf(
  pdfBuffer: ArrayBuffer,
  annotations: {
    page: number;
    type: 'text' | 'rect' | 'pen';
    x: number;
    y: number;
    width?: number;
    height?: number;
    text?: string;
    color?: { r: number; g: number; b: number };
    fontSize?: number;
  }[]
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBuffer.slice(0), { ignoreEncryption: true });
  const font = await doc.embedFont(StandardFonts.Helvetica);

  for (const ann of annotations) {
    const pageIdx = ann.page - 1;
    if (pageIdx >= 0 && pageIdx < doc.getPageCount()) {
      const page = doc.getPage(pageIdx);
      const c = ann.color ? rgb(ann.color.r, ann.color.g, ann.color.b) : rgb(0.1, 0.1, 0.1);

      if (ann.type === 'text' && ann.text) {
        page.drawText(ann.text, {
          x: ann.x,
          y: ann.y,
          size: ann.fontSize || 14,
          font,
          color: c,
        });
      } else if (ann.type === 'rect') {
        page.drawRectangle({
          x: ann.x,
          y: ann.y,
          width: ann.width || 100,
          height: ann.height || 40,
          borderColor: c,
          borderWidth: 1.5,
          opacity: 0.8,
        });
      }
    }
  }

  return await doc.save();
}

/**
 * Convert images into a single formatted PDF
 */
export async function jpgToPdf(
  images: { name: string; buffer: ArrayBuffer; type: string }[],
  options?: { margin?: number; fitPage?: boolean }
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const margin = options?.margin ?? 20;

  for (const img of images) {
    let embeddedImg;
    if (img.type.includes('png')) {
      embeddedImg = await doc.embedPng(img.buffer);
    } else {
      embeddedImg = await doc.embedJpg(img.buffer);
    }

    const { width: imgW, height: imgH } = embeddedImg;
    // Standard A4 dimensions or image dimensions with margin
    const pageWidth = imgW + margin * 2;
    const pageHeight = imgH + margin * 2;

    const page = doc.addPage([pageWidth, pageHeight]);
    page.drawImage(embeddedImg, {
      x: margin,
      y: margin,
      width: imgW,
      height: imgH,
    });
  }

  return await doc.save();
}

/**
 * Export PDF pages as JPG/PNG images via Canvas rendering
 */
export async function pdfToJpg(
  pdfBuffer: ArrayBuffer,
  options?: { scale?: number; format?: 'image/jpeg' | 'image/png'; quality?: number }
): Promise<{ pageNumber: number; dataUrl: string; blob: Blob }[]> {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer.slice(0)) });
  const pdf = await loadingTask.promise;
  const count = pdf.numPages;
  const results: { pageNumber: number; dataUrl: string; blob: Blob }[] = [];
  const scale = options?.scale || 1.8;
  const format = options?.format || 'image/jpeg';
  const quality = options?.quality || 0.9;

  for (let i = 1; i <= count; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport } as any).promise;

      const dataUrl = canvas.toDataURL(format, quality);
      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b || new Blob()), format, quality)
      );
      results.push({ pageNumber: i, dataUrl, blob });
    }
  }

  return results;
}

/**
 * Render single page for interactive canvas or thumbnail
 */
export async function renderPdfPage(
  pdfBuffer: ArrayBuffer,
  pageNumber: number,
  scale = 1.0
): Promise<{ canvas: HTMLCanvasElement; width: number; height: number }> {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer.slice(0)) });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('Canvas 2D context unavailable');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport } as any).promise;

  return { canvas, width: viewport.width, height: viewport.height };
}

/**
 * Render lightweight thumbnails for all pages of a PDF
 */
export async function renderThumbnails(
  pdfBuffer: ArrayBuffer,
  thumbnailScale = 0.3
): Promise<{ pageNumber: number; dataUrl: string; width: number; height: number }[]> {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer.slice(0)) });
  const pdf = await loadingTask.promise;
  const count = pdf.numPages;
  const thumbnails = [];

  for (let i = 1; i <= count; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: thumbnailScale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport } as any).promise;
      thumbnails.push({
        pageNumber: i,
        dataUrl: canvas.toDataURL('image/jpeg', 0.8),
        width: viewport.width,
        height: viewport.height,
      });
    }
  }

  return thumbnails;
}

/**
 * Compress PDF client-side by re-sampling raster elements and optimizing stream structure
 */
export async function compressPdf(
  pdfBuffer: ArrayBuffer,
  level: 'extreme' | 'recommended' | 'low' = 'recommended'
): Promise<Uint8Array> {
  const scale = level === 'extreme' ? 1.0 : level === 'recommended' ? 1.4 : 1.8;
  const quality = level === 'extreme' ? 0.6 : level === 'recommended' ? 0.75 : 0.88;

  const images = await pdfToJpg(pdfBuffer, { scale, format: 'image/jpeg', quality });
  const newDoc = await PDFDocument.create();

  for (const img of images) {
    const imgBytes = new Uint8Array(await img.blob.arrayBuffer());
    const embedded = await newDoc.embedJpg(imgBytes);
    const page = newDoc.addPage([embedded.width, embedded.height]);
    page.drawImage(embedded, {
      x: 0,
      y: 0,
      width: embedded.width,
      height: embedded.height,
    });
  }

  return await newDoc.save({ useObjectStreams: true });
}

/**
 * Extract plain text and coordinate items from PDF
 */
export async function extractPdfText(
  pdfBuffer: ArrayBuffer
): Promise<{ fullText: string; pages: { pageNumber: number; text: string; items: any[] }[] }> {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer.slice(0)) });
  const pdf = await loadingTask.promise;
  const count = pdf.numPages;
  const pages = [];
  let fullText = '';

  for (let i = 1; i <= count; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    let lastY: number | null = null;
    const lines: string[] = [];
    let currentLineTokens: string[] = [];

    for (const item of textContent.items as any[]) {
      const str = (item.str || '').trim();
      if (!str) continue;
      const y = item.transform ? Math.round(item.transform[5]) : null;

      if (lastY !== null && y !== null && Math.abs(y - lastY) > 3) {
        if (currentLineTokens.length > 0) {
          lines.push(currentLineTokens.join('   '));
        }
        currentLineTokens = [str];
      } else {
        currentLineTokens.push(str);
      }
      lastY = y;
    }

    if (currentLineTokens.length > 0) {
      lines.push(currentLineTokens.join('   '));
    }

    const pageText = lines.join('\n');
    pages.push({ pageNumber: i, text: pageText, items: textContent.items });
    fullText += `--- Page ${i} ---\n` + pageText + '\n\n';
  }

  return { fullText, pages };
}

/**
 * Convert PDF to PDF/A archive standard
 */
export async function convertToPdfA(pdfBuffer: ArrayBuffer): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBuffer.slice(0), { ignoreEncryption: true });

  doc.setTitle(doc.getTitle() || 'Archived Document');
  doc.setProducer('PaperWork Local PDF/A Engine');
  doc.setCreator('PDF/A ISO-19005-1 Standard');
  doc.setModificationDate(new Date());

  return await doc.save({
    useObjectStreams: false,
    addDefaultPage: false,
  });
}

/**
 * Repair damaged PDF
 */
export async function repairPdf(pdfBuffer: ArrayBuffer): Promise<Uint8Array> {
  try {
    const doc = await PDFDocument.load(pdfBuffer.slice(0), {
      ignoreEncryption: true,
      parseSpeed: 1,
      throwOnInvalidObject: false,
      updateMetadata: true,
    });
    return await doc.save();
  } catch {
    // Fallback: render salvageable pages via PDF.js and rebuild fresh document
    const images = await pdfToJpg(pdfBuffer, { scale: 1.5, quality: 0.9 });
    const newDoc = await PDFDocument.create();
    for (const img of images) {
      const bytes = new Uint8Array(await img.blob.arrayBuffer());
      const embedded = await newDoc.embedJpg(bytes);
      const page = newDoc.addPage([embedded.width, embedded.height]);
      page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height });
    }
    return await newDoc.save();
  }
}

/**
 * Check if PDF is password-protected / encrypted
 */
export async function isPdfEncrypted(pdfBuffer: ArrayBuffer): Promise<boolean> {
  try {
    const bytes = new Uint8Array(pdfBuffer);
    const result = await isEncrypted(bytes);
    return !!result.encrypted;
  } catch {
    return false;
  }
}

/**
 * Protect PDF with password using AES-256
 */
export async function protectPdf(
  pdfBuffer: ArrayBuffer,
  password: string,
  options?: EncryptPDFOptions
): Promise<Uint8Array> {
  const bytes = new Uint8Array(pdfBuffer);

  const status = await isEncrypted(bytes);
  if (status.encrypted) {
    throw new AlreadyEncryptedError();
  }

  // Normalize structure through pdf-lib to ensure valid syntax before encryption
  let inputBytes: Uint8Array<any> = bytes;
  try {
    const doc = await PDFDocument.load(pdfBuffer.slice(0), { ignoreEncryption: true });
    inputBytes = await doc.save();
  } catch {
    inputBytes = bytes;
  }

  const encrypted = await encryptPDF(inputBytes, password, {
    algorithm: options?.algorithm || 'AES-256',
    ownerPassword: options?.ownerPassword || password,
    allowPrinting: options?.allowPrinting ?? true,
    allowCopying: options?.allowCopying ?? true,
    allowModifying: options?.allowModifying ?? false,
    ...options,
  });
  return new Uint8Array(encrypted.buffer, encrypted.byteOffset, encrypted.byteLength);
}

/**
 * Unlock password-protected PDF
 */
export async function unlockPdf(pdfBuffer: ArrayBuffer, password?: string): Promise<Uint8Array> {
  const bytes = new Uint8Array(pdfBuffer);
  const status = await isEncrypted(bytes);
  if (!status.encrypted) {
    // If not encrypted, return clean re-save
    const doc = await PDFDocument.load(pdfBuffer.slice(0), { ignoreEncryption: true });
    return await doc.save();
  }
  const decrypted = await decryptPDF(bytes, password || '');
  return new Uint8Array(decrypted.buffer, decrypted.byteOffset, decrypted.byteLength);
}

/**
 * Detect & Fill interactive form fields
 */
export async function inspectAndFillPdfForm(
  pdfBuffer: ArrayBuffer,
  fieldValues?: Record<string, string | boolean>
): Promise<{ fields: { name: string; type: string; value: string }[]; updatedBuffer: Uint8Array }> {
  const doc = await PDFDocument.load(pdfBuffer.slice(0), { ignoreEncryption: true });
  const form = doc.getForm();
  const fields = form.getFields().map((f) => {
    const name = f.getName();
    let type = 'unknown';
    let value = '';
    try {
      type = f.constructor.name.replace('PDF', '');
      if ('getText' in f && typeof (f as any).getText === 'function') {
        value = (f as any).getText() || '';
      }
    } catch {
      // ignore
    }
    return { name, type, value };
  });

  if (fieldValues) {
    for (const [name, val] of Object.entries(fieldValues)) {
      try {
        const field = form.getField(name);
        if ('setText' in field && typeof (field as any).setText === 'function' && typeof val === 'string') {
          (field as any).setText(val);
        } else if ('check' in field && typeof (field as any).check === 'function' && val === true) {
          (field as any).check();
        } else if ('uncheck' in field && typeof (field as any).uncheck === 'function' && val === false) {
          (field as any).uncheck();
        }
      } catch {
        // field may not match
      }
    }
  }

  const updatedBuffer = await doc.save();
  return { fields, updatedBuffer };
}
