import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const reviewed = JSON.parse(await fs.readFile(path.join(root, 'tools/tool-copy-reviewed-uk.json'), 'utf8'));
const catalog = JSON.parse(await fs.readFile(path.join(root, 'tools/tool-copy.json'), 'utf8')).locales.uk;
const rich = JSON.parse(await fs.readFile(path.join(root, 'tools/tool-rich-copy.json'), 'utf8'));
const slugs = [
  'currency-converter', 'exchange-rate-markup-calculator', 'multi-currency-converter',
  'offline-currency-converter', 'exchange-rate-history', 'currency-converter-widget',
  'foreign-transaction-fee-calculator', 'travel-budget-calculator'
];
const identity = {
  'currency-converter': ['Конвертер валют | Конвертація за актуальними курсами онлайн', 'Конвертер валют'],
  'exchange-rate-markup-calculator': ['Калькулятор відхилення курсу | Balkan Currency Converter', 'Калькулятор відхилення курсу'],
  'multi-currency-converter': ['Мультивалютний конвертер | Одна сума в кількох валютах', 'Мультивалютний конвертер'],
  'offline-currency-converter': ['Конвертер валют без інтернету | Як працюють збережені курси', 'Конвертер валют без інтернету: як працюють збережені курси'],
  'exchange-rate-history': ['Історія курсу та валютний графік | Balkan Converter', 'Історія курсу та валютний графік'],
  'currency-converter-widget': ['Віджет конвертера валют для Android | Balkan Converter', 'Віджет конвертера валют для Android'],
  'foreign-transaction-fee-calculator': ['Калькулятор комісії за операцію в іноземній валюті та DCC | Balkan Converter', 'Калькулятор комісії за операцію в іноземній валюті та DCC'],
  'travel-budget-calculator': ['Калькулятор бюджету подорожі у двох валютах | Balkan Converter', 'Калькулятор бюджету подорожі']
};

function visibleMain(html) {
  return (html.match(/<main\b[\s\S]*?<\/main>/)?.[0] ?? '').replace(/<script\b[\s\S]*?<\/script>/g, ' ')
    .replace(/<[^>]+>/g, ' ').replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'")
    .replace(/\s+/g, ' ').trim();
}

test('Ukrainian reviewed catalog covers every source message used by the eight tools', async () => {
  const missing = new Set();
  for (const slug of slugs) {
    const dir = path.join(root, slug);
    const files = (await fs.readdir(dir)).filter(file => /\.(?:html|js|mjs)$/.test(file));
    const source = (await Promise.all(files.map(file => fs.readFile(path.join(dir, file), 'utf8')))).join('\n')
      .replace(/<p[^>]*\bdata-i18n-rich="[^"]+"[^>]*>[\s\S]*?<\/p>/g, '');
    for (const key of Object.keys(catalog)) {
      if ((source.includes(key) || source.includes(key.replaceAll('&', '&amp;')) || source.includes(key.replaceAll("'", "\\'"))) && !(key in reviewed)) missing.add(key);
    }
  }
  assert.deepEqual([...missing].sort(), []);
});

test('Ukrainian reviewed messages preserve placeholders and editorial spacing', () => {
  const placeholders = value => [...value.matchAll(/\{[A-Za-z][A-Za-z0-9]*\}/g)].map(match => match[0]).sort();
  for (const [source, translation] of Object.entries(reviewed)) {
    assert.ok(translation.trim(), `empty reviewed translation: ${source}`);
    assert.deepEqual(placeholders(translation), placeholders(source), `placeholder mismatch: ${source}`);
    assert.doesNotMatch(translation, /[.!?][А-ЯІЇЄҐ]/u, `missing sentence spacing: ${source}`);
    assert.doesNotMatch(translation, /\|Balkan/u, `missing title separator spacing: ${source}`);
  }
});

test('all Ukrainian tools use reviewed terminology and preserve behavior-facing copy', async () => {
  const pages = Object.fromEntries(await Promise.all(slugs.map(async slug => [slug, await fs.readFile(path.join(root, 'uk', slug, 'index.html'), 'utf8')])));
  const combined = Object.values(pages).map(visibleMain).join('\n');
  for (const broken of [
    'довідкова ставка', 'базова ставка', 'кешована ставка', 'офлайн-тариф', 'офлайн-тарифи',
    'Калькулятор розмітки', 'Ефективна розмітка', 'домашня валюта', 'аварійний буфер',
    'Dynamic Currency Conversion', 'For example', 'Optional', 'Calculate', 'Loading'
  ]) assert.doesNotMatch(combined, new RegExp(broken, 'iu'), broken);
  assert.equal(reviewed.Rate, 'Курс');
  assert.equal(reviewed['Reference rate'], 'Довідковий курс');

  for (const html of Object.values(pages)) {
    assert.match(html, /<html lang="uk">/);
    assert.doesNotMatch(html, /<option value="([A-Z]{3})">(?!\1<)[A-Z]{3}<\/option>/u);
    assert.match(html, /src="\/assets\/google-play-badge-en\.png"/);
    assert.match(html, /https:\/\/play\.google\.com\/store\/apps\/details\?id=io\.github\.nstim605\.balkanconverter/);
    assert.match(html, /aria-label="Завантажте Balkan Currency Converter із Google Play"/);
    for (const value of [
      html.match(/<meta name="description" content="([^"]+)">/)?.[1],
      html.match(/<meta property="og:title" content="([^"]+)">/)?.[1],
      html.match(/<meta property="og:description" content="([^"]+)">/)?.[1],
      html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1]
    ]) assert.match(value ?? '', /[А-Яа-яІіЇїЄєҐґ]/u, 'Ukrainian metadata or structured data');
  }
  for (const [slug, [title, h1]] of Object.entries(identity)) {
    assert.ok(pages[slug].includes(`<title>${title}</title>`), `${slug} title`);
    assert.match(pages[slug], new RegExp(`<h1[^>]*>${h1.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</h1>`));
  }
  assert.match(pages['exchange-rate-markup-calculator'], /Відхилення, % = \(результат за довідковим курсом − запропонований результат\) ÷ результат за довідковим курсом × 100\./);
  assert.match(pages['exchange-rate-markup-calculator'], /placeholder="Наприклад, 11 500"/);
  assert.match(pages['multi-currency-converter'], /Перегляд однієї суми в кількох валютах зручний/);
  assert.match(pages['offline-currency-converter'], /один спільний локальний кеш курсів/);
  assert.match(pages['currency-converter-widget'], /не окреме джерело даних у реальному часі/);
  assert.match(pages['foreign-transaction-fee-calculator'], /динамічна конвертація валюти \(DCC\)/i);
  assert.match(pages['travel-budget-calculator'], /резерв на непередбачені витрати/i);
});

test('Ukrainian rich messages are complete sentences with locale-specific tool links', async () => {
  const found = new Set();
  for (const slug of slugs) {
    const html = await fs.readFile(path.join(root, 'uk', slug, 'index.html'), 'utf8');
    for (const match of html.matchAll(/<p[^>]*data-i18n-rich="([^"]+)"[^>]*>([\s\S]*?)<\/p>/g)) {
      found.add(match[1]);
      assert.doesNotMatch(match[2], /(?:Explore|Use the|For one quick pair|learn how)/i);
      for (const href of [...match[2].matchAll(/href="([^"]+)"/g)].map(item => item[1])) assert.match(href, /^\/uk\//);
    }
  }
  assert.deepEqual(found, new Set(Object.keys(rich.uk)));
});
