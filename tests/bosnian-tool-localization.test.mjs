import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const reviewed = JSON.parse(await fs.readFile(path.join(root, 'tools/tool-copy-reviewed-bs.json'), 'utf8'));
const catalog = JSON.parse(await fs.readFile(path.join(root, 'tools/tool-copy.json'), 'utf8')).locales.bs;
const rich = JSON.parse(await fs.readFile(path.join(root, 'tools/tool-rich-copy.json'), 'utf8'));
const slugs = [
  'currency-converter', 'exchange-rate-markup-calculator', 'multi-currency-converter',
  'offline-currency-converter', 'exchange-rate-history', 'currency-converter-widget',
  'foreign-transaction-fee-calculator', 'travel-budget-calculator'
];
const identity = {
  'currency-converter': ['Konverter valuta | Konverzija prema aktuelnim kursevima', 'Konverter valuta'],
  'exchange-rate-markup-calculator': ['Kalkulator razlike kursa | Balkan Currency Converter', 'Kalkulator razlike kursa'],
  'multi-currency-converter': ['Viševalutni konverter | Jedan iznos u više valuta', 'Viševalutni konverter'],
  'offline-currency-converter': ['Konverter valuta bez interneta | Kako rade sačuvani kursevi', 'Konverter valuta bez interneta: kako rade sačuvani kursevi'],
  'exchange-rate-history': ['Historija kursa i valutni grafikon | Balkan Converter', 'Historija kursa i valutni grafikon'],
  'currency-converter-widget': ['Widget konvertera valuta za Android | Balkan Converter', 'Widget konvertera valuta za Android'],
  'foreign-transaction-fee-calculator': ['Kalkulator naknada i DCC-a | Balkan Converter', 'Kalkulator naknada i DCC-a'],
  'travel-budget-calculator': ['Kalkulator budžeta putovanja u dvije valute | Balkan Converter', 'Kalkulator budžeta putovanja']
};

function visibleMain(html) {
  return (html.match(/<main\b[\s\S]*?<\/main>/)?.[0] ?? '').replace(/<script\b[\s\S]*?<\/script>/g, ' ')
    .replace(/<[^>]+>/g, ' ').replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'")
    .replace(/\s+/g, ' ').trim();
}

test('Bosnian reviewed catalog covers every source message used by the eight tools', async () => {
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

test('Bosnian reviewed messages preserve every placeholder', () => {
  const placeholders = value => [...value.matchAll(/\{[A-Za-z][A-Za-z0-9]*\}/g)].map(match => match[0]).sort();
  for (const [source, translation] of Object.entries(reviewed)) {
    assert.ok(translation.trim(), `empty reviewed translation: ${source}`);
    assert.deepEqual(placeholders(translation), placeholders(source), `placeholder mismatch: ${source}`);
  }
});

test('all Bosnian tools use reviewed terminology and preserve behavior-facing copy', async () => {
  const pages = Object.fromEntries(await Promise.all(slugs.map(async slug => [slug, await fs.readFile(path.join(root, 'bs', slug, 'index.html'), 'utf8')])));
  const combined = Object.values(pages).map(visibleMain).join('\n');
  for (const broken of [
    'referentna stopa', 'referentne stope', 'referentna brzina', 'tečaj', 'povijest',
    '\\bistorija\\b', 'vanmrež', 'izvanmrež', 'međuspremnik', 'bafer', 'Dynamic Currency Conversion',
    'Kalkulator marže', 'Markup Calculator', 'Multi-Currency Converter'
  ]) assert.doesNotMatch(combined, new RegExp(broken, 'iu'), broken);
  assert.equal(reviewed.Rate, 'Kurs');

  for (const html of Object.values(pages)) {
    assert.match(html, /<html lang="bs">/);
    assert.doesNotMatch(html, /<option value="([A-Z]{3})">(?!\1<)[A-Z]{3}<\/option>/u);
    assert.match(html, /src="\/assets\/google-play-badge-en\.png"/);
    assert.match(html, /https:\/\/play\.google\.com\/store\/apps\/details\?id=io\.github\.nstim605\.balkanconverter/);
  }
  for (const [slug, [title, h1]] of Object.entries(identity)) {
    assert.ok(pages[slug].includes(`<title>${title}</title>`), `${slug} title`);
    assert.match(pages[slug], new RegExp(`<h1[^>]*>${h1.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</h1>`));
  }
  assert.match(pages['exchange-rate-markup-calculator'], /Razlika, % = \(referentni rezultat − ponuđeni rezultat\) ÷ referentni rezultat × 100\./);
  assert.match(pages['exchange-rate-markup-calculator'], /placeholder="Na primjer, 11 500"/);
  assert.match(pages['multi-currency-converter'], /Viševalutni prikaz je koristan/);
  assert.match(pages['offline-currency-converter'], /jednu zajedničku lokalnu predmemoriju kurseva/);
  assert.match(pages['currency-converter-widget'], /nije zaseban izvor tržišnih podataka uživo/);
  assert.match(pages['foreign-transaction-fee-calculator'], /Dinamička konverzija valuta \(DCC\)/i);
  assert.match(pages['travel-budget-calculator'], /neobaveznu rezervu/);
});

test('Bosnian rich messages are complete sentences with locale-specific tool links', async () => {
  const found = new Set();
  for (const slug of slugs) {
    const html = await fs.readFile(path.join(root, 'bs', slug, 'index.html'), 'utf8');
    for (const match of html.matchAll(/<p[^>]*data-i18n-rich="([^"]+)"[^>]*>([\s\S]*?)<\/p>/g)) {
      found.add(match[1]);
      assert.doesNotMatch(match[2], /(?:Explore|Use the|For one quick pair|learn how)/i);
      for (const href of [...match[2].matchAll(/href="([^"]+)"/g)].map(item => item[1])) assert.match(href, /^\/bs\//);
    }
  }
  assert.deepEqual(found, new Set(Object.keys(rich.bs)));
});
