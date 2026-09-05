import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');

test('offline guide has unique indexable metadata and a single H1', async () => {
  const page = await fs.readFile(path.join(root, 'offline-currency-converter/index.html'), 'utf8');
  assert.match(page, /<title>Offline Currency Converter \| How Saved Exchange Rates Work<\/title>/);
  assert.match(page, /<meta name="description" content="[^"]+">/);
  assert.match(page, /rel="canonical" href="https:\/\/balkanconverter\.com\/offline-currency-converter\/"/);
  assert.match(page, /<meta property="og:url" content="https:\/\/balkanconverter\.com\/offline-currency-converter\/">/);
  assert.equal((page.match(/<h1\b/g) || []).length, 1);
});

test('offline guide makes the cache limitations explicit', async () => {
  const page = await fs.readFile(path.join(root, 'offline-currency-converter/index.html'), 'utf8');
  assert.match(page, /numbers do not update while the device is offline/i);
  assert.match(page, /check the displayed rate date/i);
  assert.match(page, /successful online refresh replaces the older cached dataset/i);
  assert.match(page, /refresh fails, the app falls back to the previous cached rates/i);
  assert.doesNotMatch(page, /this (web|website).{0,30}(works|available) offline/i);
});

test('offline guide is connected to the site and Google Play', async () => {
  const [page, home, markup, multi, sitemap] = await Promise.all([
    fs.readFile(path.join(root, 'offline-currency-converter/index.html'), 'utf8'),
    fs.readFile(path.join(root, 'index.html'), 'utf8'),
    fs.readFile(path.join(root, 'exchange-rate-markup-calculator/index.html'), 'utf8'),
    fs.readFile(path.join(root, 'multi-currency-converter/index.html'), 'utf8'),
    fs.readFile(path.join(root, 'sitemap.xml'), 'utf8')
  ]);
  for (const source of [home, markup, multi]) assert.match(source, /href="\/offline-currency-converter\/"/);
  assert.match(page, /href="\/multi-currency-converter\/"/);
  assert.match(page, /href="\/exchange-rate-markup-calculator\/"/);
  assert.match(page, /play\.google\.com\/store\/apps\/details\?id=io\.github\.nstim605\.balkanconverter/);
  assert.match(sitemap, /<loc>https:\/\/balkanconverter\.com\/offline-currency-converter\/<\/loc>/);
});
