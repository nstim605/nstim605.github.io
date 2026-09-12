import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.NODE_PATH ?? '', 'playwright'));
const root = path.resolve(import.meta.dirname, '..');
const manifest = JSON.parse(await fs.readFile(path.join(root, 'tools', 'reviewed-tool-locales.json'), 'utf8'));
const requestedLocale = process.argv[process.argv.indexOf('--locale') + 1];
const entry = manifest.locales.find(item => item.locale === requestedLocale);
if (!requestedLocale || !entry) throw new Error('Use --locale with an entry from tools/reviewed-tool-locales.json');
const widthsArgument = process.argv.includes('--widths') ? process.argv[process.argv.indexOf('--widths') + 1] : '';
const widths = widthsArgument ? widthsArgument.split(',').map(Number) : entry.widths;
if (!widths.length || widths.some(width => !Number.isInteger(width) || width < 280)) throw new Error('Invalid --widths value');

const tools = [
  'currency-converter', 'exchange-rate-markup-calculator', 'multi-currency-converter',
  'offline-currency-converter', 'exchange-rate-history', 'currency-converter-widget',
  'foreign-transaction-fee-calculator', 'travel-budget-calculator'
];
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.xml': 'application/xml'
};
const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    const relative = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
    const file = path.resolve(root, `.${relative}`);
    if (!file.startsWith(root)) throw new Error('Invalid path');
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream' });
    response.end(await fs.readFile(file));
  } catch {
    response.writeHead(404); response.end('Not found');
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const base = `http://127.0.0.1:${port}/${entry.route}/`;

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.BROWSER_EXECUTABLE || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
});
const context = await browser.newContext();
await context.route('https://api.frankfurter.dev/v2/rates**', route => {
  const requestUrl = new URL(route.request().url());
  const historical = requestUrl.searchParams.has('from') || requestUrl.searchParams.has('to') || requestUrl.searchParams.has('date');
  const body = historical ? [
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
const interactions = [];
const formatting = [];
try {
  for (const tool of tools) {
    for (const width of widths) {
      await page.setViewportSize({ width, height: 1100 });
      const response = await page.goto(`${base}${tool}/`, { waitUntil: 'networkidle' });
      const result = await page.evaluate(() => {
        const h1 = document.querySelector('h1')?.getBoundingClientRect();
        const badge = document.querySelector('.play-link img');
        return {
          lang: document.documentElement.lang, dir: document.documentElement.dir || 'ltr',
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          h1Visible: Boolean(h1 && h1.width > 0 && h1.left >= -1 && h1.right <= innerWidth + 1),
          clippedControls: [...document.querySelectorAll('button, select, a.primary-button, a.secondary-button')]
            .filter(element => element.scrollWidth > element.clientWidth + 2).length,
          badgeLoaded: Boolean(badge?.complete && badge.naturalWidth > 0),
          badgeSource: badge?.getAttribute('src'), badgeLabel: badge?.closest('a')?.getAttribute('aria-label'),
          playHref: badge?.closest('a')?.href
        };
      });
      if (!response?.ok() || result.lang !== entry.locale || result.dir !== entry.dir || result.overflow > 1 ||
          !result.h1Visible || result.clippedControls || !result.badgeLoaded ||
          result.badgeSource !== '/assets/google-play-badge-en.png' || !result.badgeLabel ||
          result.playHref !== 'https://play.google.com/store/apps/details?id=io.github.nstim605.balkanconverter') {
        throw new Error(`${entry.locale}/${tool} @ ${width}: ${JSON.stringify(result)}`);
      }
      layoutChecks.push({ tool, width, status: 'PASS' });
    }
  }

  for (const width of widths) {
    await page.setViewportSize({ width, height: 1100 });
    await page.goto(base, { waitUntil: 'networkidle' });
    const navigation = await page.evaluate(route => {
      const cards = [...document.querySelectorAll('.tool-promo-actions > a')];
      const arrowVisible = card => {
        const arrow = card?.querySelector('[aria-hidden="true"]');
        return Boolean(arrow && getComputedStyle(arrow).display !== 'none');
      };
      return {
        count: cards.length, localeLinks: cards.every(card => new URL(card.href).pathname.startsWith(`/${route}/`)),
        lastArrowVisible: arrowVisible(cards.at(-1)), intermediateArrowsVisible: cards.slice(0, -1).every(arrowVisible)
      };
    }, entry.route);
    if (navigation.count !== 7 || !navigation.localeLinks || navigation.lastArrowVisible || !navigation.intermediateArrowsVisible) {
      throw new Error(`${entry.locale} navigation @ ${width}: ${JSON.stringify(navigation)}`);
    }
  }

  await page.setViewportSize({ width: 390, height: 1100 });
  await page.goto(`${base}currency-converter/`, { waitUntil: 'networkidle' });
  const { decimalInput, expectedAmount, expectedDate } = await page.evaluate(() => ({
    decimalInput: new Intl.NumberFormat(document.documentElement.lang, { maximumFractionDigits: 1 }).format(1.5),
    expectedAmount: new Intl.NumberFormat(document.documentElement.lang, {
      style: 'currency', currency: 'RSD', currencyDisplay: 'code', maximumFractionDigits: 4
    }).format(175.5),
    expectedDate: new Intl.DateTimeFormat(document.documentElement.lang, {
      year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC'
    }).format(new Date('2026-09-08T00:00:00Z'))
  }));
  const reject = page.locator('.analytics-consent-reject');
  if (await reject.isVisible()) await reject.click();
  await page.locator('#currency-amount').fill(decimalInput);
  await page.locator('#currency-form button[type="submit"]').click();
  await page.locator('#currency-results:not([hidden])').waitFor();
  const converted = await page.locator('[data-result="amount"]').textContent();
  const rateDate = await page.locator('.result-date').textContent();
  if (converted !== expectedAmount || !rateDate?.includes(expectedDate)) {
    throw new Error(`${entry.locale} number/date formatting: ${converted} / ${rateDate}; expected ${expectedAmount} / ${expectedDate}`);
  }
  formatting.push(`${decimalInput} EUR → ${expectedAmount}`, expectedDate);
  interactions.push('currency');

  await page.goto(`${base}exchange-rate-markup-calculator/`, { waitUntil: 'networkidle' });
  await page.locator('#source-amount').fill('100');
  await page.locator('#offered-amount').fill('11115');
  await page.locator('#markup-form button[type="submit"]').click();
  await page.locator('#calculator-results:not([hidden])').waitFor();
  const positive = {
    percentage: await page.locator('[data-result="percentage"]').textContent(),
    label: await page.locator('[data-label="difference"]').textContent()
  };
  await page.locator('#offered-amount').fill('12285');
  await page.locator('#markup-form button[type="submit"]').click();
  const negative = {
    percentage: await page.locator('[data-result="percentage"]').textContent(),
    label: await page.locator('[data-label="difference"]').textContent()
  };
  const localizedFive = await page.evaluate(() => new Intl.NumberFormat(document.documentElement.lang).format(5));
  if (!positive.percentage?.includes(localizedFive) || !negative.percentage?.includes(localizedFive) || !positive.label ||
      !negative.label || positive.label === negative.label) {
    throw new Error(`${entry.locale} deviation branches: ${JSON.stringify(positive)} / ${JSON.stringify(negative)}`);
  }
  interactions.push('deviation +5%', 'deviation -5% core / higher-offer UI branch');

  await page.goto(`${base}multi-currency-converter/`, { waitUntil: 'networkidle' });
  await page.locator('#multi-form button[type="submit"]').click();
  await page.locator('#multi-results:not([hidden])').waitFor();
  interactions.push('multi-currency');

  await page.goto(`${base}exchange-rate-history/`, { waitUntil: 'networkidle' });
  for (const period of ['30', '90', '365']) {
    await page.locator(`input[name="period"][value="${period}"]`).check({ force: true });
    await page.locator('#history-form button[type="submit"]').click();
    await page.locator('#history-results:not([hidden])').waitFor();
  }
  await page.locator('#history-date').fill('2026-09-07');
  await page.locator('#history-date-form button[type="submit"]').click();
  await page.locator('#history-date-results:not([hidden])').waitFor();
  interactions.push('history 30/90/365 + dated lookup');

  await page.goto(`${base}foreign-transaction-fee-calculator/`, { waitUntil: 'networkidle' });
  await page.locator('#foreign-fee-percent').fill(decimalInput);
  await page.locator('#fixed-fee').fill(decimalInput);
  await page.locator('#dcc-amount').fill('90');
  await page.locator('#foreign-fee-form button[type="submit"]').click();
  await page.locator('#foreign-fee-results:not([hidden])').waitFor();
  interactions.push('foreign-fee/DCC');

  await page.goto(`${base}travel-budget-calculator/`, { waitUntil: 'networkidle' });
  await page.locator('#travel-days').fill('3');
  await page.locator('#fixed-costs').fill('1000');
  await page.locator('#buffer-percent').fill(decimalInput);
  await page.locator('#travel-budget-form button[type="submit"]').click();
  await page.locator('#travel-budget-results:not([hidden])').waitFor();
  interactions.push('travel-budget');

  const failureContext = await browser.newContext();
  await failureContext.route('https://api.frankfurter.dev/v2/rates**', route => route.abort('failed'));
  const failurePage = await failureContext.newPage();
  await failurePage.goto(`${base}currency-converter/`, { waitUntil: 'domcontentloaded' });
  await failurePage.locator('#currency-form button[type="submit"]').click();
  await failurePage.waitForFunction(() => document.querySelector('#currency-status')?.dataset.type === 'error');
  const failureText = (await failurePage.locator('#currency-status').textContent())?.trim();
  if (!failureText || (entry.locale !== 'en' && failureText === 'Rates could not be loaded. Check your connection and try again.')) {
    throw new Error(`${entry.locale} network failure is not localized: ${failureText}`);
  }
  await failureContext.close();
} finally {
  await browser.close(); server.close();
}

if (runtimeErrors.length) throw new Error(`Runtime errors: ${[...new Set(runtimeErrors)].join(' | ')}`);
const report = {
  generatedAt: new Date().toISOString(), locale: entry.locale, language: entry.language, status: 'PASS',
  layouts: { pages: tools.length, widths, checks: layoutChecks.length },
  navigation: { localeLinks: 'PASS', lastArrowHidden: 'PASS', intermediateArrowsVisible: 'PASS' },
  interactions, formatting, networkFailure: 'PASS', runtimeErrors: 0
};
const artifactDir = path.join(root, 'artifacts', 'language-qa', entry.route);
await fs.mkdir(artifactDir, { recursive: true });
await fs.writeFile(path.join(artifactDir, 'browser-qa.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`${entry.language} browser QA PASS: ${layoutChecks.length} responsive checks, calculations, history, formatting and failure state.`);
