import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://divyanshu2074.github.io/file-convertors';

// Read blogs.ts content
const blogsPath = path.resolve(__dirname, '../src/data/blogs.ts');
const blogsCode = fs.readFileSync(blogsPath, 'utf8');

// Parse blog posts from code
const posts = [];
const postBlocks = blogsCode.split(/\{\s*slug:\s*'/).slice(1);

for (const block of postBlocks) {
  const slug = block.split("'")[0];
  const title = (block.match(/title:\s*'([^']+)'/) || [])[1] || '';
  const metaDesc = (block.match(/metaDescription:\s*'([^']+)'/) || [])[1] || '';
  const author = (block.match(/author:\s*'([^']+)'/) || [])[1] || 'Divyanshu Gupta';
  const publishedDate = (block.match(/publishedDate:\s*'([^']+)'/) || [])[1] || 'October 2026';
  const categoryLabel = (block.match(/categoryLabel:\s*'([^']+)'/) || [])[1] || 'Article';
  const summary = (block.match(/summary:\s*'([^']+)'/) || [])[1] || '';
  const targetToolId = (block.match(/targetToolId:\s*'([^']+)'/) || [])[1] || 'merge-pdf';

  posts.push({
    slug,
    title,
    metaDesc,
    author,
    publishedDate,
    categoryLabel,
    summary,
    targetToolId,
  });
}

const outDir = path.resolve(__dirname, '../public/blog');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Generate Blog Hub index.html
const hubHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>DocuZenith Engineering, Security & Architecture Blog</title>
    <meta name="description" content="In-depth guides on client-side WebAssembly document processing, true PDF redaction, HIPAA/GDPR data security, and in-browser conversion architectures." />
    <meta name="google-site-verification" content="-G6xpn8iM-npkMqzVXm1uZiWUgkJHOonIzqnLGhmy80" />
    <meta name="msvalidate.01" content="E45AB70458A77F2056C817FADA06B545" />
    <link rel="canonical" href="${BASE_URL}/blog/" />
    <link rel="icon" type="image/svg+xml" href="../favicon.svg" />
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #fafafa; color: #171717; padding: 2rem 1rem; }
      .container { max-width: 900px; margin: 0 auto; }
      header { text-align: center; margin-bottom: 3rem; }
      h1 { font-size: 2.5rem; font-weight: 800; margin-bottom: 0.5rem; }
      p.sub { font-size: 1.125rem; color: #525252; }
      .grid { display: grid; grid-template-columns: 1fr; gap: 1.5rem; }
      .card { background: white; border: 1px solid #e5e5e5; border-radius: 1rem; padding: 1.5rem; transition: transform 0.2s; text-decoration: none; color: inherit; display: block; }
      .card:hover { transform: translateY(-2px); border-color: #cbd5e1; }
      .tag { display: inline-block; font-size: 0.75rem; font-weight: 600; background: #e0e7ff; color: #4338ca; padding: 0.2rem 0.5rem; border-radius: 0.375rem; margin-bottom: 0.5rem; }
      .card h2 { font-size: 1.25rem; margin-bottom: 0.5rem; }
      .card p { font-size: 0.875rem; color: #64748b; line-height: 1.5; }
      .nav-back { display: inline-block; margin-bottom: 2rem; color: #4f46e5; text-decoration: none; font-weight: 600; font-size: 0.875rem; }
    </style>
  </head>
  <body>
    <div class="container">
      <a href="${BASE_URL}/" class="nav-back">← Back to DocuZenith Tools</a>
      <header>
        <h1>DocuZenith Knowledge Base & Tech Guides</h1>
        <p class="sub">Deep dives into client-side cryptography, in-browser WebAssembly conversions, and document privacy.</p>
      </header>
      <div class="grid">
        ${posts
          .map(
            (p) => `
        <a href="${BASE_URL}/blog/${p.slug}.html" class="card">
          <span class="tag">${p.categoryLabel}</span>
          <h2>${p.title}</h2>
          <p>${p.summary || p.metaDesc}</p>
        </a>`
          )
          .join('')}
      </div>
    </div>
  </body>
</html>`;

fs.writeFileSync(path.resolve(outDir, 'index.html'), hubHtml, 'utf8');

// Generate each individual blog post HTML
for (const p of posts) {
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: p.title,
    description: p.metaDesc,
    author: {
      '@type': 'Person',
      name: p.author
    },
    publisher: {
      '@type': 'Organization',
      name: 'DocuZenith',
      logo: {
        '@type': 'ImageObject',
        url: `${BASE_URL}/favicon.svg`
      }
    },
    datePublished: p.publishedDate,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${BASE_URL}/blog/${p.slug}.html`
    }
  };

  const postHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${p.title} | DocuZenith</title>
    <meta name="description" content="${p.metaDesc}" />
    <meta name="google-site-verification" content="-G6xpn8iM-npkMqzVXm1uZiWUgkJHOonIzqnLGhmy80" />
    <meta name="msvalidate.01" content="E45AB70458A77F2056C817FADA06B545" />
    <link rel="canonical" href="${BASE_URL}/blog/${p.slug}.html" />
    <link rel="icon" type="image/svg+xml" href="../favicon.svg" />

    <!-- Open Graph -->
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${BASE_URL}/blog/${p.slug}.html" />
    <meta property="og:title" content="${p.title}" />
    <meta property="og:description" content="${p.metaDesc}" />
    <meta property="og:site_name" content="DocuZenith" />

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${p.title}" />
    <meta name="twitter:description" content="${p.metaDesc}" />

    <!-- Article JSON-LD Schema -->
    <script type="application/ld+json">
      ${JSON.stringify(articleSchema)}
    </script>

    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #fafafa; color: #171717; line-height: 1.6; padding: 2rem 1rem; }
      .article-container { max-width: 800px; margin: 0 auto; background: white; border: 1px solid #e5e5e5; border-radius: 1.5rem; padding: 2.5rem; }
      .badge { display: inline-block; font-size: 0.75rem; font-weight: 700; background: #e0e7ff; color: #4338ca; padding: 0.25rem 0.6rem; border-radius: 0.5rem; margin-bottom: 1rem; }
      h1 { font-size: 2.25rem; font-weight: 800; line-height: 1.2; margin-bottom: 1rem; color: #0f172a; }
      .meta { font-size: 0.875rem; color: #64748b; margin-bottom: 2rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 1rem; }
      .summary { font-size: 1.125rem; color: #334155; line-height: 1.7; margin-bottom: 2rem; background: #f8fafc; border-left: 4px solid #4f46e5; padding: 1rem 1.25rem; border-radius: 0.5rem; }
      .cta-box { background: linear-gradient(135deg, #f8fafc, #eff6ff); border: 1px solid #bfdbfe; border-radius: 1rem; padding: 1.5rem; text-align: center; margin-top: 2rem; }
      .cta-btn { display: inline-block; background: #0f172a; color: white; padding: 0.75rem 1.75rem; border-radius: 0.75rem; font-weight: 700; text-decoration: none; margin-top: 1rem; }
      .nav-links { display: flex; justify-content: space-between; margin-bottom: 1.5rem; font-size: 0.875rem; }
      .nav-links a { color: #4f46e5; text-decoration: none; font-weight: 600; }
    </style>
  </head>
  <body>
    <div class="article-container">
      <div class="nav-links">
        <a href="${BASE_URL}/blog/">← All Articles</a>
        <a href="${BASE_URL}/">DocuZenith Home</a>
      </div>
      <span class="badge">${p.categoryLabel}</span>
      <h1>${p.title}</h1>
      <div class="meta">
        <span>By ${p.author}</span> • <span>Published ${p.publishedDate}</span>
      </div>

      <div class="summary">
        ${p.summary}
      </div>

      <div class="cta-box">
        <h3 style="font-size: 1.125rem; margin-bottom: 0.5rem;">Try this tool 100% in your browser</h3>
        <p style="font-size: 0.875rem; color: #64748b;">Fast, private, zero server uploads, and completely free.</p>
        <a href="${BASE_URL}/#/${p.targetToolId}" class="cta-btn">Open Tool in DocuZenith</a>
      </div>
    </div>
  </body>
</html>`;

  fs.writeFileSync(path.resolve(outDir, `${p.slug}.html`), postHtml, 'utf8');
}

console.log(`Generated blog hub and ${posts.length} static blog articles at ${outDir}`);
