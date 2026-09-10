import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.NODE_PATH ?? '', 'playwright'));
const root = path.resolve(import.meta.dirname, '..');
const artifactDir = path.join(root, 'artifacts', 'russian-localization-review');
const tools = [
  'currency-converter', 'exchange-rate-markup-calculator', 'multi-currency-converter',
  'offline-currency-converter', 'exchange-rate-history', 'currency-converter-widget',
  'foreign-transaction-fee-calculator', 'travel-budget-calculator'
];
const widths = [320, 390, 1440];
const contentTypes = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.xml': 'application/xml'
};

await fs.mkdir(artifactDir, { recursive: true });
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
const context = await browser.newContext();
await context.route('https://api.frankfurter.dev/v2/rates**', route => {
  const requestUrl = new URL(route.request().url());
  const historyRequest = requestUrl.searchParams.has('from') || requestUrl.searchParams.has('to') || requestUrl.searchParams.has('date');
  const body = historyRequest ? [
    { date: '2026-09-06', base: 'EUR', quote: 'RSD', rate: 116 },
    { date: '2026-09-07', base: 'EUR', quote: 'RSD', rate: 116.5 },
    { date: '2026-09-08', base: 'EUR', quote: 'RSD', rate: 117 }
  ] : [
    { date: '2026-09-08', base: 'EUR', quote: 'RSD', rate: 117 },
    { date: '2026-09-08', base: 'EUR', quote: 'USD', rate: 1.2 },
    { date: '2026-09-08', base: 'EUR', quote: 'GBP', rate: 0.85 },
    { date: '2026-09-08', base: 'EUR', quote: 'JPY', rate: 180 }
  ];
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
});
const page = await context.newPage();
const runtimeErrors = [];
page.on('pageerror', error => runtimeErrors.push(error.message));
page.on('console', message => { if (message.type() === 'error') runtimeErrors.push(message.text()); });

