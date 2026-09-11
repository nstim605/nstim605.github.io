import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const reviewed = JSON.parse(await fs.readFile(path.join(root, 'tools/tool-copy-reviewed-de.json'), 'utf8'));
const catalog = JSON.parse(await fs.readFile(path.join(root, 'tools/tool-copy.json'), 'utf8')).locales.de;
const rich = JSON.parse(await fs.readFile(path.join(root, 'tools/tool-rich-copy.json'), 'utf8'));
const slugs = [
  'currency-converter', 'exchange-rate-markup-calculator', 'multi-currency-converter',
  'offline-currency-converter', 'exchange-rate-history', 'currency-converter-widget',
  'foreign-transaction-fee-calculator', 'travel-budget-calculator'
];
const identity = {
  'currency-converter': ['Währungsrechner | Wechselkurse online umrechnen', 'Währungsrechner'],
  'exchange-rate-markup-calculator': ['Wechselkursabweichung berechnen | Balkan Currency Converter', 'Kursabweichung berechnen'],
  'multi-currency-converter': ['Mehrwährungsrechner | Einen Betrag in mehrere Währungen umrechnen', 'Ein Betrag. Mehrere Währungen.'],
  'offline-currency-converter': ['Offline-Währungsumrechner | So funktionieren gespeicherte Wechselkurse', 'Offline-Währungsumrechner: So funktionieren gespeicherte Kurse'],
  'exchange-rate-history': ['Wechselkursverlauf und Währungsdiagramm | Balkan Converter', 'Wechselkursverlauf und Währungsdiagramm'],
  'currency-converter-widget': ['Währungs-Widget für Android | Balkan Converter', 'Währungs-Widget für Android'],
  'foreign-transaction-fee-calculator': ['Fremdwährungsgebühren und DCC berechnen | Balkan Converter', 'Gebühren und DCC vergleichen'],
  'travel-budget-calculator': ['Reisebudgetrechner in zwei Währungen | Balkan Converter', 'Reisebudgetrechner']
};

function visibleMain(html) {
  return (html.match(/<main\b[\s\S]*?<\/main>/)?.[0] ?? '').replace(/<script\b[\s\S]*?<\/script>/g, ' ')
    .replace(/<[^>]+>/g, ' ').replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'")
    .replace(/\s+/g, ' ').trim();
}

test('German reviewed catalog covers every source message used by the eight tools', async () => {
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

test('German reviewed messages preserve placeholders and editorial spacing', () => {
  const placeholders = value => [...value.matchAll(/\{[A-Za-z][A-Za-z0-9]*\}/g)].map(match => match[0]).sort();
  for (const [source, translation] of Object.entries(reviewed)) {
    assert.ok(translation.trim(), `empty reviewed translation: ${source}`);
    assert.deepEqual(placeholders(translation), placeholders(source), `placeholder mismatch: ${source}`);
    assert.doesNotMatch(translation, /\|Balkan/u, `missing title separator spacing: ${source}`);
  }
});

test('all German tools use reviewed financial terminology and preserve behavior-facing copy', async () => {
  const pages = Object.fromEntries(await Promise.all(slugs.map(async slug => [slug, await fs.readFile(path.join(root, 'de', slug, 'index.html'), 'utf8')])));
  const combined = Object.values(pages).map(visibleMain).join('\n');
  for (const broken of [
    'Offline-Tarif', 'Referenzzins', 'Heimatwährung', 'Notfallpuffer', 'Puffermenge',
    'Tarifdatum', 'Quellwährung', 'Bewerten Sie den Verlauf', 'Rate nachschlagen',
    'Dynamic Currency Conversion', 'For example', 'Calculate', 'Loading', 'Try again', '\\bOptional\\b'
  ]) assert.doesNotMatch(combined, new RegExp(broken, 'iu'), broken);
  assert.equal(reviewed.Rate, 'Kurs');
  assert.equal(reviewed['Reference rate'], 'Referenzkurs');
  assert.equal(reviewed['Home/card currency'], 'Kartenwährung');
  assert.equal(reviewed['Source currency'], 'Ausgangswährung');

  for (const html of Object.values(pages)) {
    assert.match(html, /<html lang="de">/);
    assert.doesNotMatch(html, /<option value="([A-Z]{3})">(?!\1<)[A-Z]{3}<\/option>/u);
    assert.match(html, /src="\/assets\/google-play-badge-en\.png"/);
    assert.match(html, /https:\/\/play\.google\.com\/store\/apps\/details\?id=io\.github\.nstim605\.balkanconverter/);
    assert.match(html, /aria-label="Balkan Currency Converter bei Google Play herunterladen"/);
  }
  for (const [slug, [title, h1]] of Object.entries(identity)) {
    assert.ok(pages[slug].includes(`<title>${title}</title>`), `${slug} title`);
    assert.match(pages[slug], new RegExp(`<h1[^>]*>${h1.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</h1>`));
    const structured = JSON.parse(pages[slug].match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] ?? '{}');
    assert.ok(structured.name ?? structured.headline, `${slug} structured-data name`);
    const structuredUrl = structured.url ?? structured.mainEntityOfPage;
    if (structuredUrl) assert.equal(structuredUrl, `https://balkanconverter.com/de/${slug}/`, `${slug} structured-data URL`);
    assert.match(pages[slug], new RegExp(`<link rel="canonical" href="https://balkanconverter\\.com/de/${slug}/">`), `${slug} canonical`);
    for (const value of [
      pages[slug].match(/<meta name="description" content="([^"]+)">/)?.[1],
      pages[slug].match(/<meta property="og:title" content="([^"]+)">/)?.[1],
      pages[slug].match(/<meta property="og:description" content="([^"]+)">/)?.[1],
      structured.name ?? structured.headline,
      structured.description
    ]) assert.ok(value && !/(?:\bConvert (?:an|one|currency)|\bCalculator\b|Exchange Rate|Travel Budget|How Saved)/i.test(value), `${slug} metadata`);
  }
  assert.match(pages['exchange-rate-markup-calculator'], /Abweichung in % = \(Referenzergebnis − angebotenes Ergebnis\) ÷ Referenzergebnis × 100\./);
  assert.match(pages['exchange-rate-markup-calculator'], /placeholder="Zum Beispiel 11 500"/);
  assert.match(pages['multi-currency-converter'], /Eine Mehrwährungsansicht ist praktisch/);
  assert.match(pages['offline-currency-converter'], /denselben lokalen Kursspeicher/);
  assert.match(pages['currency-converter-widget'], /keine eigenständige Echtzeit-Kursquelle/);
  assert.match(pages['foreign-transaction-fee-calculator'], /dynamischen Währungsumrechnung \(DCC\)/i);
  assert.match(pages['travel-budget-calculator'], /Reserve für unerwartete Ausgaben/i);
});

test('German rich messages are complete sentences with locale-specific tool links', async () => {
  const found = new Set();
  for (const slug of slugs) {
    const html = await fs.readFile(path.join(root, 'de', slug, 'index.html'), 'utf8');
    for (const match of html.matchAll(/<p[^>]*data-i18n-rich="([^"]+)"[^>]*>([\s\S]*?)<\/p>/g)) {
      found.add(match[1]);
      assert.doesNotMatch(match[2], /(?:Explore|Use the|For one quick pair|learn how)/i);
      for (const href of [...match[2].matchAll(/href="([^"]+)"/g)].map(item => item[1])) assert.match(href, /^\/de\//);
    }
  }
  assert.deepEqual(found, new Set(Object.keys(rich.de)));
});
