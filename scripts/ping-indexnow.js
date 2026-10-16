import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOST = 'divyanshu2074.github.io';
const KEY = 'c037803a647942668b556f8f7be2e683';
const KEY_LOCATION = `https://${HOST}/file-convertors/${KEY}.txt`;

// Read sitemap to extract all URLs
const sitemapPath = path.resolve(__dirname, '../public/sitemap.xml');
const sitemapXml = fs.readFileSync(sitemapPath, 'utf8');
const urls = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

console.log(`Submitting ${urls.length} URLs to IndexNow (Bing, Yandex, Seznam, Naver)...`);

const payload = {
  host: HOST,
  key: KEY,
  keyLocation: KEY_LOCATION,
  urlList: urls,
};

async function pingIndexNow() {
  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    if (res.status === 200 || res.status === 202) {
      console.log(`IndexNow Submission Successful! (Status: ${res.status})`);
      console.log(`Search engines notified for instant indexing: Microsoft Bing, Yahoo, Yandex, Seznam, Naver.`);
    } else {
      const errText = await res.text();
      console.log(`IndexNow returned response code ${res.status}: ${errText}`);
    }
  } catch (err) {
    console.warn(`Could not ping IndexNow (network or offline): ${err.message}`);
  }
}

pingIndexNow();
