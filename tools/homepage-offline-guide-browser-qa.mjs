import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.NODE_PATH ?? '', 'playwright'));
const root = path.resolve(import.meta.dirname, '..');
const inventory = JSON.parse(await fs.readFile(path.join(root, 'site-locales.json'), 'utf8'));
const copy = JSON.parse(await fs.readFile(path.join(root, 'tools', 'homepage-link-copy.json'), 'utf8'));
const widths = [320, 390, 1440];

const contentTypes = {
  '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp'
};

const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    const relative = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
    const file = path.resolve(root, `.${relative}`);
    if (!file.startsWith(root)) throw new Error('Invalid path');
    response.writeHead(200, { 'Content-Type': contentTypes[path.extname(file)] ?? 'application/octet-stream' });
    response.end(await fs.readFile(file));
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
});

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.BROWSER_EXECUTABLE || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
});
const page = await browser.newPage();
const failures = [];
let checks = 0;

try {
  for (const locale of inventory.locales) {
    for (const width of widths) {
      const runtimeErrors = [];
      const onPageError = error => runtimeErrors.push(error.message);
      const onConsole = message => { if (message.type() === 'error') runtimeErrors.push(message.text()); };
      page.on('pageerror', onPageError);
      page.on('console', onConsole);
      await page.setViewportSize({ width, height: 1000 });
      const response = await page.goto(`http://127.0.0.1:${port}${locale.url}`, { waitUntil: 'domcontentloaded' });
      const expectedHref = locale.toolUrls['offline-currency-converter'];
      const result = await page.evaluate(({ expectedHref, expectedText }) => {
        const link = [...document.querySelectorAll('a.text-link')].find(item => item.getAttribute('href') === expectedHref);
        const card = link?.closest('.feature-card');
        const linkRect = link?.getBoundingClientRect();
        const cardRect = card?.getBoundingClientRect();
        return {
          text: link?.textContent.trim() ?? null,
          href: link?.getAttribute('href') ?? null,
          visible: Boolean(link && linkRect.width > 0 && linkRect.height > 0 && getComputedStyle(link).visibility !== 'hidden'),
          insideCard: Boolean(linkRect && cardRect && linkRect.left >= cardRect.left - 1 && linkRect.right <= cardRect.right + 1),
          linkDirection: link ? getComputedStyle(link).direction : null,
          htmlDir: document.documentElement.dir || 'ltr',
          documentWidth: document.documentElement.scrollWidth,
          bodyWidth: document.body.scrollWidth,
          expectedText
        };
      }, { expectedHref, expectedText: copy[locale.webLocale].offlineGuide });
      page.off('pageerror', onPageError);
      page.off('console', onConsole);

      const pass = response?.ok()
        && result.text === result.expectedText
        && result.href === expectedHref
        && result.visible
        && result.insideCard
        && result.documentWidth <= width
        && result.bodyWidth <= width
        && result.htmlDir === locale.dir
        && result.linkDirection === locale.dir
        && runtimeErrors.length === 0;
      if (!pass) failures.push(`${locale.webLocale} @ ${width}px: ${JSON.stringify({ ...result, runtimeErrors })}`);
      checks += 1;
    }
  }
} finally {
  await browser.close();
  server.close();
}

if (failures.length) throw new Error(`Homepage offline-guide browser QA failed (${failures.length}):\n${failures.join('\n')}`);
console.log(`Homepage offline-guide browser QA PASS: ${inventory.locales.length} locales × ${widths.length} widths = ${checks} checks.`);
