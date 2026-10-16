import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://divyanshu2074.github.io/file-convertors';

const PAGES = [
  {
    id: 'merge-pdf',
    title: 'Merge PDF Online Free - 100% Client-Side & Confidential',
    h1: 'Merge PDF Documents Securely in Your Browser',
    sub: 'Combine multiple PDF files into one clean document with zero server uploads. 100% private, instant, and unlimited file sizes.',
    metaDesc: 'Merge PDF files online 100% in your browser. Zero server uploads, complete data privacy, unlimited file sizes, and instant in-memory processing with DocuZenith.',
    badge: '100% Client-Side Merger',
    gradient: 'from-blue-600 to-indigo-600',
    faqs: [
      {
        q: 'Are my PDF documents uploaded to an external server?',
        a: 'No. Unlike traditional tools such as iLovePDF or Smallpdf, DocuZenith runs 100% client-side in your web browser using WebAssembly. Your files are processed entirely in your computer’s local memory and are never uploaded to any server.'
      },
      {
        q: 'Is DocuZenith HIPAA and GDPR compliant for sensitive legal and medical documents?',
        a: 'Yes. Because zero bytes of document data leave your device or enter cloud pipelines, DocuZenith inherently complies with strict confidentiality regulations, NDAs, GDPR, and HIPAA data residency rules.'
      },
      {
        q: 'Can I merge large PDFs without file size limits?',
        a: 'Yes! Because processing happens in your browser’s local RAM, there are no artificial file size limits, paywalls, or rate throttles.'
      }
    ]
  },
  {
    id: 'compress-pdf',
    title: 'Compress PDF Online - Reduce File Size Locally Without Uploading',
    h1: 'Compress PDF Files Locally Without Losing Readability',
    sub: 'Downsample images, remove redundant document streams, and shrink PDF files directly on your machine.',
    metaDesc: 'Compress PDF documents online in your browser. Reduce file size for email attachment without uploading to external servers. Fast, private, and free.',
    badge: 'Private PDF Compressor',
    gradient: 'from-emerald-600 to-teal-600',
    faqs: [
      {
        q: 'How does client-side PDF compression work?',
        a: 'DocuZenith parses the PDF structure directly in your browser using WebAssembly, re-encoding uncompressed image objects and pruning redundant metadata without sending any data over the internet.'
      },
      {
        q: 'Will my text or formatting get blurry?',
        a: 'No. Vector text, typography fonts, forms, and digital signatures remain crisp and sharp. Only embedded raster images are intelligently optimized.'
      }
    ]
  },
  {
    id: 'split-pdf',
    title: 'Split PDF Online - Extract Pages Privately in Browser',
    h1: 'Split PDF Pages & Extract Ranges with Zero Cloud Storage',
    sub: 'Extract single pages or custom page ranges into standalone PDF files instantly and privately.',
    metaDesc: 'Split PDF pages online for free. Extract individual pages or custom ranges with complete privacy. No server uploads, no email required.',
    badge: 'In-Browser PDF Splitter',
    gradient: 'from-violet-600 to-purple-600',
    faqs: [
      {
        q: 'Can I extract multiple non-consecutive page ranges?',
        a: 'Yes. You can specify custom page ranges such as 1-3, 5, 8-12 and extract them into individual files or a single combined extract.'
      }
    ]
  },
  {
    id: 'pdf-to-word',
    title: 'Convert PDF to Word (DOCX) Online - Free & Confidential',
    h1: 'Convert PDF to Editable Microsoft Word (.docx)',
    sub: 'Reconstruct paragraphs, text blocks, and tables from PDF into an editable Word document right inside your browser.',
    metaDesc: 'Convert PDF to Word DOCX online with zero server uploads. Reconstruct text, tables, and paragraphs locally with DocuZenith.',
    badge: 'Client-Side PDF to Word',
    gradient: 'from-blue-600 to-cyan-600',
    faqs: [
      {
        q: 'Does DocuZenith convert PDF to Word without uploading to a third-party server?',
        a: 'Yes! The entire PDF text extraction and OpenXML (.docx) generation executes inside your browser using JavaScript and Web Workers.'
      }
    ]
  },
  {
    id: 'sign-pdf',
    title: 'Sign PDF Online Free - Draw & Place Signatures Locally',
    h1: 'Draw, Type, & Place Signatures on Any PDF Document',
    sub: 'Legally bind agreements, contracts, and NDA documents with interactive visual signatures that never leave your device.',
    metaDesc: 'Sign PDF documents online for free. Draw or type signatures, place date stamps, and download signed agreements with zero server exposure.',
    badge: 'Secure PDF Signer',
    gradient: 'from-indigo-600 to-violet-600',
    faqs: [
      {
        q: 'Is it safe to sign confidential contracts on DocuZenith?',
        a: 'Yes, DocuZenith is safer than cloud signature tools because your signature graphics and contract contents are never stored on any remote cloud database.'
      }
    ]
  },
  {
    id: 'redact-pdf',
    title: 'Redact PDF Online - Permanently Black Out & Remove Sensitive Text',
    h1: 'True PDF Redaction: Permanently Sanitize Sensitive Data',
    sub: 'Irreversibly erase social security numbers, bank details, and confidential text directly in your browser.',
    metaDesc: 'Redact PDF documents online safely. True redaction that permanently deletes underlying text streams and rasterizes sensitive zones.',
    badge: 'Permanent PDF Redactor',
    gradient: 'from-red-600 to-rose-600',
    faqs: [
      {
        q: 'Is this true redaction or just a black box over the text?',
        a: 'DocuZenith provides genuine redaction: the underlying vector text and glyph coordinates in the redacted bounding boxes are permanently stripped and burned into flattened pixels so data cannot be highlighted or copied.'
      }
    ]
  },
  {
    id: 'ocr-pdf',
    title: 'OCR PDF Online - Extract Text from Scanned Documents in Browser',
    h1: 'Extract Searchable Text from Scanned PDFs with Local OCR',
    sub: 'Client-side Optical Character Recognition powered by Tesseract.js WebAssembly. Zero cloud uploads.',
    metaDesc: 'Extract text from scanned PDFs and images online using client-side OCR. Powered by WebAssembly and Tesseract. Zero server uploads.',
    badge: 'Client-Side OCR',
    gradient: 'from-amber-600 to-yellow-600',
    faqs: [
      {
        q: 'How does client-side OCR run in the browser?',
        a: 'DocuZenith runs the battle-tested Tesseract OCR engine compiled directly into WebAssembly. Your CPU processes the image locally.'
      }
    ]
  },
  {
    id: 'protect-pdf',
    title: 'Protect PDF Online - Encrypt PDF with AES Password Security',
    h1: 'Password-Protect & Encrypt PDF Documents Locally',
    sub: 'Add industrial-strength encryption and access passwords to sensitive PDFs before sharing.',
    metaDesc: 'Encrypt and password protect PDF documents online in your browser. Standard AES encryption with zero server exposure.',
    badge: 'AES PDF Protection',
    gradient: 'from-slate-700 to-neutral-900',
    faqs: [
      {
        q: 'Can anyone on the internet see the password I choose?',
        a: 'No. The password never travels across the network because encryption is computed entirely inside your browser session.'
      }
    ]
  }
];

