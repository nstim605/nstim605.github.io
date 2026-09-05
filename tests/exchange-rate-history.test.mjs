import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import {
  calculateHistoryStatistics,
  fetchHistoricalDate,
  fetchHistory,
  normalizeHistoryRows
} from '../exchange-rate-history/history-core.mjs';

const root = path.resolve(import.meta.dirname, '..');

test('normalizes, sorts, and deduplicates valid historical points', () => {
  const points = normalizeHistoryRows([
    { date: '2026-09-03', base: 'EUR', quote: 'RSD', rate: 117.2 },
    { date: '2026-09-01', base: 'EUR', quote: 'RSD', rate: 116.9 },
    { date: '2026-09-03', base: 'EUR', quote: 'RSD', rate: 117.3 },
    { date: '2026-09-02', base: 'USD', quote: 'RSD', rate: 100 }
  ], 'EUR', 'RSD');
  assert.deepEqual(points, [
    { date: '2026-09-01', rate: 116.9 },
    { date: '2026-09-03', rate: 117.3 }
  ]);
});

test('computes latest, minimum, maximum, and average independently', () => {
  const statistics = calculateHistoryStatistics([
    { date: '2026-09-01', rate: 4 },
    { date: '2026-09-02', rate: 2 },
    { date: '2026-09-03', rate: 6 }
  ]);
  assert.deepEqual(statistics, {
    latest: { date: '2026-09-03', rate: 6 },
    minimum: 2,
    maximum: 6,
    average: 4
  });
});

test('requests ranges and preserves the actual API date for dated lookups', async () => {
  const urls = [];
  const fetchImpl = async url => {
    urls.push(url);
    return { ok: true, json: async () => [{ date: '2026-08-31', base: 'EUR', quote: 'RSD', rate: 117.1 }] };
  };
  const range = await fetchHistory({ base: 'EUR', quote: 'RSD', from: '2026-08-01', to: '2026-08-31' }, fetchImpl);
  const dated = await fetchHistoricalDate({ base: 'EUR', quote: 'RSD', date: '2026-08-30' }, fetchImpl);
  assert.equal(range.length, 1);
  assert.equal(dated.date, '2026-08-31');
  assert.match(urls[0].search, /base=EUR/);
  assert.match(urls[0].search, /quotes=RSD/);
  assert.match(urls[0].search, /from=2026-08-01/);
  assert.match(urls[1].search, /date=2026-08-30/);
});

test('supports the inverse direction without deriving it from stale forward data', async () => {
  const inverse = await fetchHistory(
    { base: 'RSD', quote: 'EUR', from: '2026-08-01', to: '2026-08-31' },
    async url => ({
      ok: true,
      json: async () => [{ date: '2026-08-31', base: url.searchParams.get('base'), quote: url.searchParams.get('quotes'), rate: 0.00853 }]
    })
  );
  assert.deepEqual(inverse, [{ date: '2026-08-31', rate: 0.00853 }]);
});

test('rejects invalid pairs, empty payloads, and failed network responses', async () => {
  assert.throws(() => normalizeHistoryRows([], 'EUR', 'RSD'), /No historical rates/);
  assert.throws(() => calculateHistoryStatistics([]), RangeError);
  await assert.rejects(fetchHistory({ base: 'EUR', quote: 'EUR', from: '2026-08-01', to: '2026-08-31' }), RangeError);
  await assert.rejects(fetchHistoricalDate({ base: 'EUR', quote: 'RSD', date: 'not-a-date' }), RangeError);
  await assert.rejects(fetchHistory(
    { base: 'EUR', quote: 'RSD', from: '2026-08-01', to: '2026-08-31' },
    async () => ({ ok: false, status: 503 })
  ), /503/);
});

test('history page is indexable, linked, and uses privacy-aware analytics', async () => {
  const [page, script, home, converter, multi, sitemap] = await Promise.all([
    fs.readFile(path.join(root, 'exchange-rate-history/index.html'), 'utf8'),
    fs.readFile(path.join(root, 'exchange-rate-history/history.js'), 'utf8'),
    fs.readFile(path.join(root, 'index.html'), 'utf8'),
    fs.readFile(path.join(root, 'currency-converter/index.html'), 'utf8'),
    fs.readFile(path.join(root, 'multi-currency-converter/index.html'), 'utf8'),
    fs.readFile(path.join(root, 'sitemap.xml'), 'utf8')
  ]);
  assert.match(page, /<title>Exchange Rate History &amp; Currency Chart \| Balkan Converter<\/title>/);
  assert.match(page, /rel="canonical" href="https:\/\/balkanconverter\.com\/exchange-rate-history\/"/);
  assert.match(page, /<h1 id="history-title">Exchange Rate History &amp; Currency Chart<\/h1>/);
  assert.equal((page.match(/<h1\b/g) || []).length, 1);
  assert.match(page, /id="history-date-form"/);
  for (const period of ['30', '90', '365']) assert.match(page, new RegExp(`name="period" value="${period}"`));
  assert.match(page, /Actual data date/);
  for (const source of [home, converter, multi]) assert.match(source, /href="\/exchange-rate-history\/"/);
  assert.match(sitemap, /<loc>https:\/\/balkanconverter\.com\/exchange-rate-history\/<\/loc>/);
  for (const event of ['exchange_rate_history_used', 'historical_date_lookup_used', 'exchange_history_play_cta_clicked']) {
    assert.match(script, new RegExp(event));
  }
  assert.doesNotMatch(script, /trackSiteEvent\([^\n]+(?:date|amount|value):/);
});
