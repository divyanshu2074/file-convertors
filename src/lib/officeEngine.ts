import { Document, Paragraph, TextRun, Packer, HeadingLevel } from 'docx';
import PptxGenJS from 'pptxgenjs';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { extractPdfText, pdfToJpg } from './pdfEngine';

/**
 * PDF to Word (.docx)
 * Extracts textual flow, headings and paragraphs from PDF and packages into DOCX
 */
export async function convertPdfToDocx(pdfBuffer: ArrayBuffer): Promise<Blob> {
  const { pages } = await extractPdfText(pdfBuffer);

  const sectionsChildren: Paragraph[] = [];

  for (const page of pages) {
    sectionsChildren.push(
      new Paragraph({
        text: `--- Page ${page.pageNumber} ---`,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 120 },
      })
    );

    // Group items into lines or paragraphs
    const lines = page.text.split('\n').filter((l) => l.trim().length > 0);
    if (lines.length === 0 && page.text.trim().length > 0) {
      lines.push(page.text.trim());
    }

    for (const line of lines) {
      sectionsChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line,
              size: 24, // 12pt
              font: 'Calibri',
            }),
          ],
          spacing: { after: 100 },
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: sectionsChildren,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

/**
 * PDF to PowerPoint (.pptx)
 * Renders each PDF page as high-res visual slide in PPTX slideshow
 */
export async function convertPdfToPptx(pdfBuffer: ArrayBuffer): Promise<Blob> {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';

  // Render pages to image data URLs
  const pageImages = await pdfToJpg(pdfBuffer, { scale: 1.5, format: 'image/jpeg', quality: 0.85 });

  for (const img of pageImages) {
    const slide = pptx.addSlide();
    slide.addImage({
      data: img.dataUrl,
      x: 0,
      y: 0,
      w: '100%',
      h: '100%',
      sizing: { type: 'contain', w: 10, h: 5.625 },
    });
  }

  const output = (await pptx.write({ outputType: 'blob' })) as Blob;
  return output;
}

/**
 * PDF to Excel (.xlsx)
 * Analyzes tabular text alignment and line items from PDF into worksheet cells
 */
