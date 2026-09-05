import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { convertCurrency } from '../currency-converter/converter-core.mjs';

const root = path.resolve(import.meta.dirname, '..');

test('converts between two currencies using cross-rates', () => {
  assert.deepEqual(convertCurrency({ amount: 100, sourceRate: 1, targetRate: 117 }), { value: 11700, rate: 117 });
  assert.deepEqual(convertCurrency({ amount: 11700, sourceRate: 117, targetRate: 1 }), { value: 100, rate: 1 / 117 });
});

test('rejects invalid conversion values', () => {
  assert.throws(() => convertCurrency({ amount: 0, sourceRate: 1, targetRate: 117 }), RangeError);
  assert.throws(() => convertCurrency({ amount: 1, sourceRate: Number.NaN, targetRate: 117 }), RangeError);
});

test('basic converter is indexable, distinct, and connected to the site', async () => {
  const [page, script, home, markup, multi, offline, sitemap] = await Promise.all([
    fs.readFile(path.join(root, 'currency-converter/index.html'), 'utf8'),
    fs.readFile(path.join(root, 'currency-converter/converter.js'), 'utf8'),
    fs.readFile(path.join(root, 'index.html'), 'utf8'),
    fs.readFile(path.join(root, 'exchange-rate-markup-calculator/index.html'), 'utf8'),
    fs.readFile(path.join(root, 'multi-currency-converter/index.html'), 'utf8'),
    fs.readFile(path.join(root, 'offline-currency-converter/index.html'), 'utf8'),
    fs.readFile(path.join(root, 'sitemap.xml'), 'utf8')
  ]);
  assert.match(page, /<h1 id="currency-title">Currency Converter<\/h1>/);
  assert.match(page, /rel="canonical" href="https:\/\/balkanconverter\.com\/currency-converter\/"/);
  assert.equal((page.match(/<h1\b/g) || []).length, 1);
  assert.match(page, /id="swap-currencies"/);
  assert.match(script, /Reference rates dated/);
  assert.match(page, /Frankfurter reference-rate API/);
  for (const source of [home, markup, multi, offline]) assert.match(source, /href="\/currency-converter\/"/);
  assert.match(sitemap, /<loc>https:\/\/balkanconverter\.com\/currency-converter\/<\/loc>/);
});
