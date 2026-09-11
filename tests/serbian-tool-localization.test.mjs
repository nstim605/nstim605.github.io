import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const reviewed = JSON.parse(await fs.readFile(path.join(root, 'tools/tool-copy-reviewed-sr.json'), 'utf8'));
const catalog = JSON.parse(await fs.readFile(path.join(root, 'tools/tool-copy.json'), 'utf8')).locales.sr;
const rich = JSON.parse(await fs.readFile(path.join(root, 'tools/tool-rich-copy.json'), 'utf8'));
const toolSlugs = [
  'currency-converter', 'exchange-rate-markup-calculator', 'multi-currency-converter',
  'offline-currency-converter', 'exchange-rate-history', 'currency-converter-widget',
  'foreign-transaction-fee-calculator', 'travel-budget-calculator'
];
const playHref = 'https://play.google.com/store/apps/details?id=io.github.nstim605.balkanconverter';
const expectedPageIdentity = {
  'currency-converter': ['Конвертор валута | Прерачунавање по актуелном курсу', 'Конвертор валута'],
  'exchange-rate-markup-calculator': ['Поређење понуде са референтним курсом | Balkan Currency Converter', 'Калкулатор разлике курса'],
  'multi-currency-converter': ['Мултивалутни конвертор | Један износ у више валута', 'Мултивалутни конвертор'],
  'offline-currency-converter': ['Офлајн конвертор валута | Како раде сачувани курсеви', 'Офлајн конвертор валута: како раде сачувани курсеви'],
  'exchange-rate-history': ['Историја и графикон курса | Balkan Converter', 'Историја и графикон курса'],
  'currency-converter-widget': ['Виџет конвертора валута за Android | Balkan Converter', 'Виџет конвертора валута за Android'],
  'foreign-transaction-fee-calculator': ['Калкулатор провизија и DCC | Balkan Converter', 'Калкулатор провизија и DCC'],
  'travel-budget-calculator': ['Калкулатор буџета путовања у две валуте | Balkan Converter', 'Калкулатор буџета путовања']
};

function visibleMain(html) {
  return (html.match(/<main\b[\s\S]*?<\/main>/)?.[0] ?? '')
    .replace(/<script\b[\s\S]*?<\/script>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replace(/\s+/g, ' ')
    .trim();
}

test('Serbian reviewed catalog covers every source message used by the eight tools', async () => {
  const missing = new Set();
  for (const slug of toolSlugs) {
    const directory = path.join(root, slug);
    const files = (await fs.readdir(directory)).filter(file => /\.(?:html|js|mjs)$/.test(file));
    const source = (await Promise.all(files.map(file => fs.readFile(path.join(directory, file), 'utf8')))).join('\n')
      .replace(/<p[^>]*\bdata-i18n-rich="[^"]+"[^>]*>[\s\S]*?<\/p>/g, '');
    for (const key of Object.keys(catalog)) {
      const used = source.includes(key) || source.includes(key.replaceAll('&', '&amp;')) || source.includes(key.replaceAll("'", "\\'"));
      if (used && !(key in reviewed)) missing.add(key);
    }
  }
  assert.deepEqual([...missing].sort(), []);
});

test('Serbian reviewed messages preserve placeholders', () => {
  const placeholders = value => [...value.matchAll(/\{[A-Za-z][A-Za-z0-9]*\}/g)].map(match => match[0]).sort();
  for (const [source, translation] of Object.entries(reviewed)) {
    assert.ok(translation.trim(), `empty reviewed translation: ${source}`);
    assert.deepEqual(placeholders(translation), placeholders(source), `placeholder mismatch: ${source}`);
  }
});

test('all Serbian tools use reviewed terminology and preserve ISO currency codes', async () => {
  const pages = Object.fromEntries(await Promise.all(toolSlugs.map(async slug => [
    slug, await fs.readFile(path.join(root, 'sr', slug, 'index.html'), 'utf8')
  ])));
  const combined = Object.values(pages).map(visibleMain).join('\n');
  for (const broken of [
    'референтна стопа', 'референтне стопе', 'референтна брзина', 'кеширане брзине',
    'Маркуп', 'маркап', 'цалцулатор', 'претварач', 'Травел Боард', 'Стварна цена',
    'Видгетс', 'бафер', 'пуфер', 'повлачења', 'домаћа валута', 'производни виџет',
    'ЕУР —', 'РСД —', 'Оффлине', 'Цурренци', 'Мулти-цурренци'
  ]) assert.doesNotMatch(combined, new RegExp(broken, 'iu'), broken);

  for (const html of Object.values(pages)) {
    assert.match(html, /<html lang="sr">/);
    assert.doesNotMatch(html, /<option value="([A-Z]{3})">(?!\1<)[А-Я]{3}<\/option>/u);
    assert.match(html, /src="\/assets\/google-play-badge-en\.png"/);
    assert.match(html, new RegExp(playHref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  for (const [slug, [title, h1]] of Object.entries(expectedPageIdentity)) {
    assert.match(pages[slug], new RegExp(`<title>${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</title>`));
    assert.match(pages[slug], new RegExp(`<h1[^>]*>${h1.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</h1>`));
  }

  assert.match(pages['exchange-rate-markup-calculator'], /Разлика, % = \(референтни резултат − понуђени износ\) ÷ референтни резултат × 100\./);
  assert.match(pages['exchange-rate-markup-calculator'], /placeholder="На пример, 11 500"/);
  assert.match(pages['exchange-rate-markup-calculator'], /Позитиван проценат значи/);
  assert.match(pages['multi-currency-converter'], /Један износ — више валута/);
  assert.match(pages['multi-currency-converter'], /Прерачунајте један износ одједном у више валута/);
  assert.match(pages['offline-currency-converter'], /један заједнички локални кеш курсева/);
  assert.match(pages['currency-converter-widget'], /није независан извор курсева уживо/);
  assert.match(pages['foreign-transaction-fee-calculator'], /Ова провизија додаје се само процени плаћања у локалној валути/);
  assert.match(pages['travel-budget-calculator'], /опционалну резерву/);
});

test('Serbian rich messages are complete sentences with locale-specific tool links', async () => {
  const expectedIds = new Set(Object.keys(rich.sr));
  const foundIds = new Set();
  for (const slug of toolSlugs) {
    const html = await fs.readFile(path.join(root, 'sr', slug, 'index.html'), 'utf8');
    for (const match of html.matchAll(/<p[^>]*data-i18n-rich="([^"]+)"[^>]*>([\s\S]*?)<\/p>/g)) {
      foundIds.add(match[1]);
      assert.doesNotMatch(match[2], /(?:Explore|Use the|For one quick pair|learn how)/i);
      for (const href of [...match[2].matchAll(/href="([^"]+)"/g)].map(item => item[1])) {
        assert.match(href, /^\/sr\/(?:currency-converter|exchange-rate-markup-calculator|multi-currency-converter|offline-currency-converter|exchange-rate-history|currency-converter-widget|foreign-transaction-fee-calculator|travel-budget-calculator)\/$/);
      }
    }
  }
  assert.deepEqual(foundIds, expectedIds);
});
