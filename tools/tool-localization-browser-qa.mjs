import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.NODE_PATH ?? '', 'playwright'));
const root = path.resolve(import.meta.dirname, '..');
const inventory = JSON.parse(await fs.readFile(path.join(root, 'site-locales.json'), 'utf8'));
const routes = { en: '', sr: 'sr', de: 'de', ru: 'ru', ar: 'ar', he: 'he', ja: 'ja', 'zh-Hans': 'zh-hans' };
const tools = ['currency-converter', 'exchange-rate-markup-calculator', 'multi-currency-converter', 'offline-currency-converter', 'exchange-rate-history', 'currency-converter-widget', 'foreign-transaction-fee-calculator', 'travel-budget-calculator'];
const widths = [320, 390, 768, 1440];

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.xml': 'application/xml' };
const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    const relative = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
    const file = path.resolve(root, `.${relative}`);
    if (!file.startsWith(root)) throw new Error('invalid path');
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream' });
    response.end(await fs.readFile(file));
  } catch {
    response.writeHead(404); response.end('Not found');
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();

const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' });
const context = await browser.newContext();
await context.route('https://api.frankfurter.dev/v2/rates', route => route.fulfill({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify([
    { date: '2026-09-08', base: 'EUR', quote: 'RSD', rate: 117 },
    { date: '2026-09-08', base: 'EUR', quote: 'USD', rate: 1.2 },
    { date: '2026-09-08', base: 'EUR', quote: 'JPY', rate: 180 }
  ])
}));
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });

const checks = [];
const smokeFailures = [];
const layoutFailures = [];
try {
  for (const locale of inventory.locales) {
    const route = locale.url === '/' ? '' : locale.url.slice(1, -1);
    for (const tool of tools) {
      await page.setViewportSize({ width: 390, height: 900 });
      await page.goto(`http://127.0.0.1:${port}/${route ? `${route}/` : ''}${tool}/`, { waitUntil: 'domcontentloaded' });
      const smoke = await page.evaluate(() => ({
        lang: document.documentElement.lang,
        h1: Boolean(document.querySelector('h1')),
        horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        offenders: [...document.querySelectorAll('body *')].map(element => {
          const rect = element.getBoundingClientRect();
          return { tag: element.tagName, className: element.className, id: element.id, left: rect.left, right: rect.right, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth };
        }).filter(item => item.left < -1 || item.right > innerWidth + 1 || item.scrollWidth > item.clientWidth + 2)
          .sort((a, b) => Math.max(b.right - innerWidth, b.scrollWidth - b.clientWidth) - Math.max(a.right - innerWidth, a.scrollWidth - a.clientWidth))
          .slice(0, 12)
      }));
      if (smoke.lang !== locale.webLocale || !smoke.h1 || smoke.horizontalOverflow > 1) {
        smokeFailures.push(`${locale.webLocale}/${tool}: ${JSON.stringify(smoke)}`);
      }
    }
  }
  if (smokeFailures.length) throw new Error(`All-locale smoke failures (${smokeFailures.length}):\n${smokeFailures.join('\n')}`);

  for (const [locale, route] of Object.entries(routes)) {
    for (const tool of tools) {
      for (const width of widths) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`http://127.0.0.1:${port}/${route ? `${route}/` : ''}${tool}/`, { waitUntil: 'domcontentloaded' });
        const result = await page.evaluate(() => {
          const h1 = document.querySelector('h1');
          const rect = h1?.getBoundingClientRect();
          const clipped = [...document.querySelectorAll('button, a.primary-button, a.secondary-button, select')]
            .filter(element => element.scrollWidth > element.clientWidth + 2).length;
          const offenders = [...document.querySelectorAll('body *')].map(element => {
            const item = element.getBoundingClientRect();
            return { tag: element.tagName, id: element.id, className: element.className, left: item.left, right: item.right, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth };
          }).filter(item => item.left < -1 || item.right > innerWidth + 1 || item.scrollWidth > item.clientWidth + 2)
            .sort((a, b) => Math.max(b.right - innerWidth, b.scrollWidth - b.clientWidth) - Math.max(a.right - innerWidth, a.scrollWidth - a.clientWidth)).slice(0, 6);
          return {
            lang: document.documentElement.lang,
            dir: document.documentElement.dir || 'ltr',
            horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            h1Visible: Boolean(rect && rect.width > 0 && rect.left >= -1 && rect.right <= innerWidth + 1),
            clippedControls: clipped,
            offenders
          };
        });
        if (result.lang !== locale || result.dir !== (['ar', 'he'].includes(locale) ? 'rtl' : 'ltr') || result.horizontalOverflow > 1 || !result.h1Visible || result.clippedControls) {
          layoutFailures.push(`${locale}/${tool} @ ${width}: ${JSON.stringify(result)}`);
        } else {
          checks.push({ locale, tool, width, status: 'PASS' });
        }
      }
    }
  }
  if (layoutFailures.length) throw new Error(`Representative layout failures (${layoutFailures.length}):\n${layoutFailures.join('\n')}`);

  for (const locale of ['en', 'de', 'ru', 'ar', 'ja']) {
    const route = locale === 'en' ? '' : `${locale}/`;
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto(`http://127.0.0.1:${port}/${route}currency-converter/`, { waitUntil: 'domcontentloaded' });
    await page.locator('#currency-form button[type="submit"]').click();
    await page.locator('#currency-results:not([hidden])').waitFor();
    const numeric = await page.evaluate(() => ({
      actual: document.querySelector('[data-result="amount"]')?.textContent,
      expected: new Intl.NumberFormat(document.documentElement.lang, {
        style: 'currency', currency: 'RSD', currencyDisplay: 'code', maximumFractionDigits: 4
      }).format(11700),
      rate: document.querySelector('[data-result="rate"]')?.textContent
    }));
    if (numeric.actual !== numeric.expected || !numeric.rate?.includes('117')) {
      throw new Error(`${locale} numeric regression: ${JSON.stringify(numeric)}`);
    }
  }
} finally {
  await browser.close();
  server.close();
}

if (errors.length) throw new Error(`Browser runtime errors: ${[...new Set(errors)].join(' | ')}`);
const report = {
  generatedAt: new Date().toISOString(),
  status: 'PASS',
  allLocaleSmoke: { locales: inventory.locales.length, pages: inventory.locales.length * tools.length, width: 390 },
  representativeLayout: { combinations: checks.length, locales: Object.keys(routes), tools: tools.length, widths },
  numericRegression: { locales: ['en', 'de', 'ru', 'ar', 'ja'], expectedConversion: '100 EUR = 11700 RSD' }
};
await fs.mkdir(path.join(root, 'artifacts'), { recursive: true });
await fs.writeFile(path.join(root, 'artifacts', 'tool-localization-browser-qa.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`Browser QA PASS: ${inventory.locales.length * tools.length} all-locale smoke pages, ${checks.length} representative layout combinations, 5 numeric locales.`);
