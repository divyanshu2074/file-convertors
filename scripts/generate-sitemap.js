import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://divyanshu2074.github.io/file-convertors';
const TODAY = new Date().toISOString().split('T')[0];

// Read all tools
const toolsPath = path.resolve(__dirname, '../src/data/tools.ts');
const toolsCode = fs.readFileSync(toolsPath, 'utf8');
const toolIds = [...toolsCode.matchAll(/id:\s*'([^']+)'/g)]
  .map((m) => m[1])
  .filter((id) => !['all', 'organize', 'optimize', 'convert-from', 'convert-to', 'edit-security', 'advanced'].includes(id));

// Read all blogs
const blogsPath = path.resolve(__dirname, '../src/data/blogs.ts');
const blogsCode = fs.readFileSync(blogsPath, 'utf8');
const blogSlugs = [...blogsCode.matchAll(/slug:\s*'([^']+)'/g)].map((m) => m[1]);

let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

  <!-- Core Landing Page -->
  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>

  <!-- Blog Knowledge Base Hub -->
  <url>
    <loc>${BASE_URL}/blog/</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
`;

// All 28 Tools (Static Crawlable Landing Pages)
for (const tool of toolIds) {
  xml += `  <url>
    <loc>${BASE_URL}/tools/${tool}.html</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.95</priority>
  </url>\n`;
}

// All 21 Technical Blog Articles (Static Crawlable HTML Pages)
for (const slug of blogSlugs) {
  xml += `  <url>
    <loc>${BASE_URL}/blog/${slug}.html</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.85</priority>
  </url>\n`;
}

xml += `</urlset>\n`;

const targetFile = path.resolve(__dirname, '../public/sitemap.xml');
fs.writeFileSync(targetFile, xml, 'utf8');
console.log(`Generated fragment-free sitemap with ${1 + 1 + toolIds.length + blogSlugs.length} valid URLs at ${targetFile}`);
