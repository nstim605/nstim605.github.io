import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { calculateForeignTransaction } from '../foreign-transaction-fee-calculator/calculator-core.mjs';

const root = path.resolve(import.meta.dirname, '..');
const base = { localAmount: 100, localCurrency: 'RSD', homeCurrency: 'EUR', localRate: 2, homeRate: 1 };

test('calculates independently checked local-currency fee scenarios', () => {
  const noFees = calculateForeignTransaction(base);
  assert.equal(noFees.referenceRate, 0.5);
  assert.equal(noFees.referenceAmount, 50);
  assert.equal(noFees.percentageFee, 0);
  assert.equal(noFees.localCurrencyTotal, 50);

  const percentage = calculateForeignTransaction({ ...base, foreignFeePercent: 2 });
  assert.equal(percentage.percentageFee, 1);
  assert.equal(percentage.localCurrencyTotal, 51);

  const both = calculateForeignTransaction({ ...base, foreignFeePercent: 2, fixedFee: 3 });
  assert.equal(both.percentageFee, 1);
  assert.equal(both.localCurrencyTotal, 54);
});

test('compares better, worse, and equal DCC quotes', () => {
  const better = calculateForeignTransaction({ ...base, foreignFeePercent: 2, fixedFee: 3, dccAmount: 48 });
  assert.equal(better.dcc.differenceFromReference, -2);
  assert.equal(better.dcc.effectiveMarkupPercent, -4);
  assert.equal(better.dcc.differenceFromLocal, -6);
  assert.equal(better.dcc.cheaperOption, 'dcc');

  const worse = calculateForeignTransaction({ ...base, foreignFeePercent: 2, fixedFee: 3, dccAmount: 60 });
  assert.equal(worse.dcc.differenceFromReference, 10);
  assert.equal(worse.dcc.effectiveMarkupPercent, 20);
  assert.equal(worse.dcc.differenceFromLocal, 6);
  assert.equal(worse.dcc.cheaperOption, 'local');

  const equal = calculateForeignTransaction({ ...base, dccAmount: 50 });
  assert.equal(equal.dcc.differenceFromLocal, 0);
  assert.equal(equal.dcc.cheaperOption, 'equal');
});

test('rejects invalid amounts, fees, DCC values, and identical currencies', () => {
  assert.throws(() => calculateForeignTransaction({ ...base, localAmount: 0 }), RangeError);
  assert.throws(() => calculateForeignTransaction({ ...base, foreignFeePercent: -1 }), RangeError);
  assert.throws(() => calculateForeignTransaction({ ...base, fixedFee: -1 }), RangeError);
  assert.throws(() => calculateForeignTransaction({ ...base, dccAmount: 0 }), RangeError);
  assert.throws(() => calculateForeignTransaction({ ...base, homeCurrency: 'RSD' }), /different currencies/);
});

test('page is distinct, indexable, linked, and privacy-aware', async () => {
  const [page, script, home, markup, converter, sitemap] = await Promise.all([
    fs.readFile(path.join(root, 'foreign-transaction-fee-calculator/index.html'), 'utf8'),
    fs.readFile(path.join(root, 'foreign-transaction-fee-calculator/calculator.js'), 'utf8'),
    fs.readFile(path.join(root, 'index.html'), 'utf8'),
    fs.readFile(path.join(root, 'exchange-rate-markup-calculator/index.html'), 'utf8'),
    fs.readFile(path.join(root, 'currency-converter/index.html'), 'utf8'),
    fs.readFile(path.join(root, 'sitemap.xml'), 'utf8')
  ]);
  assert.match(page, /<title>Foreign Transaction Fee &amp; DCC Calculator \| Balkan Converter<\/title>/);
  assert.match(page, /rel="canonical" href="https:\/\/balkanconverter\.com\/foreign-transaction-fee-calculator\/"/);
  assert.equal((page.match(/<h1\b/g) || []).length, 1);
  assert.match(page, /Pay in local currency or use the offered conversion\?/);
  assert.match(page, /Frankfurter reference-rate API/);
  for (const source of [home, markup, converter]) assert.match(source, /href="\/foreign-transaction-fee-calculator\/"/);
  assert.match(sitemap, /<loc>https:\/\/balkanconverter\.com\/foreign-transaction-fee-calculator\/<\/loc>/);
  for (const event of ['foreign_transaction_fee_calculator_used', 'dcc_comparison_used', 'foreign_fee_play_cta_clicked']) {
    assert.match(script, new RegExp(`trackSiteEvent\\('${event}'\\)`));
  }
  assert.doesNotMatch(script, /trackSiteEvent\('(?:foreign_transaction_fee_calculator_used|dcc_comparison_used)'\s*,/);
});

test('network failure remains a visible retryable state', async () => {
  const script = await fs.readFile(path.join(root, 'foreign-transaction-fee-calculator/calculator.js'), 'utf8');
  assert.match(script, /Rates could not be loaded\. Check your connection and try again\./);
  assert.match(script, /rateData = undefined/);
});