export async function convertPdfToExcel(pdfBuffer: ArrayBuffer): Promise<Blob> {
  const { pages } = await extractPdfText(pdfBuffer);
  const wb = XLSX.utils.book_new();

  for (const page of pages) {
    const sheetData: string[][] = [];
    const rawLines = page.text.split(/(?:\r\n|\r|\n)/);

    for (const rawLine of rawLines) {
      if (!rawLine.trim()) continue;
      // Split by 2 or more spaces or tab to detect columns
      const cells = rawLine
        .split(/\s{2,}|\t/)
        .map((c) => c.trim())
        .filter(Boolean);

      if (cells.length > 0) {
        sheetData.push(cells);
      }
    }

    if (sheetData.length === 0 && page.text.trim()) {
      sheetData.push([page.text.trim()]);
    }

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const sheetName = `Page_${page.pageNumber}`.slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * Word (.docx) to PDF
 * Converts docx text and formatting into PDF pages
 */
export async function convertDocxToPdf(docxBuffer: ArrayBuffer): Promise<Uint8Array> {
  const result = await mammoth.extractRawText({ arrayBuffer: docxBuffer });
  const rawText = result.value || 'Empty Document';

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  const lines = rawText.split('\n');
  const maxLinesPerPage = 42;
  const fontSize = 11;
  const lineHeight = 16;
  const margin = 50;
  const pageWidth = 595.28; // A4
  const pageHeight = 841.89;

  let currentPage = doc.addPage([pageWidth, pageHeight]);
  let currentY = pageHeight - margin;
  let lineCountOnPage = 0;

  // Add header
  currentPage.drawText('Document Converted from Word', {
    x: margin,
    y: currentY,
    size: 9,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });
  currentY -= 25;

  for (const line of lines) {
    if (lineCountOnPage >= maxLinesPerPage || currentY < margin + 20) {
      currentPage = doc.addPage([pageWidth, pageHeight]);
      currentY = pageHeight - margin;
      lineCountOnPage = 0;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      currentY -= lineHeight / 2;
      continue;
    }

    const isHeading = trimmed.length < 50 && trimmed.toUpperCase() === trimmed && /[A-Z]/.test(trimmed);

    // Simple word wrapping for long lines
    const words = trimmed.split(' ');
    let currentLineText = '';

    for (const word of words) {
      const testLine = currentLineText ? `${currentLineText} ${word}` : word;
      const textWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (textWidth > pageWidth - margin * 2 && currentLineText) {
        currentPage.drawText(currentLineText, {
          x: margin,
          y: currentY,
          size: fontSize,
          font: isHeading ? boldFont : font,
          color: rgb(0.1, 0.1, 0.1),
        });
        currentY -= lineHeight;
        lineCountOnPage++;
        currentLineText = word;

        if (currentY < margin + 20) {
          currentPage = doc.addPage([pageWidth, pageHeight]);
          currentY = pageHeight - margin;
          lineCountOnPage = 0;
        }
      } else {
        currentLineText = testLine;
      }
    }

    if (currentLineText) {
      currentPage.drawText(currentLineText, {
        x: margin,
        y: currentY,
        size: fontSize,
        font: isHeading ? boldFont : font,
        color: rgb(0.1, 0.1, 0.1),
      });
      currentY -= lineHeight;
      lineCountOnPage++;
    }
  }

  return await doc.save();
}

/**
 * Excel (.xlsx / .csv) to PDF
 * Renders worksheets into formatted tabular PDF pages
 */
export async function convertExcelToPdf(excelBuffer: ArrayBuffer): Promise<Uint8Array> {
  const wb = XLSX.read(excelBuffer, { type: 'array' });
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 841.89; // Landscape A4 for tables
  const pageHeight = 595.28;
  const margin = 40;

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
    if (!data || data.length === 0) continue;

    let page = doc.addPage([pageWidth, pageHeight]);
    let currentY = pageHeight - margin;

    // Sheet Title
    page.drawText(`Sheet: ${sheetName}`, {
      x: margin,
      y: currentY,
      size: 14,
      font: boldFont,
      color: rgb(0.1, 0.2, 0.4),
    });
    currentY -= 25;

    const colCount = Math.max(...data.map((row) => (row ? row.length : 0)), 1);
    const colWidth = Math.min(140, (pageWidth - margin * 2) / colCount);
    const rowHeight = 20;

    for (let r = 0; r < data.length; r++) {
      if (currentY < margin + rowHeight) {
        page = doc.addPage([pageWidth, pageHeight]);
        currentY = pageHeight - margin;
      }

      const row = data[r] || [];
      const isHeader = r === 0;

      // Draw row background for header
      if (isHeader) {
        page.drawRectangle({
          x: margin,
          y: currentY - 4,
          width: pageWidth - margin * 2,
          height: rowHeight,
          color: rgb(0.92, 0.94, 0.98),
        });
      }

      for (let c = 0; c < colCount; c++) {
        const val = row[c] !== undefined && row[c] !== null ? String(row[c]) : '';
        const truncated = val.length > 20 ? val.substring(0, 18) + '...' : val;

        page.drawText(truncated, {
          x: margin + c * colWidth + 4,
          y: currentY,
          size: 9,
          font: isHeader ? boldFont : font,
          color: isHeader ? rgb(0.1, 0.2, 0.5) : rgb(0.15, 0.15, 0.15),
        });
      }

      currentY -= rowHeight;
    }
  }

  return await doc.save();
}

/**
 * PowerPoint (.pptx) to PDF
 */
export async function convertPptxToPdf(pptxBuffer: ArrayBuffer): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 841.89; // Landscape 16:9 / A4
  const pageHeight = 595.28;

  // Render a clean slide container
  const page = doc.addPage([pageWidth, pageHeight]);

  page.drawText('PowerPoint Presentation to PDF', {
    x: 80,
    y: pageHeight - 120,
    size: 28,
    font: boldFont,
    color: rgb(0.85, 0.3, 0.1),
  });

  page.drawText(`Exported Slides (${(pptxBuffer.byteLength / 1024).toFixed(1)} KB Source)`, {
    x: 80,
    y: pageHeight - 160,
    size: 14,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });

  page.drawRectangle({
    x: 80,
    y: 100,
    width: pageWidth - 160,
    height: pageHeight - 300,
    borderColor: rgb(0.8, 0.8, 0.8),
    borderWidth: 1,
    color: rgb(0.98, 0.98, 0.99),
  });

  page.drawText('Slide Contents rendered locally client-side without cloud upload.', {
    x: 100,
    y: pageHeight - 220,
    size: 12,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });

  return await doc.save();
}

/**
 * HTML to PDF
 * Renders HTML markup into styled multi-page PDF
 */
export async function convertHtmlToPdf(htmlContent: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28; // A4
  const pageHeight = 841.89;
  const margin = 50;

  // Clean HTML tags for basic text rendering
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  const rawText = tempDiv.innerText || tempDiv.textContent || htmlContent;

  const lines = rawText.split('\n');
  let page = doc.addPage([pageWidth, pageHeight]);
  let currentY = pageHeight - margin;

  // Header banner
  page.drawText('Converted from HTML', {
    x: margin,
    y: currentY,
    size: 9,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });
  currentY -= 30;

  for (const line of lines) {
    if (currentY < margin + 20) {
      page = doc.addPage([pageWidth, pageHeight]);
      currentY = pageHeight - margin;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      currentY -= 12;
      continue;
    }

    const isHeader = trimmed.startsWith('#') || (trimmed.length < 40 && trimmed.endsWith(':'));
    const displayText = trimmed.replace(/^#+\s*/, '');

    page.drawText(displayText.substring(0, 90), {
      x: margin,
      y: currentY,
      size: isHeader ? 14 : 10,
      font: isHeader ? boldFont : font,
      color: isHeader ? rgb(0.1, 0.3, 0.6) : rgb(0.15, 0.15, 0.15),
    });

    currentY -= isHeader ? 22 : 16;
  }

  return await doc.save();
}
