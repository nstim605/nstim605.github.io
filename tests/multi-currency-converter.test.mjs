import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { convertToMultiple } from '../multi-currency-converter/converter-core.mjs';

const root = path.resolve(import.meta.dirname, '..');

test('converts one amount to several currencies using cross-rates', () => {
  const result = convertToMultiple({ amount: 100, baseRate: 1, targets: [{ code: 'RSD', rate: 117 }, { code: 'USD', rate: 1.2 }] });
  assert.deepEqual(result, [{ code: 'RSD', value: 11700 }, { code: 'USD', value: 120 }]);
});

test('rejects zero amounts, empty targets, and duplicate currencies', () => {
  assert.throws(() => convertToMultiple({ amount: 0, baseRate: 1, targets: [{ code: 'USD', rate: 1 }] }), RangeError);
  assert.throws(() => convertToMultiple({ amount: 1, baseRate: 1, targets: [] }), RangeError);
  assert.throws(() => convertToMultiple({ amount: 1, baseRate: 1, targets: [{ code: 'USD', rate: 1 }, { code: 'USD', rate: 1 }] }), /only once/);
});

test('multi-currency page is indexable and linked internally', async () => {
  const [page, home, markup, sitemap] = await Promise.all([
    fs.readFile(path.join(root, 'multi-currency-converter/index.html'), 'utf8'),
    fs.readFile(path.join(root, 'index.html'), 'utf8'),
    fs.readFile(path.join(root, 'exchange-rate-markup-calculator/index.html'), 'utf8'),
    fs.readFile(path.join(root, 'sitemap.xml'), 'utf8')
  ]);
  assert.match(page, /<h1 id="multi-title">Multi-Currency Converter<\/h1>/);
  assert.match(page, /rel="canonical" href="https:\/\/balkanconverter\.com\/multi-currency-converter\/"/);
  assert.match(home, /href="\/multi-currency-converter\/"/);
  assert.match(markup, /href="\/multi-currency-converter\/"/);
  assert.match(sitemap, /<loc>https:\/\/balkanconverter\.com\/multi-currency-converter\/<\/loc>/);
});
