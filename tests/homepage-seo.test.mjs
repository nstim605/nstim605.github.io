import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { updateHomepageSeo, validateHomepageSeoCopy } from '../tools/sync-homepage-seo.mjs';

const root = path.resolve(import.meta.dirname, '..');
const { locales } = JSON.parse(await fs.readFile(path.join(root, 'site-locales.json'), 'utf8'));
const catalog = JSON.parse(await fs.readFile(path.join(root, 'tools/homepage-seo-copy.json'), 'utf8'));
const englishHomepage = await fs.readFile(path.join(root, 'index.html'), 'utf8');
const escapeHtml = value => value.replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);
const jsonLd = html => JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1]);

function maskSeoValues(html) {
  return html.replace(/<head>[\s\S]*?<\/head>/, head => head
    .replace(/(<title>)[^<]*(<\/title>)/, '$1TITLE$2')
    .replace(/(<meta (?:name|property)="(?:description|og:title|og:description|twitter:title|twitter:description)" content=")[^"]*(">)/g, '$1SEO_VALUE$2')
    .replace(/("description"\s*:\s*)"(?:\\.|[^"\\])*"/, '$1"DESCRIPTION"'));
}

test('SEO copy covers the complete locale inventory with the exact approved English and Russian wording', () => {
  assert.equal(locales.length, 44);
  validateHomepageSeoCopy(catalog, locales.map(locale => locale.webLocale));
  assert.deepEqual(catalog.en, {
    title: 'Currency Converter & Price Scanner | BALCO Converter',
    description: 'Convert prices abroad with BALCO Converter for Android. Enter an amount or scan a price tag. Use previously downloaded exchange rates offline.'
  });
  assert.deepEqual(catalog.ru, {
    title: 'Конвертер валют и сканер цен — BALCO Converter',
    description: 'Пересчитывайте цены в поездках с BALCO Converter для Android. Вводите сумму или сканируйте ценник. Без интернета используйте заранее загруженные курсы.'
  });
});

test('a locale subset, English fallback or missing platform scope cannot pass SEO validation', () => {
  const codes = locales.map(locale => locale.webLocale);
  assert.throws(() => validateHomepageSeoCopy({ en: catalog.en, ru: catalog.ru }, codes), /complete locale manifest/);
  const fallback = structuredClone(catalog);
  fallback.sr = { ...catalog.en };
  assert.throws(() => validateHomepageSeoCopy(fallback, codes), /English fallback/);
  const missingScope = structuredClone(catalog);
  missingScope.ru.description = missingScope.ru.description.replace('Android', '');
  assert.throws(() => validateHomepageSeoCopy(missingScope, codes), /missing Android scope/);
});

test('SEO synchronization escapes HTML and JSON while preserving the body and other structured properties', () => {
  const copy = {
    title: 'BALCO Converter & "Price scanner" <Android>',
    description: 'BALCO Converter for Android: "prices" & offline rates. </script><script>alert(1)</script>'
  };
  const updated = updateHomepageSeo(englishHomepage, copy);
  assert.ok(updated.includes(`<title>${escapeHtml(copy.title)}</title>`));
  assert.ok(updated.includes(`<meta property="og:title" content="${escapeHtml(copy.title)}">`));
  assert.ok(updated.includes(`<meta name="twitter:description" content="${escapeHtml(copy.description)}">`));
  assert.equal(jsonLd(updated).description, copy.description);
  assert.deepEqual(jsonLd(updated), { ...jsonLd(englishHomepage), description: copy.description });
  assert.equal(updated.slice(updated.indexOf('</head>')), englishHomepage.slice(englishHomepage.indexOf('</head>')));
  assert.equal((updated.match(/<script>/g) ?? []).length, (englishHomepage.match(/<script>/g) ?? []).length);
  assert.equal(updateHomepageSeo(updated, copy), updated);
});

test('missing or duplicate metadata stops synchronization instead of updating only part of a page', () => {
  assert.throws(() => updateHomepageSeo(englishHomepage.replace(/<title>[^<]*<\/title>/, ''), catalog.en), /exactly one homepage title/);
  const duplicate = englishHomepage.replace('</head>', '<meta name="description" content="duplicate"></head>');
  assert.throws(() => updateHomepageSeo(duplicate, catalog.en), /exactly one homepage description/);
  const malformed = englishHomepage.replace('"@type": "MobileApplication"', '"@type": "Article"');
  assert.throws(() => updateHomepageSeo(malformed, catalog.en), /MobileApplication/);
});

for (const locale of locales) test(`${locale.webLocale}: all seven homepage metadata values match the localized catalog`, async () => {
  const html = await fs.readFile(path.join(root, locale.url.slice(1), 'index.html'), 'utf8');
  const copy = catalog[locale.webLocale];
  assert.equal(updateHomepageSeo(html, copy), html, 'stale search or social metadata must fail before publication');
  assert.ok(html.includes(`<title>${escapeHtml(copy.title)}</title>`));
  for (const [attribute, field, value] of [
    ['name', 'description', copy.description],
    ['property', 'og:title', copy.title],
    ['property', 'og:description', copy.description],
    ['name', 'twitter:title', copy.title],
    ['name', 'twitter:description', copy.description]
  ]) {
    assert.ok(html.includes(`<meta ${attribute}="${field}" content="${escapeHtml(value)}">`));
  }
  assert.equal(jsonLd(html).description, copy.description);
  assert.ok(html.includes(`<html lang="${locale.webLocale}"${locale.dir === 'rtl' ? ' dir="rtl"' : ''}>`));
  assert.ok(html.includes(`<link rel="canonical" href="https://balkanconverter.com${locale.url}">`));
  const changed = updateHomepageSeo(html, { title: `${copy.title} (test)`, description: `${copy.description} (test)` });
  assert.notEqual(changed, html);
  assert.equal(maskSeoValues(changed), maskSeoValues(html), 'only the seven approved metadata values may change');
});
