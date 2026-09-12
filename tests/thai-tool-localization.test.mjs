import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import { parseLocalizedNumber } from '../exchange-rate-markup-calculator/calculator-core.mjs';

const root = path.resolve(import.meta.dirname, '..');
const catalog = JSON.parse(await fs.readFile(path.join(root, 'tools', 'tool-copy-reviewed-th.json'), 'utf8'));
const slugs = [
  'currency-converter',
  'exchange-rate-markup-calculator',
  'multi-currency-converter',
  'offline-currency-converter',
  'exchange-rate-history',
  'currency-converter-widget',
  'foreign-transaction-fee-calculator',
  'travel-budget-calculator'
];

test('Thai reviewed catalog keeps the financial formula and parser-safe example intact', () => {
  const formula = 'ส่วนต่าง (%) = (ผลลัพธ์ตามอัตราอ้างอิง − ผลลัพธ์ตามข้อเสนอ) ÷ ผลลัพธ์ตามอัตราอ้างอิง × 100';
  assert.equal(catalog['Markup = (reference result − offered result) ÷ reference result × 100.'], formula);
  assert.equal(catalog['For example, 11,500'], 'เช่น 11500');
  assert.equal(parseLocalizedNumber('11500'), 11500);
});

test('all eight Thai tools use reviewed copy without known low-confidence defects', async () => {
  // English source strings remain as JSON object keys in each generated page;
  // only rendered Thai values and known broken Thai phrases are regressions.
  const banned = /\bKW\b|มาร์กอัป|คณะกรรมการการเดินทาง|สกุลเงินบ้าน|บัฟเฟอร์|ไซต์Firebase|\.แอป/u;
  for (const slug of slugs) {
    const html = await fs.readFile(path.join(root, 'th', slug, 'index.html'), 'utf8');
    assert.match(html, /<html lang="th">/, `${slug}: Thai lang`);
    assert.match(html, new RegExp(`<link rel="canonical" href="https://balkanconverter\\.com/th/${slug}/">`));
    assert.doesNotMatch(html, banned, `${slug}: legacy machine-translated wording`);
    assert.match(html, /src="\/assets\/google-play-badge-en\.png"/);
  }
});

test('Thai review artifact records local language QA pass and complete tool coverage', async () => {
  const review = await fs.readFile(path.join(root, 'THAI_TOOL_LOCALIZATION_REVIEW.md'), 'utf8');
  assert.match(review, /Status: \*\*LANGUAGE QA PASS — LOCAL\*\*/);
  for (const slug of slugs) assert.ok(review.includes('URL: `/th/' + slug + '/`'), `${slug}: review section`);
  assert.doesNotMatch(review, /\bKW\b|มาร์กอัป|Conversion|คณะกรรมการการเดินทาง/u);
});