const layoutChecks = [];
try {
  for (const tool of tools) {
    for (const width of widths) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`http://127.0.0.1:${port}/ru/${tool}/`, { waitUntil: 'networkidle' });
      const result = await page.evaluate(() => {
        const h1 = document.querySelector('h1')?.getBoundingClientRect();
        const badge = document.querySelector('.play-link img');
        return {
          lang: document.documentElement.lang,
          horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          h1Visible: Boolean(h1 && h1.width > 0 && h1.left >= -1 && h1.right <= innerWidth + 1),
          badgeLoaded: Boolean(badge && badge.complete && badge.naturalWidth > 0),
          badgeSource: badge?.getAttribute('src'),
          playHref: badge?.closest('a')?.href
        };
      });
      if (result.lang !== 'ru' || result.horizontalOverflow > 1 || !result.h1Visible || !result.badgeLoaded ||
          result.badgeSource !== '/assets/google-play-badge-en.png' ||
          result.playHref !== 'https://play.google.com/store/apps/details?id=io.github.nstim605.balkanconverter') {
        throw new Error(`${tool} @ ${width}: ${JSON.stringify(result)}`);
      }
      layoutChecks.push({ tool, width, status: 'PASS' });
    }
  }

  await page.setViewportSize({ width: 390, height: 1000 });
  await page.goto(`http://127.0.0.1:${port}/ru/currency-converter/`, { waitUntil: 'networkidle' });
  await page.locator('#currency-form button[type="submit"]').click();
  await page.locator('#currency-results:not([hidden])').waitFor();
  if (!await page.locator('.result-date').textContent().then(text => text.includes('Справочные курсы'))) throw new Error('Currency result date was not localized');

  await page.goto(`http://127.0.0.1:${port}/ru/exchange-rate-markup-calculator/`, { waitUntil: 'networkidle' });
  await page.locator('#source-amount').fill('100');
  await page.locator('#offered-amount').fill('11 115');
  await page.locator('#markup-form button[type="submit"]').click();
  await page.locator('#calculator-results:not([hidden])').waitFor();
  const markupState = await page.evaluate(() => ({
    sourceOption: document.querySelector('#source-currency option:checked')?.textContent,
    targetOption: document.querySelector('#target-currency option:checked')?.textContent,
    label: document.querySelector('[data-label="difference"]')?.textContent,
    percentage: document.querySelector('[data-result="percentage"]')?.textContent
  }));
  if (!/^EUR — Евро$/.test(markupState.sourceOption ?? '') || !/^RSD — Сербский динар$/.test(markupState.targetOption ?? '') ||
      markupState.label !== 'Вы получите меньше на' || !markupState.percentage?.includes('5')) {
    throw new Error(`Markup interaction: ${JSON.stringify(markupState)}`);
  }

  await page.goto(`http://127.0.0.1:${port}/ru/multi-currency-converter/`, { waitUntil: 'networkidle' });
  await page.locator('#multi-form button[type="submit"]').click();
  await page.locator('#multi-results:not([hidden])').waitFor();

  await page.goto(`http://127.0.0.1:${port}/ru/exchange-rate-history/`, { waitUntil: 'networkidle' });
  await page.locator('#history-form button[type="submit"]').click();
  await page.locator('#history-results:not([hidden])').waitFor();

  await page.goto(`http://127.0.0.1:${port}/ru/foreign-transaction-fee-calculator/`, { waitUntil: 'networkidle' });
  await page.locator('#foreign-fee-percent').fill('3');
  await page.locator('#fixed-fee').fill('2,5');
  await page.locator('#dcc-amount').fill('90');
  await page.locator('#foreign-fee-form button[type="submit"]').click();
  await page.locator('#foreign-fee-results:not([hidden])').waitFor();

  await page.goto(`http://127.0.0.1:${port}/ru/travel-budget-calculator/`, { waitUntil: 'networkidle' });
  await page.locator('#travel-days').fill('3');
  await page.locator('#fixed-costs').fill('1 000');
  await page.locator('#buffer-percent').fill('11,5');
  await page.locator('#travel-budget-form button[type="submit"]').click();
  await page.locator('#travel-budget-results:not([hidden])').waitFor();

  const shots = [
    ['exchange-rate-markup-calculator', '.calculator-explanation', '01-markup-explanation-390.png'],
    ['offline-currency-converter', '#prepare-title', '02-offline-cache-390.png'],
    ['currency-converter-widget', '#widget-shows-title', '03-widget-behavior-390.png'],
    ['foreign-transaction-fee-calculator', '#foreign-fee-form', '04-foreign-fee-form-390.png'],
    ['travel-budget-calculator', '#travel-budget-form', '05-travel-budget-form-390.png']
  ];
  for (const [tool, selector, file] of shots) {
    await page.goto(`http://127.0.0.1:${port}/ru/${tool}/`, { waitUntil: 'networkidle' });
    const rejectConsent = page.locator('.analytics-consent-reject');
    if (await rejectConsent.isVisible()) await rejectConsent.click();
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      document.querySelectorAll('.skip-link').forEach(link => { link.style.display = 'none'; });
    });
    const locator = page.locator(selector).first();
    await locator.scrollIntoViewIfNeeded();
    const target = selector.startsWith('#') && !['#foreign-fee-form', '#travel-budget-form'].includes(selector)
      ? locator.locator('xpath=ancestor::article[1] | ancestor::section[1]').first()
      : locator;
    await target.screenshot({ path: path.join(artifactDir, file) });
  }

  const failureContext = await browser.newContext();
  await failureContext.route('https://api.frankfurter.dev/v2/rates**', route => route.abort('failed'));
  const failurePage = await failureContext.newPage();
  await failurePage.goto(`http://127.0.0.1:${port}/ru/currency-converter/`, { waitUntil: 'domcontentloaded' });
  await failurePage.locator('#currency-form button[type="submit"]').click();
  await failurePage.waitForFunction(() => document.querySelector('#currency-status')?.dataset.type === 'error');
  const failureText = await failurePage.locator('#currency-status').textContent();
  if (failureText !== 'Не удалось загрузить курсы. Проверьте подключение к интернету и повторите попытку.') {
    throw new Error(`Network failure message: ${failureText}`);
  }
  await failureContext.close();
} finally {
  await browser.close();
  server.close();
}

if (runtimeErrors.length) throw new Error(`Runtime errors: ${[...new Set(runtimeErrors)].join(' | ')}`);
const report = {
  generatedAt: new Date().toISOString(),
  status: 'PASS',
  layouts: { pages: tools.length, widths, checks: layoutChecks.length },
  interactions: ['currency', 'markup', 'multi-currency', 'history', 'foreign-fee/DCC', 'travel-budget'],
  localizedInput: ['11 115', '2,5', '1 000', '11,5'],
  networkFailure: 'PASS',
  screenshots: [
    '01-markup-explanation-390.png', '02-offline-cache-390.png', '03-widget-behavior-390.png',
    '04-foreign-fee-form-390.png', '05-travel-budget-form-390.png'
  ]
};
await fs.writeFile(path.join(artifactDir, 'browser-qa.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`Russian browser QA PASS: ${layoutChecks.length} responsive checks, 6 interactive tools, network failure, 5 screenshots.`);
