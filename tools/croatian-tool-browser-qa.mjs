import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.NODE_PATH ?? '', 'playwright'));
const root = path.resolve(import.meta.dirname, '..');
const artifactDir = path.join(root, 'artifacts', 'croatian-localization-review');
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
const interactionChecks = [];
try {
  for (const tool of tools) {
    for (const width of widths) {
      await page.setViewportSize({ width, height: 1000 });
      const response = await page.goto(`http://127.0.0.1:${port}/hr/${tool}/`, { waitUntil: 'networkidle' });
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
      if (!response?.ok() || result.lang !== 'hr' || result.horizontalOverflow > 1 || !result.h1Visible || !result.badgeLoaded ||
          result.badgeSource !== '/assets/google-play-badge-en.png' ||
          result.playHref !== 'https://play.google.com/store/apps/details?id=io.github.nstim605.balkanconverter') {
        throw new Error(`${tool} @ ${width}: ${JSON.stringify(result)}`);
      }
      layoutChecks.push({ tool, width, status: 'PASS' });
    }
  }

  for (const width of widths) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`http://127.0.0.1:${port}/hr/`, { waitUntil: 'networkidle' });
    const navigation = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('.tool-promo-actions > a')];
      const lastArrow = cards.at(-1)?.querySelector('[aria-hidden="true"]');
      return {
        count: cards.length,
        localizedLinks: cards.every(card => new URL(card.href).pathname.startsWith('/hr/')),
        lastLabel: cards.at(-1)?.textContent.replace('→', '').trim(),
        lastArrowVisible: Boolean(lastArrow && getComputedStyle(lastArrow).display !== 'none'),
        intermediateArrowsVisible: cards.slice(0, -1).every(card => getComputedStyle(card.querySelector('[aria-hidden="true"]')).display !== 'none')
      };
    });
    if (navigation.count !== 7 || !navigation.localizedLinks || navigation.lastLabel !== 'Kalkulator proračuna putovanja' ||
        navigation.lastArrowVisible || !navigation.intermediateArrowsVisible) {
      throw new Error(`Croatian tool navigation @ ${width}: ${JSON.stringify(navigation)}`);
    }
  }

  await page.setViewportSize({ width: 390, height: 1000 });
  await page.goto(`http://127.0.0.1:${port}/hr/currency-converter/`, { waitUntil: 'networkidle' });
  const rejectConsent = page.locator('.analytics-consent-reject');
  if (await rejectConsent.isVisible()) await rejectConsent.click();
  await page.locator('#currency-form button[type="submit"]').click();
  await page.locator('#currency-results:not([hidden])').waitFor();
  if (!await page.locator('.result-date').textContent().then(text => text.includes('Referentni tečajevi'))) {
    throw new Error('Currency result date was not localized');
  }
  interactionChecks.push('currency');

  await page.goto(`http://127.0.0.1:${port}/hr/exchange-rate-markup-calculator/`, { waitUntil: 'networkidle' });
  await page.locator('#source-amount').fill('100');
  await page.locator('#offered-amount').fill('11 115');
  await page.locator('#markup-form button[type="submit"]').click();
  await page.locator('#calculator-results:not([hidden])').waitFor();
  const positive = await page.evaluate(() => ({
    source: document.querySelector('#source-currency option:checked')?.textContent,
    target: document.querySelector('#target-currency option:checked')?.textContent,
    label: document.querySelector('[data-label="difference"]')?.textContent,
    percentage: document.querySelector('[data-result="percentage"]')?.textContent
  }));
  if (!/^EUR — [Ee]uro$/.test(positive.source ?? '') || !/^RSD — [Ss]rpski dinar$/.test(positive.target ?? '') ||
      positive.label !== 'Dobivate manje za' || !positive.percentage?.includes('5')) {
    throw new Error(`Positive markup interaction: ${JSON.stringify(positive)}`);
  }
  await page.locator('#offered-amount').fill('12 285');
  await page.locator('#markup-form button[type="submit"]').click();
  const negative = await page.evaluate(() => ({
    label: document.querySelector('[data-label="difference"]')?.textContent,
    percentage: document.querySelector('[data-result="percentage"]')?.textContent
  }));
  if (negative.label !== 'Dobivate više za' || !negative.percentage?.includes('5')) {
    throw new Error(`Negative markup interaction: ${JSON.stringify(negative)}`);
  }
  interactionChecks.push('markup +5%', 'markup -5% core / higher-offer UI branch');

  await page.goto(`http://127.0.0.1:${port}/hr/multi-currency-converter/`, { waitUntil: 'networkidle' });
  await page.locator('#multi-form button[type="submit"]').click();
  await page.locator('#multi-results:not([hidden])').waitFor();
  interactionChecks.push('multi-currency');

  await page.goto(`http://127.0.0.1:${port}/hr/exchange-rate-history/`, { waitUntil: 'networkidle' });
  for (const period of ['30', '90', '365']) {
    await page.locator(`input[name="period"][value="${period}"]`).check({ force: true });
    await page.locator('#history-form button[type="submit"]').click();
    await page.locator('#history-results:not([hidden])').waitFor();
  }
  interactionChecks.push('history 30/90/365');

  await page.goto(`http://127.0.0.1:${port}/hr/foreign-transaction-fee-calculator/`, { waitUntil: 'networkidle' });
  await page.locator('#foreign-fee-percent').fill('3');
  await page.locator('#fixed-fee').fill('2,5');
  await page.locator('#dcc-amount').fill('90');
  await page.locator('#foreign-fee-form button[type="submit"]').click();
  await page.locator('#foreign-fee-results:not([hidden])').waitFor();
  interactionChecks.push('foreign-fee/DCC');

  await page.goto(`http://127.0.0.1:${port}/hr/travel-budget-calculator/`, { waitUntil: 'networkidle' });
  await page.locator('#travel-days').fill('3');
  await page.locator('#fixed-costs').fill('1 000');
  await page.locator('#buffer-percent').fill('11,5');
  await page.locator('#travel-budget-form button[type="submit"]').click();
  await page.locator('#travel-budget-results:not([hidden])').waitFor();
  interactionChecks.push('travel-budget');

  const failureContext = await browser.newContext();
  await failureContext.route('https://api.frankfurter.dev/v2/rates**', route => route.abort('failed'));
  const failurePage = await failureContext.newPage();
  await failurePage.goto(`http://127.0.0.1:${port}/hr/currency-converter/`, { waitUntil: 'domcontentloaded' });
  await failurePage.locator('#currency-form button[type="submit"]').click();
  await failurePage.waitForFunction(() => document.querySelector('#currency-status')?.dataset.type === 'error');
  const failureText = await failurePage.locator('#currency-status').textContent();
  if (failureText !== 'Tečajeve nije moguće učitati. Provjerite internetsku vezu i pokušajte ponovno.') {
    throw new Error(`Network failure message: ${failureText}`);
  }
  await failureContext.close();
} finally {
  await browser.close();
  server.close();
}

if (runtimeErrors.length) throw new Error(`Runtime errors: ${[...new Set(runtimeErrors)].join(' | ')}`);
const report = {
  generatedAt: new Date().toISOString(), status: 'PASS',
  layouts: { pages: tools.length, widths, checks: layoutChecks.length },
  navigation: { widths, localeLinks: 'PASS', lastArrowHidden: 'PASS', intermediateArrowsVisible: 'PASS' },
  interactions: interactionChecks,
  localizedInput: ['11 115', '12 285', '2,5', '1 000', '11,5'],
  networkFailure: 'PASS', runtimeErrors: 0
};
await fs.writeFile(path.join(artifactDir, 'browser-qa.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`Croatian browser QA PASS: ${layoutChecks.length} responsive checks, ${interactionChecks.length} interaction checks, navigation, network failure.`);