const outDir = path.resolve(__dirname, '../public/tools');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

for (const p of PAGES) {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: p.faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.a
      }
    }))
  };

  const appSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: `DocuZenith ${p.h1}`,
    url: `${BASE_URL}/tools/${p.id}.html`,
    description: p.metaDesc,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'All modern browsers',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD'
    }
  };

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${p.title} | DocuZenith</title>
    <meta name="description" content="${p.metaDesc}" />
    <link rel="canonical" href="${BASE_URL}/tools/${p.id}.html" />
    <link rel="icon" type="image/svg+xml" href="../favicon.svg" />

    <!-- Open Graph -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${BASE_URL}/tools/${p.id}.html" />
    <meta property="og:title" content="${p.title}" />
    <meta property="og:description" content="${p.metaDesc}" />
    <meta property="og:site_name" content="DocuZenith" />

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${p.title}" />
    <meta name="twitter:description" content="${p.metaDesc}" />

    <!-- Structured Data Schema -->
    <script type="application/ld+json">
      ${JSON.stringify(appSchema)}
    </script>
    <script type="application/ld+json">
      ${JSON.stringify(faqSchema)}
    </script>

    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        background-color: #fafafa;
        color: #171717;
        line-height: 1.5;
      }
      .header {
        border-bottom: 1px solid #e5e5e5;
        background: rgba(255, 255, 255, 0.9);
        position: sticky;
        top: 0;
        z-index: 50;
      }
      .nav-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 1.5rem;
        height: 4rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .logo {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        text-decoration: none;
        color: inherit;
      }
      .logo-icon {
        width: 2.5rem;
        height: 2.5rem;
        border-radius: 0.75rem;
        background: linear-gradient(135deg, #4f46e5, #9333ea);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 800;
      }
      .hero-section {
        max-width: 900px;
        margin: 3rem auto;
        padding: 0 1.5rem;
        text-align: center;
      }
      .badge {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.25rem 0.75rem;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 600;
        background: #ecfdf5;
        color: #047857;
        border: 1px solid #a7f3d0;
        margin-bottom: 1.25rem;
      }
      h1 {
        font-size: clamp(2rem, 4vw, 3.25rem);
        font-weight: 800;
        letter-spacing: -0.03em;
        line-height: 1.15;
        color: #0a0a0a;
        margin-bottom: 1rem;
      }
      .subhead {
        font-size: 1.125rem;
        color: #525252;
        max-width: 700px;
        margin: 0 auto 2rem auto;
      }
      .cta-card {
        background: white;
        border: 2px dashed #cbd5e1;
        border-radius: 1.5rem;
        padding: 3rem 2rem;
        margin: 2rem 0;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
      }
      .cta-btn {
        display: inline-block;
        background: #0f172a;
        color: white;
        padding: 1rem 2.25rem;
        border-radius: 1rem;
        font-weight: 700;
        font-size: 1rem;
        text-decoration: none;
        transition: transform 0.15s ease, background 0.15s ease;
      }
      .cta-btn:hover {
        background: #334155;
        transform: translateY(-2px);
      }
      .privacy-strip {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 1.5rem;
        font-size: 0.8125rem;
        color: #64748b;
        margin-top: 1.5rem;
      }
      .faq-section {
        max-width: 800px;
        margin: 4rem auto;
        padding: 0 1.5rem;
      }
      .faq-item {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 1rem;
        padding: 1.5rem;
        margin-bottom: 1rem;
      }
      .faq-item h3 {
        font-size: 1.05rem;
        font-weight: 700;
        margin-bottom: 0.5rem;
        color: #0f172a;
      }
      .faq-item p {
        font-size: 0.9375rem;
        color: #475569;
        line-height: 1.6;
      }
    </style>
  </head>
  <body>
    <header class="header">
      <div class="nav-container">
        <a href="${BASE_URL}/" class="logo">
          <div class="logo-icon">DZ</div>
          <div>
            <strong style="font-size: 1.125rem;">DocuZenith</strong>
            <span style="font-size: 0.75rem; color: #059669; margin-left: 0.35rem;">• 100% Client-Side</span>
          </div>
        </a>
        <a href="${BASE_URL}/" class="cta-btn" style="padding: 0.5rem 1rem; font-size: 0.8125rem; border-radius: 0.5rem;">All 28 Tools</a>
      </div>
    </header>

    <main class="hero-section">
      <div class="badge">🔒 ${p.badge}</div>
      <h1>${p.h1}</h1>
      <p class="subhead">${p.sub}</p>

      <div class="cta-card">
        <div style="font-size: 2.5rem; margin-bottom: 1rem;">📄</div>
        <h2 style="font-size: 1.25rem; margin-bottom: 0.5rem;">Ready to process your document privately?</h2>
        <p style="font-size: 0.875rem; color: #64748b; margin-bottom: 1.5rem;">Processed locally via in-memory WebAssembly. Zero data touches any cloud server.</p>
        <a href="${BASE_URL}/#/${p.id}" class="cta-btn">Open ${p.badge}</a>
      </div>

      <div class="privacy-strip">
        <span>🔒 Zero Server Uploads</span>
        <span>⚡ 100% In-Browser RAM</span>
        <span>🛡️ HIPAA & GDPR Safe</span>
        <span>📶 Works Offline</span>
      </div>
    </main>

    <section class="faq-section">
      <h2 style="font-size: 1.5rem; font-weight: 800; margin-bottom: 1.5rem; text-align: center;">Frequently Asked Questions</h2>
      ${p.faqs
        .map(
          (f) => `
      <div class="faq-item">
        <h3>${f.q}</h3>
        <p>${f.a}</p>
      </div>`
        )
        .join('')}
    </section>
  </body>
</html>`;

  const dest = path.resolve(outDir, `${p.id}.html`);
  fs.writeFileSync(dest, html, 'utf8');
  console.log(`Generated static landing page: ${dest}`);
}
