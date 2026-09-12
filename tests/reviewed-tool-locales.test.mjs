import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const manifest = JSON.parse(await fs.readFile(path.join(root, 'tools/reviewed-tool-locales.json'), 'utf8'));
const rawCatalog = JSON.parse(await fs.readFile(path.join(root, 'tools/tool-copy.json'), 'utf8')).locales;
const richCopy = JSON.parse(await fs.readFile(path.join(root, 'tools/tool-rich-copy.json'), 'utf8'));
const slugs = [
  'currency-converter', 'exchange-rate-markup-calculator', 'multi-currency-converter',
  'offline-currency-converter', 'exchange-rate-history', 'currency-converter-widget',
  'foreign-transaction-fee-calculator', 'travel-budget-calculator'
];

function placeholders(value) {
  return [...value.matchAll(/\{[A-Za-z][A-Za-z0-9]*\}/g)].map(match => match[0]).sort();
}

test('reviewed locale manifest is unique and references valid catalogs', async () => {
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(new Set(manifest.locales.map(item => item.locale)).size, manifest.locales.length);
  for (const entry of manifest.locales) {
    assert.ok(rawCatalog[entry.locale], `${entry.locale} raw catalog`);
    const reviewed = JSON.parse(await fs.readFile(path.join(root, 'tools', `tool-copy-reviewed-${entry.locale}.json`), 'utf8'));
    for (const [source, value] of Object.entries(reviewed)) {
      assert.ok(value.trim(), `${entry.locale}: empty ${source}`);
      assert.deepEqual(placeholders(value), placeholders(source), `${entry.locale}: placeholders ${source}`);
    }
    assert.ok(richCopy[entry.locale], `${entry.locale} rich-copy slots`);
  }
});

test('reviewed locale pages retain locale routing, metadata, badge and rich sentences', async () => {
  for (const entry of manifest.locales) {
    for (const slug of slugs) {
      const html = await fs.readFile(path.join(root, entry.route, slug, 'index.html'), 'utf8');
      const htmlTag = html.match(/<html\b[^>]*>/)?.[0] ?? '';
      assert.match(htmlTag, new RegExp(`\\blang="${entry.locale}"`), `${entry.locale}/${slug} lang`);
      if (entry.dir === 'rtl') assert.match(htmlTag, /\bdir="rtl"/, `${entry.locale}/${slug} direction`);
      else assert.doesNotMatch(htmlTag, /\bdir="rtl"/, `${entry.locale}/${slug} direction`);
      assert.match(html, new RegExp(`<link rel="canonical" href="https://balkanconverter\\.com/${entry.route}/${slug}/">`));
      assert.match(html, /<title>[^<]+<\/title>/);
      assert.match(html, /<meta name="description" content="[^"]+">/);
      assert.match(html, /<h1[^>]*>[\s\S]*?<\/h1>/);
      assert.match(html, /src="\/assets\/google-play-badge-en\.png"/);
      assert.match(html, /id=io\.github\.nstim605\.balkanconverter/);
      for (const match of html.matchAll(/<p[^>]*data-i18n-rich="([^"]+)"[^>]*>([\s\S]*?)<\/p>/g)) {
        assert.ok(richCopy[entry.locale][match[1]], `${entry.locale}: ${match[1]} rich-copy source`);
        for (const href of [...match[2].matchAll(/href="([^"]+)"/g)].map(item => item[1])) assert.match(href, new RegExp(`^/${entry.route}/`));
      }
    }
  }
});
