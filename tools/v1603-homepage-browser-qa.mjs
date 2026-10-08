import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.NODE_PATH ?? '', 'playwright'));
const root = path.resolve(import.meta.dirname, '..');
const locales = JSON.parse(await fs.readFile(path.join(root, 'site-locales.json'), 'utf8')).locales;
const localeStart = Number.parseInt(process.argv[2] ?? '0', 10);
const localeEnd = Number.parseInt(process.argv[3] ?? String(locales.length), 10);
const selectedLocales = locales.slice(localeStart, localeEnd);
const widths = [320, 390, 768, 1024, 1440];
const captures = new Set(['en:320', 'en:1440', 'ru:320', 'ru:1440', 'ar:320', 'ar:1440']);
const captureRoot = path.join(root, 'artifacts', 'v1-603-homepage-qa');
const contentTypes = {
  '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.png': 'image/png', '.webp': 'image/webp'
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

await fs.mkdir(captureRoot, { recursive: true });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.BROWSER_EXECUTABLE || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
});
const page = await browser.newPage();
await page.route('**/*', route => {
  const url = new URL(route.request().url());
  if (url.hostname === '127.0.0.1') route.continue();
  else route.abort();
});
const failures = [];
let checks = 0;

try {
  for (const locale of selectedLocales) {
    for (const width of widths) {
      await page.setViewportSize({ width, height: 1000 });
      const response = await page.goto(`http://127.0.0.1:${port}${locale.url}`, { waitUntil: 'domcontentloaded' });
      await page.locator('#screenshots').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => [...document.querySelectorAll('.screenshot-card img')]
        .every(image => image.complete && image.naturalWidth > 0));
      const result = await page.evaluate(() => {
        const visible = element => {
          const style = getComputedStyle(element);
          return style.display !== 'none' && style.visibility !== 'hidden';
        };
        const outOfBounds = [...document.querySelectorAll('main *, header *')]
          .filter(visible)
          .map(element => ({ element, rect: element.getBoundingClientRect() }))
          .filter(({ rect }) => rect.width > 1 && (rect.left < -1 || rect.right > innerWidth + 1))
          .slice(0, 5)
          .map(({ element, rect }) => ({
            tag: element.tagName,
            className: element.className,
            left: Math.round(rect.left),
            right: Math.round(rect.right)
          }));
        const screenshots = [...document.querySelectorAll('.screenshot-card img')];
        return {
          documentOverflow: document.documentElement.scrollWidth - innerWidth,
          outOfBounds,
          screenshotCards: screenshots.length,
          featureCards: document.querySelectorAll('.feature-card').length,
          failedImages: screenshots.filter(image => !image.complete || image.naturalWidth !== 333 || image.naturalHeight !== 592).length,
          heroCurrent: document.querySelector('.phone-frame img')?.getAttribute('src') === '/assets/screenshots/v1-603/screenshot-1.png',
          newsLinks: document.querySelectorAll('a[href*="/news/"]').length
        };
      });
      checks += 1;
      const problems = [];
      if (!response?.ok()) problems.push(`HTTP ${response?.status()}`);
      if (result.documentOverflow > 1) problems.push(`document overflow ${result.documentOverflow}px`);
      if (result.outOfBounds.length) problems.push(`out of bounds ${JSON.stringify(result.outOfBounds)}`);
      if (result.screenshotCards !== 6) problems.push(`${result.screenshotCards} screenshot cards`);
      if (result.featureCards !== 6) problems.push(`${result.featureCards} feature cards`);
      if (result.failedImages) problems.push(`${result.failedImages} failed screenshot images`);
      if (!result.heroCurrent) problems.push('stale hero image');
      if (result.newsLinks) problems.push(`${result.newsLinks} news links`);
      if (problems.length) failures.push(`${locale.webLocale} @ ${width}px: ${problems.join('; ')}`);
      if (captures.has(`${locale.webLocale}:${width}`)) {
        await page.screenshot({ path: path.join(captureRoot, `${locale.webLocale}-${width}.png`), fullPage: true });
      }
    }
  }
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}

const reportName = localeStart === 0 && localeEnd === locales.length
  ? 'report.json'
  : `report-${localeStart}-${localeEnd}.json`;
await fs.writeFile(path.join(captureRoot, reportName), `${JSON.stringify({ localeStart, localeEnd, checks, failures }, null, 2)}\n`, 'utf8');
if (failures.length) throw new Error(`Homepage browser QA failed:\n${failures.join('\n')}`);
console.log(`Homepage browser QA passed: ${checks} locale/viewport combinations; 6 reference captures saved.`);
