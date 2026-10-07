# LocalPDF — 100% Client-Side PDF Suite & Document Converter

A modern, high-performance, and privacy-first web application that provides **all 28 document & PDF tools** (inspired by iLovePDF) completely **inside the user's browser**.

> 🔒 **100% Privacy Guarantee**: Zero files or byte streams are uploaded to any server or cloud API. All operations, rendering, transformations, text extractions, and optical character recognition run locally in memory via WebAssembly and Web Workers.

---

## 🚀 Key Features & 28 Client-Side Tools

### 1. Organize
- **Merge PDF**: Combine multiple PDF documents in any custom order.
- **Split PDF**: Extract single pages or page ranges (`1-3, 5, 8-10`) into separate PDFs or a ZIP archive.
- **Organize PDF**: Interactive visual page thumbnail grid with HTML5 drag-and-drop reordering, page rotation, deletion, and restoration.
- **Rotate PDF**: Rotate pages clockwise or counter-clockwise (90°, 180°, 270°).
- **Page Numbers**: Stamp customizable page numbers with positioning (`Page X of Y`, bottom-center, margins, custom fonts).
- **Crop PDF**: Visually preview and trim margin bounds across document pages.

### 2. Optimize
- **Compress PDF**: Reduce file size while optimizing visual clarity using canvas downsampling, JPEG quality scaling, and stream compaction.
- **Repair PDF**: Salvage corrupted, unreadable, or truncated PDF files via relaxed stream reconstruction.
- **PDF to PDF/A**: Standardize documents into ISO-19005-1 compliant archive format with embedded metadata.

### 3. Convert From PDF
- **PDF to Word (.docx)**: Extract document flow, paragraphs, and headings into editable Microsoft Word format.
- **PDF to PowerPoint (.pptx)**: Convert PDF slides into editable Microsoft PowerPoint presentations.
- **PDF to Excel (.xlsx)**: Detect tabular structures and line items into multi-sheet Excel workbooks.
- **PDF to JPG**: Export pages as high-resolution JPEG/PNG images individually or bundled as a ZIP.

### 4. Convert To PDF
- **Word to PDF**: Convert `.docx` documents into clean, portable PDF files.
- **PowerPoint to PDF**: Convert `.pptx` slideshow presentations into readable PDF slides.
- **Excel to PDF**: Render spreadsheets (`.xlsx`, `.xls`, `.csv`) into styled landscape PDF tables.
- **JPG to PDF**: Bundle multiple images (JPG, PNG, WebP) into a unified formatted PDF with customizable margins.
- **HTML to PDF**: Convert raw HTML markup, styled text, or web content into multi-page PDF documents.
- **Scan to PDF**: Access device/webcam camera with live B&W and high-contrast document filters, capturing pages into a multi-page PDF.

### 5. Edit & Security
- **Edit PDF**: Add text annotations, rectangular highlight frames, colors, and notes directly onto document pages.
- **Sign PDF**: Draw signatures with pen, type cursive names, or upload signature image stamps with interactive drag-and-drop positioning.
- **Watermark PDF**: Stamp custom text or image watermarks with angle, opacity, and typography controls.
- **Protect PDF**: Encrypt documents with password protection client-side.
- **Unlock PDF**: Remove password security and export unencrypted documents.
- **Redact PDF**: Permanently black out and destructively remove sensitive confidential data.

### 6. Advanced & OCR
- **OCR PDF**: Client-side optical character recognition powered by Tesseract.js WebAssembly. Extract searchable text with multi-language support.
- **Compare PDF**: Side-by-side visual difference and text diff between two PDF revisions.
- **PDF Forms**: Detect and inspect interactive AcroForm fields, fill values interactively, and export filled forms.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Vite 8
- **Styling**: Tailwind CSS v4, Lucide Icons, Canvas Confetti
- **PDF Engines**: `pdf-lib` (Document assembly/editing), `pdfjs-dist` (Canvas rendering & text extraction)
- **Office Converters**: `docx`, `mammoth`, `xlsx` (SheetJS), `pptxgenjs`
- **OCR Engine**: `tesseract.js` (WebAssembly & Web Workers)
- **Compression & Packaging**: `jszip`, `file-saver`

---

## ⚡ Performance Optimizations

1. **Chunked Code Splitting**: Optimized vendor bundles (`vendor-pdf`, `vendor-office`, `vendor-react`) ensuring the homepage loads in less than 35 kB gzipped.
2. **Local Worker Assets**: PDF.js worker script (`pdf.worker.min.mjs`) is served from the static `/public` root, removing any third-party CDN latency or network dependency.
3. **In-Memory Streaming**: Direct manipulation of `ArrayBuffer` and `Uint8Array` data avoids heavy DOM or memory overhead.
4. **Responsive & Mobile-First**: Touch-enabled signature pad, camera scanner, and adaptive layout across all screen sizes.

---

## 🏃 Getting Started

### Prerequisites
- Node.js 18+ (tested on Node v24.19)
- npm 9+

### Installation & Run

```bash
# Clone the repository
git clone https://github.com/divyanshu2074/file-convertors.git
cd file-convertors

# Install dependencies
npm install

# Start local development server
npm run dev
```

Visit `http://localhost:5173` in your browser.

### Build for Production

```bash
npm run build
```

The production output will be generated in the `dist/` directory, ready to deploy to GitHub Pages, Cloudflare Pages, Vercel, or any static host.

---

## 📄 License
MIT License. Free for personal and commercial use.
