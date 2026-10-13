import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.NODE_PATH ?? '', 'playwright'));
const root = path.resolve(import.meta.dirname, '..');
const inventory = JSON.parse(await fs.readFile(path.join(root, 'site-locales.json'), 'utf8'));
const widths = [320, 390, 768, 1024, 1440];
const navigationSlugs = [
  'currency-converter',
  'exchange-rate-markup-calculator',
  'multi-currency-converter',
  'exchange-rate-history',
  'currency-converter-widget',
  'foreign-transaction-fee-calculator',
  'travel-budget-calculator'
];

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
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
const runtimeErrors = [];
page.on('pageerror', error => runtimeErrors.push(error.message));
page.on('console', message => {
  if (message.type() === 'error') runtimeErrors.push(message.text());
});

const failures = [];
let checks = 0;
let toolChecks = 0;
try {
  for (const locale of inventory.locales) {
    const expectedLinks = navigationSlugs.map(slug => locale.toolUrls[slug]);
    for (const width of widths) {
      await page.setViewportSize({ width, height: 1000 });
      const response = await page.goto(`http://127.0.0.1:${port}${locale.url}`, { waitUntil: 'domcontentloaded' });
      await page.locator('.tools-menu > summary').click();
      const result = await page.evaluate(() => {
        const cards = [...document.querySelectorAll('.tools-menu-panel > a')];
        const rects = cards.map(card => {
          const rect = card.getBoundingClientRect();
          return {
            left: rect.left,
            right: rect.right,
            top: rect.top,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height,
            scrollWidth: card.scrollWidth,
            clientWidth: card.clientWidth,
            scrollHeight: card.scrollHeight,
            clientHeight: card.clientHeight
          };
        });
        const overlaps = [];
        for (let first = 0; first < rects.length; first += 1) {
          for (let second = first + 1; second < rects.length; second += 1) {
            const a = rects[first];
            const b = rects[second];
            if (a.left < b.right - 0.5 && a.right > b.left + 0.5 && a.top < b.bottom - 0.5 && a.bottom > b.top + 0.5) {
              overlaps.push([first + 1, second + 1]);
            }
          }
        }
        return {
          htmlLang: document.documentElement.lang,
          htmlDir: document.documentElement.dir || 'ltr',
          computedDirection: getComputedStyle(document.querySelector('.tools-menu-panel')).direction,
          viewportWidth: document.documentElement.clientWidth,
          documentWidth: document.documentElement.scrollWidth,
          bodyWidth: document.body.scrollWidth,
          overflowOffenders: [...document.querySelectorAll('body *')]
            .map(element => {
              const rect = element.getBoundingClientRect();
              return {
                tag: element.tagName,
                id: element.id,
                className: typeof element.className === 'string' ? element.className : '',
                left: rect.left,
                right: rect.right,
                scrollWidth: element.scrollWidth,
                clientWidth: element.clientWidth
              };
            })
            .filter(item => item.left < -1 || item.right > innerWidth + 1 || item.scrollWidth > item.clientWidth + 1)
            .slice(0, 12),
          hrefs: cards.map(card => card.getAttribute('href')),
          cardCount: cards.length,
          rects,
          overlaps
        };
      });

      const cardInsideViewport = result.rects.every(rect => rect.left >= -1 && rect.right <= width + 1);
      const labelsVisible = result.rects.every(rect =>
        rect.width > 0 && rect.height > 0
        && rect.scrollWidth <= rect.clientWidth + 1
        && rect.scrollHeight <= rect.clientHeight + 1);
      await page.keyboard.press('Escape');
      const escapeClosedAndFocused = await page.evaluate(() =>
        !document.querySelector('.tools-menu').open
        && document.activeElement === document.querySelector('.tools-menu > summary'));
      await page.locator('.tools-menu > summary').press('Enter');
      const keyboardOpen = await page.locator('.tools-menu').evaluate(menu => menu.open);
      await page.keyboard.press('Escape');
      const matches = response?.ok()
        && result.htmlLang === locale.webLocale
        && result.htmlDir === locale.dir
        && result.computedDirection === locale.dir
        && result.documentWidth <= width
        && result.bodyWidth <= width
        && result.cardCount === navigationSlugs.length
        && JSON.stringify(result.hrefs) === JSON.stringify(expectedLinks)
        && cardInsideViewport
        && labelsVisible
        && result.overlaps.length === 0
        && escapeClosedAndFocused
        && keyboardOpen;

      if (!matches) {
        failures.push(`${locale.webLocale} @ ${width}px: ${JSON.stringify({ expectedLinks, expectedDir: locale.dir, ...result })}`);
      }
      checks += 1;
    }
  }

  for (const slug of navigationSlugs) {
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      const response = await page.goto(`http://127.0.0.1:${port}/${slug}/`, { waitUntil: 'domcontentloaded' });
      await page.locator('.tools-menu > summary').click();
      const result = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        hrefs: [...document.querySelectorAll('.tools-menu-panel > a')].map(link => link.getAttribute('href')),
        currentHref: document.querySelector('.tools-menu-panel > a[aria-current="page"]')?.getAttribute('href') ?? null,
        relatedHrefs: [...document.querySelectorAll('.related-tools a')].map(link => link.getAttribute('href')),
        appBeforeRelated: Boolean(document.querySelector('.calculator-cta')?.compareDocumentPosition(document.querySelector('.related-tools')) & Node.DOCUMENT_POSITION_FOLLOWING)
      }));
      const expectedLinks = navigationSlugs.map(item => `/${item}/`);
      const matches = response?.ok()
        && result.documentWidth <= width
        && result.bodyWidth <= width
        && JSON.stringify(result.hrefs) === JSON.stringify(expectedLinks)
        && result.currentHref === `/${slug}/`
        && result.relatedHrefs.length === navigationSlugs.length - 1
        && !result.relatedHrefs.includes(`/${slug}/`)
        && result.appBeforeRelated;
      if (!matches) failures.push(`tool ${slug} @ ${width}px: ${JSON.stringify(result)}`);
      toolChecks += 1;
    }
  }
} finally {
  await browser.close();
  server.close();
}

if (runtimeErrors.length) {
  failures.push(`Runtime errors: ${[...new Set(runtimeErrors)].join(' | ')}`);
}
if (failures.length) {
  throw new Error(`Homepage navigation browser QA failed (${failures.length}):\n${failures.join('\n')}`);
}

console.log(`Navigation browser QA PASS: ${checks} localized homepage checks and ${toolChecks} English tool-page checks.`);
