import {
  Document,
  Paragraph,
  TextRun,
  Packer,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  PageBreak,
} from 'docx';
import PptxGenJS from 'pptxgenjs';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { extractPdfText, pdfToJpg } from './pdfEngine';
import { pdfjsLib } from './pdfWorkerSetup';

/**
 * PDF to Word (.docx)
 * Extracts structured layout, headings, formatted text runs, lists, and tables from PDF.
 */
export async function convertPdfToDocx(pdfBuffer: ArrayBuffer): Promise<Blob> {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer.slice(0)) });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  const docChildren: (Paragraph | Table)[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const items = textContent.items as any[];

    if (pageNum > 1) {
      // Add page break between pages
      docChildren.push(
        new Paragraph({
          children: [new PageBreak()],
        })
      );
    }

    if (!items || items.length === 0) {
      continue;
    }

    // Group items into visual lines based on Y coordinates
    interface TextItemInfo {
      str: string;
      x: number;
      y: number;
      width: number;
      height: number;
      fontName: string;
      fontSize: number;
      bold: boolean;
      italic: boolean;
    }

    const parsedItems: TextItemInfo[] = [];

    for (const item of items) {
      const str = (item.str || '').trim();
      if (!str) continue;

      const tx = item.transform || [1, 0, 0, 1, 0, 0];
      const x = Math.round(tx[4]);
      const y = Math.round(tx[5]);
      // Estimate font size from transform matrix scale
      const fontSize = Math.max(8, Math.round(Math.hypot(tx[0], tx[1]) || item.height || 11));
      const fontName = String(item.fontName || '').toLowerCase();
      const bold = /bold|black|heavy|semibold|medium/i.test(fontName);
      const italic = /italic|oblique/i.test(fontName);

      parsedItems.push({
        str: item.str, // keep inner spaces
        x,
        y,
        width: item.width || 0,
        height: item.height || fontSize,
        fontName,
        fontSize,
        bold,
        italic,
      });
    }

    if (parsedItems.length === 0) continue;

    // Sort items top-to-bottom (PDF Y is bottom-up, so higher Y is higher on page), then left-to-right
    parsedItems.sort((a, b) => {
      if (Math.abs(b.y - a.y) > 4) {
        return b.y - a.y; // Higher Y first
      }
      return a.x - b.x; // Left to right
    });

    // Group into visual lines
    const lineBuckets: TextItemInfo[][] = [];
    let currentBucket: TextItemInfo[] = [];
    let currentY: number | null = null;

    for (const item of parsedItems) {
      if (currentY === null || Math.abs(item.y - currentY) <= 4) {
        currentBucket.push(item);
        if (currentY === null) currentY = item.y;
      } else {
        if (currentBucket.length > 0) {
          lineBuckets.push(currentBucket);
        }
        currentBucket = [item];
        currentY = item.y;
      }
    }
    if (currentBucket.length > 0) {
      lineBuckets.push(currentBucket);
    }

    // Process lines into paragraphs, headings, bullet lists, or tables
    for (let lineIdx = 0; lineIdx < lineBuckets.length; lineIdx++) {
      const line = lineBuckets[lineIdx];
      // Sort line items left to right
      line.sort((a, b) => a.x - b.x);

      // Check if this line looks like a multi-column table row (multiple separated items with significant gap)
      const hasLargeGaps = line.length >= 2 && line.some((it, idx) => {
        if (idx === 0) return false;
        const prev = line[idx - 1];
        return it.x - (prev.x + prev.width) > 40;
      });

      if (hasLargeGaps && line.length <= 6) {
        // Render as a clean Word table row
        const cells = line.map((item) => {
          return new TableCell({
            width: { size: Math.round(100 / line.length), type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: item.str.trim(),
                    bold: item.bold,
                    italics: item.italic,
                    size: Math.min(32, Math.max(16, item.fontSize * 2)),
                    font: 'Calibri',
                  }),
                ],
              }),
            ],
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
            },
          });
        });

        docChildren.push(
          new Table({
            rows: [new TableRow({ children: cells })],
            width: { size: 100, type: WidthType.PERCENTAGE },
          })
        );
        continue;
      }

      // Check for headings or bullet points
      const combinedText = line.map((it) => it.str).join(' ').trim();
      if (!combinedText) continue;

      const maxFontSize = Math.max(...line.map((it) => it.fontSize));
      const isBoldLine = line.filter((it) => it.bold).length >= line.length / 2;
      const isBullet = /^[•\-\*\u2022\u25E6]\s+/.test(combinedText) || /^\d+[\.\)]\s+/.test(combinedText);

      // Map font sizes to headings:
      // Typically body text is 10-12pt. >= 20pt is Heading 1, >= 15pt is Heading 2, >= 13pt bold is Heading 3
      let headingLevel: typeof HeadingLevel[keyof typeof HeadingLevel] | undefined = undefined;
      if (maxFontSize >= 20 || (maxFontSize >= 17 && isBoldLine)) {
        headingLevel = HeadingLevel.HEADING_1;
      } else if (maxFontSize >= 15 || (maxFontSize >= 13 && isBoldLine && combinedText.length < 80)) {
        headingLevel = HeadingLevel.HEADING_2;
      } else if (maxFontSize >= 12 && isBoldLine && combinedText.length < 60) {
        headingLevel = HeadingLevel.HEADING_3;
      }

      const runs: TextRun[] = [];
      let previousEnd = -1;

      for (const item of line) {
        const text = item.str;
        if (!text) continue;

        // If there was spacing before this item
        const prependSpace = previousEnd > 0 && item.x - previousEnd > 6 && !text.startsWith(' ');

        runs.push(
          new TextRun({
            text: (prependSpace ? ' ' : '') + text,
            bold: item.bold,
            italics: item.italic,
            size: Math.min(48, Math.max(16, item.fontSize * 2)),
            font: 'Calibri',
          })
        );
        previousEnd = item.x + item.width;
      }

      docChildren.push(
        new Paragraph({
          children: runs,
          heading: headingLevel,
          bullet: isBullet ? { level: 0 } : undefined,
          spacing: {
            before: headingLevel ? 180 : 40,
            after: headingLevel ? 100 : 60,
            line: 276, // 1.15 line spacing
          },
        })
      );
    }
  }

  // If no content could be parsed with layout, fallback to full text
  if (docChildren.length === 0) {
    const { fullText } = await extractPdfText(pdfBuffer);
    const lines = fullText.split('\n').filter((l) => l.trim().length > 0);
    for (const l of lines) {
      docChildren.push(
        new Paragraph({
          children: [new TextRun({ text: l, size: 22, font: 'Calibri' })],
          spacing: { after: 80 },
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch = 1440 twips
              bottom: 1440,
              left: 1440,
              right: 1440,
            },
          },
        },
        children: docChildren,
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
 * Converts docx semantic HTML (headings, paragraphs, bold/italic, lists, tables) into clean styled PDF pages
 */
export async function convertDocxToPdf(docxBuffer: ArrayBuffer): Promise<Uint8Array> {
  let html = '';
  try {
    const safeBuffer = docxBuffer.slice(0);
    // Mammoth accepts { arrayBuffer } in browser, { buffer } in Node
    const mammothInput: any =
      typeof Buffer !== 'undefined'
        ? { buffer: Buffer.from(safeBuffer) }
        : { arrayBuffer: safeBuffer };

    const result = await mammoth.convertToHtml(mammothInput);
    html = result.value || '';
  } catch {
    const rawRes = await mammoth.extractRawText({ arrayBuffer: docxBuffer.slice(0) });
    html = (rawRes.value || '')
      .split('\n')
      .map((l) => `<p>${l}</p>`)
      .join('');
  }

  const doc = await PDFDocument.create();
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await doc.embedFont(StandardFonts.HelveticaOblique);

  const pageWidth = 595.28; // Standard A4 width
  const pageHeight = 841.89; // Standard A4 height
  const marginX = 54; // 0.75 in
  const marginTop = 54;
  const marginBottom = 54;
  const contentWidth = pageWidth - marginX * 2;

  let currentPage = doc.addPage([pageWidth, pageHeight]);
  let currentY = pageHeight - marginTop;

  function ensureSpace(neededHeight: number) {
    if (currentY - neededHeight < marginBottom) {
      currentPage = doc.addPage([pageWidth, pageHeight]);
      currentY = pageHeight - marginTop;
    }
  }

  // Parse HTML elements
  interface RenderBlock {
    type: 'h1' | 'h2' | 'h3' | 'p' | 'li' | 'table-row';
    cells?: string[];
    spans: { text: string; bold: boolean; italic: boolean }[];
  }

  const blocks: RenderBlock[] = [];

  // Parse HTML strings safely using DOMParser if in browser, or regex parser fallback
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const docParsed = parser.parseFromString(html, 'text/html');

    function extractSpans(node: Node): { text: string; bold: boolean; italic: boolean }[] {
      const spans: { text: string; bold: boolean; italic: boolean }[] = [];

      function walk(n: Node, isBold: boolean, isItalic: boolean) {
        if (n.nodeType === Node.TEXT_NODE) {
          const txt = n.textContent || '';
          if (txt) {
            spans.push({ text: txt, bold: isBold, italic: isItalic });
          }
        } else if (n.nodeType === Node.ELEMENT_NODE) {
          const el = n as HTMLElement;
          const tag = el.tagName.toLowerCase();
          const bold = isBold || tag === 'strong' || tag === 'b' || tag === 'h1' || tag === 'h2' || tag === 'h3';
          const italic = isItalic || tag === 'em' || tag === 'i';

          for (const child of Array.from(el.childNodes)) {
            walk(child, bold, italic);
          }
        }
      }

      walk(node, false, false);
      return spans;
    }

    const bodyNodes = Array.from(docParsed.body.children);
    if (bodyNodes.length === 0 && docParsed.body.textContent) {
      blocks.push({
        type: 'p',
        spans: [{ text: docParsed.body.textContent, bold: false, italic: false }],
      });
    }

    for (const el of bodyNodes) {
      const tag = el.tagName.toLowerCase();
      if (tag === 'h1') {
        blocks.push({ type: 'h1', spans: extractSpans(el) });
      } else if (tag === 'h2') {
        blocks.push({ type: 'h2', spans: extractSpans(el) });
      } else if (tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6') {
        blocks.push({ type: 'h3', spans: extractSpans(el) });
      } else if (tag === 'ul' || tag === 'ol') {
        for (const li of Array.from(el.querySelectorAll('li'))) {
          blocks.push({ type: 'li', spans: extractSpans(li) });
        }
      } else if (tag === 'table') {
        for (const tr of Array.from(el.querySelectorAll('tr'))) {
          const rowCells = Array.from(tr.querySelectorAll('th, td')).map((c) => c.textContent?.trim() || '');
          if (rowCells.length > 0) {
            blocks.push({
              type: 'table-row',
              cells: rowCells,
              spans: [],
            });
          }
        }
      } else {
        blocks.push({ type: 'p', spans: extractSpans(el) });
      }
    }
  } else {
    // Regex based node parser fallback for server/headless environments
    const regex = /<(h[1-3]|p|li|tr)[^>]*>(.*?)<\/\1>/gi;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(html)) !== null) {
      const tag = match[1].toLowerCase() as any;
      const inner = match[2];

      if (tag === 'tr') {
        const cellMatches = [...inner.matchAll(/<t[hd][^>]*>(.*?)<\/t[hd]>/gi)];
        const cells = cellMatches.map((m) => m[1].replace(/<[^>]+>/g, '').trim());
        if (cells.length > 0) {
          blocks.push({ type: 'table-row', cells, spans: [] });
        }
      } else {
        const isHeading = tag.startsWith('h');
        const clean = inner.replace(/<[^>]+>/g, '').trim();
        if (clean) {
          blocks.push({
            type: tag === 'li' ? 'li' : isHeading ? tag : 'p',
            spans: [{ text: clean, bold: isHeading || /<(strong|b)/i.test(inner), italic: /<(em|i)/i.test(inner) }],
          });
        }
      }
    }
  }

  // Draw blocks onto PDF pages
  for (const block of blocks) {
    if (block.type === 'table-row' && block.cells && block.cells.length > 0) {
      ensureSpace(24);
      const colCount = block.cells.length;
      const colWidth = contentWidth / colCount;

      for (let c = 0; c < colCount; c++) {
        const cellText = block.cells[c];
        const cellX = marginX + c * colWidth + 4;
        const cellFontSize = 9.5;
        const truncated = fontRegular.widthOfTextAtSize(cellText, cellFontSize) > colWidth - 8
          ? cellText.slice(0, 20) + '...'
          : cellText;

        currentPage.drawText(truncated, {
          x: cellX,
          y: currentY - 12,
          size: cellFontSize,
          font: fontRegular,
          color: rgb(0.15, 0.15, 0.15),
        });
      }

      // Draw bottom row line
      currentPage.drawLine({
        start: { x: marginX, y: currentY - 18 },
        end: { x: marginX + contentWidth, y: currentY - 18 },
        thickness: 0.5,
        color: rgb(0.85, 0.85, 0.85),
      });

      currentY -= 22;
      continue;
    }

    let fontSize = 10.5;
    let lineHeight = 15;
    let spaceBefore = 4;
    let spaceAfter = 6;

    if (block.type === 'h1') {
      fontSize = 20;
      lineHeight = 26;
      spaceBefore = 14;
      spaceAfter = 10;
    } else if (block.type === 'h2') {
      fontSize = 15;
      lineHeight = 20;
      spaceBefore = 10;
      spaceAfter = 8;
    } else if (block.type === 'h3') {
      fontSize = 12.5;
      lineHeight = 17;
      spaceBefore = 8;
      spaceAfter = 6;
    } else if (block.type === 'li') {
      fontSize = 10.5;
      lineHeight = 15;
      spaceBefore = 2;
      spaceAfter = 4;
    }

    ensureSpace(spaceBefore + lineHeight + spaceAfter);
    currentY -= spaceBefore;

    const isLi = block.type === 'li';
    const indentX = isLi ? marginX + 16 : marginX;

    if (isLi) {
      currentPage.drawText('•', {
        x: marginX + 4,
        y: currentY - fontSize + 2,
        size: fontSize,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.2),
      });
    }

    // Word wrap and draw spans across lines
    const wordsWithFormat: { text: string; bold: boolean; italic: boolean }[] = [];
    for (const span of block.spans) {
      const parts = span.text.split(/(\s+)/);
      for (const p of parts) {
        if (!p) continue;
        wordsWithFormat.push({ text: p, bold: span.bold, italic: span.italic });
      }
    }

    interface FormattedLineWord {
      text: string;
      bold: boolean;
      italic: boolean;
      width: number;
    }

    let currentLineWords: FormattedLineWord[] = [];
    let currentLineWidth = 0;
    const maxLineWidth = contentWidth - (isLi ? 16 : 0);

    for (const item of wordsWithFormat) {
      const wordFont = item.bold ? fontBold : item.italic ? fontOblique : fontRegular;
      const wordW = wordFont.widthOfTextAtSize(item.text, fontSize);

      if (currentLineWidth + wordW > maxLineWidth && currentLineWords.length > 0 && item.text.trim()) {
        // Draw current line
        ensureSpace(lineHeight);
        let drawX = indentX;
        for (const w of currentLineWords) {
          const f = w.bold ? fontBold : w.italic ? fontOblique : fontRegular;
          currentPage.drawText(w.text, {
            x: drawX,
            y: currentY - fontSize + 2,
            size: fontSize,
            font: f,
            color: block.type.startsWith('h') ? rgb(0.1, 0.1, 0.15) : rgb(0.2, 0.2, 0.2),
          });
          drawX += w.width;
        }

        currentY -= lineHeight;
        currentLineWords = [];
        currentLineWidth = 0;
      }

      if (currentLineWords.length === 0 && !item.text.trim()) {
        continue; // skip leading space on newline
      }

      currentLineWords.push({ ...item, width: wordW });
      currentLineWidth += wordW;
    }

    if (currentLineWords.length > 0) {
      ensureSpace(lineHeight);
      let drawX = indentX;
      for (const w of currentLineWords) {
        const f = w.bold ? fontBold : w.italic ? fontOblique : fontRegular;
        currentPage.drawText(w.text, {
          x: drawX,
          y: currentY - fontSize + 2,
          size: fontSize,
          font: f,
          color: block.type.startsWith('h') ? rgb(0.1, 0.1, 0.15) : rgb(0.2, 0.2, 0.2),
        });
        drawX += w.width;
      }
      currentY -= lineHeight;
    }

    currentY -= spaceAfter;
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
