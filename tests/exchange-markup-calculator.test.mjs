import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import {
  buildRateTable,
  calculateMarkup,
  fetchReferenceRates,
  parseLocalizedNumber
} from '../exchange-rate-markup-calculator/calculator-core.mjs';

const root = path.resolve(import.meta.dirname, '..');

test('calculates the reference result, difference, and markup', () => {
  const result = calculateMarkup({ amount: 100, offeredAmount: 11000, sourceRate: 1, targetRate: 117 });
  assert.equal(result.referenceRate, 117);
  assert.equal(result.referenceResult, 11700);
  assert.equal(result.difference, 700);
  assert.ok(Math.abs(result.markupPercentage - 5.9829059829) < 1e-9);
});

test('supports cross-rates and offers above the reference result', () => {
  const result = calculateMarkup({ amount: 100, offeredAmount: 95, sourceRate: 2, targetRate: 1.8 });
  assert.equal(result.referenceRate, .9);
  assert.equal(result.referenceResult, 90);
  assert.equal(result.difference, -5);
  assert.ok(result.markupPercentage < 0);
});

test('uses the documented Russian sign convention for comparison percentage', () => {
  const below = calculateMarkup({ amount: 100, offeredAmount: 95, sourceRate: 1, targetRate: 1 });
  const above = calculateMarkup({ amount: 100, offeredAmount: 105, sourceRate: 1, targetRate: 1 });
  assert.equal(below.referenceResult, 100);
  assert.equal(below.markupPercentage, 5);
  assert.equal(above.referenceResult, 100);
  assert.equal(above.markupPercentage, -5);
});

test('accepts comma decimals and rejects zero or invalid input', () => {
  assert.equal(parseLocalizedNumber('1 234,50'), 1234.5);
  assert.equal(parseLocalizedNumber('11 500'), 11500);
  assert.equal(parseLocalizedNumber('11,5'), 11.5);
  assert.equal(parseLocalizedNumber('1,234.50'), 1234.5);
  assert.throws(() => calculateMarkup({ amount: 0, offeredAmount: 1, sourceRate: 1, targetRate: 1 }), RangeError);
  assert.throws(() => calculateMarkup({ amount: 1, offeredAmount: Number.NaN, sourceRate: 1, targetRate: 1 }), RangeError);
});

test('normalizes valid EUR-base rate data and rejects failed network responses', async () => {
  const data = buildRateTable([{ base: 'EUR', quote: 'RSD', rate: 117.1, date: '2026-09-04' }]);
  assert.equal(data.table.get('EUR'), 1);
  assert.equal(data.table.get('RSD'), 117.1);
  assert.equal(data.date, '2026-09-04');
  await assert.rejects(fetchReferenceRates(async () => ({ ok: false, status: 503 })), /503/);
});

test('calculator page has indexable metadata, valid form semantics, and homepage link', async () => {
  const [page, home, sitemap] = await Promise.all([
    fs.readFile(path.join(root, 'exchange-rate-markup-calculator/index.html'), 'utf8'),
    fs.readFile(path.join(root, 'index.html'), 'utf8'),
    fs.readFile(path.join(root, 'sitemap.xml'), 'utf8')
  ]);
  assert.match(page, /<title>Exchange Rate Markup Calculator \| Balkan Currency Converter<\/title>/);
  assert.match(page, /rel="canonical" href="https:\/\/balkanconverter\.com\/exchange-rate-markup-calculator\/"/);
  assert.match(page, /<h1 id="calculator-title">Exchange Rate Markup Calculator<\/h1>/);
  assert.match(page, /id="markup-form"/);
  assert.match(home, /href="\/exchange-rate-markup-calculator\/"/);
  assert.match(sitemap, /<loc>https:\/\/balkanconverter\.com\/exchange-rate-markup-calculator\/<\/loc>/);
});
