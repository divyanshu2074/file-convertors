import { createWorker } from 'tesseract.js';
import { pdfToJpg } from './pdfEngine';

export interface OcrProgress {
  status: string;
  progress: number;
  currentPage: number;
  totalPages: number;
}

/**
 * OCR PDF: Extracts searchable text from image-based or scanned PDFs
 */
export async function performPdfOcr(
  pdfBuffer: ArrayBuffer,
  language = 'eng',
  onProgress?: (info: OcrProgress) => void
): Promise<{ fullText: string; pageTexts: { page: number; text: string }[] }> {
  // 1. Render pages to image data URLs
  if (onProgress) {
    onProgress({ status: 'Rendering pages for OCR...', progress: 0.1, currentPage: 0, totalPages: 0 });
  }

  const pageImages = await pdfToJpg(pdfBuffer, { scale: 1.8, format: 'image/jpeg', quality: 0.9 });
  const totalPages = pageImages.length;

  if (onProgress) {
    onProgress({ status: 'Initializing Tesseract OCR engine...', progress: 0.2, currentPage: 0, totalPages });
  }

  const worker = await createWorker(language);

  const pageTexts: { page: number; text: string }[] = [];
  let fullText = '';

  for (let i = 0; i < totalPages; i++) {
    const pageNum = i + 1;
    const img = pageImages[i];

    if (onProgress) {
      onProgress({
        status: `Recognizing text on page ${pageNum} of ${totalPages}...`,
        progress: 0.2 + (0.75 * (i + 0.5)) / totalPages,
        currentPage: pageNum,
        totalPages,
      });
    }

    const {
      data: { text },
    } = await worker.recognize(img.dataUrl);

    pageTexts.push({ page: pageNum, text });
    fullText += `--- Page ${pageNum} OCR Text ---\n${text}\n\n`;
  }

  await worker.terminate();

  if (onProgress) {
    onProgress({ status: 'OCR complete!', progress: 1.0, currentPage: totalPages, totalPages });
  }

  return { fullText, pageTexts };
}
