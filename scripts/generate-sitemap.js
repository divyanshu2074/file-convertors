import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://divyanshu2074.github.io/file-convertors';
const TODAY = new Date().toISOString().split('T')[0];

const TOOLS = [
  'merge-pdf', 'split-pdf', 'organize-pdf', 'rotate-pdf', 'page-numbers', 'crop-pdf',
  'compress-pdf', 'repair-pdf', 'pdf-to-pdfa', 'pdf-to-word', 'pdf-to-powerpoint',
  'pdf-to-excel', 'pdf-to-jpg', 'word-to-pdf', 'powerpoint-to-pdf', 'excel-to-pdf',
  'jpg-to-pdf', 'html-to-pdf', 'scan-to-pdf', 'edit-pdf', 'sign-pdf', 'watermark-pdf',
  'protect-pdf', 'unlock-pdf', 'redact-pdf', 'ocr-pdf', 'compare-pdf', 'pdf-forms'
];

const BLOG_SLUGS = [
  'how-to-merge-pdf-files-locally-without-uploading',
  'complete-guide-to-pdf-redaction-why-black-boxes-arent-enough',
  'client-side-vs-server-side-pdf-tools-security-comparison',
  'how-to-compress-pdf-files-for-email-without-losing-quality',
  'signing-pdfs-legally-free-in-your-browser-touch-drawing',
  'optical-character-recognition-ocr-in-browser-tesseract',
  'how-to-convert-pdf-to-word-docx-without-losing-formatting',
  'how-to-password-protect-sensitive-pdfs-aes-encryption',
  'unlocking-password-protected-pdfs-in-browser-decryption',
  'converting-word-documents-docx-to-pdf-completely-offline',
  'converting-excel-spreadsheets-xlsx-to-clean-pdf-reports',
  'transforming-powerpoint-presentations-pptx-into-shareable-pdfs',
  'how-to-crop-and-trim-pdf-margins-for-mobile-reading',
  'adding-professional-watermarks-to-pdf-contracts',
  'flatten-fillable-pdf-forms-prevent-post-signing-tampering',
  'organizing-pdf-pages-drag-drop-rotate-delete-guide',
  'converting-images-jpg-png-webp-to-multipage-pdf',
  'hipaa-gdpr-compliance-document-processing-client-side',
  'offline-document-processing-how-pwa-works-without-wifi',
  'adding-sequential-page-numbers-to-legal-bundles-and-theses',
  'hidden-dangers-of-free-online-pdf-converters'
];

const LANDING_PAGES = [
  'merge-pdf',
  'compress-pdf',
  'split-pdf',
  'pdf-to-word',
  'sign-pdf',
  'redact-pdf',
  'ocr-pdf',
  'protect-pdf'
];

let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">

  <!-- Core Landing Page -->
  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>

  <!-- Blog Hub -->
  <url>
    <loc>${BASE_URL}/#/blog</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
`;

// Dedicated Crawlable Tool Landing Pages
for (const tool of LANDING_PAGES) {
  xml += `  <url>
    <loc>${BASE_URL}/tools/${tool}.html</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.95</priority>
  </url>\n`;
}

// Interactive Tools (Hash URLs)
for (const tool of TOOLS) {
  xml += `  <url>
    <loc>${BASE_URL}/#/${tool}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>\n`;
}

// Blog Articles
for (const slug of BLOG_SLUGS) {
  xml += `  <url>
    <loc>${BASE_URL}/#/blog/${slug}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.80</priority>
  </url>\n`;
}

xml += `</urlset>\n`;

const targetFile = path.resolve(__dirname, '../public/sitemap.xml');
fs.writeFileSync(targetFile, xml, 'utf8');
console.log(`Generated sitemap with ${1 + 1 + LANDING_PAGES.length + TOOLS.length + BLOG_SLUGS.length} URLs at ${targetFile}`);
