import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');

test('widget guide has unique indexable metadata and structured steps', async () => {
  const page = await fs.readFile(path.join(root, 'currency-converter-widget/index.html'), 'utf8');
  assert.match(page, /<title>Currency Converter Widget for Android \| Balkan Converter<\/title>/);
  assert.match(page, /rel="canonical" href="https:\/\/balkanconverter\.com\/currency-converter-widget\/"/);
  assert.match(page, /<h1 id="widget-title">Currency Converter Widget for Android<\/h1>/);
  assert.equal((page.match(/<h1\b/g) || []).length, 1);
  assert.match(page, /"@type":"HowTo"/);
  assert.equal((page.match(/"@type":"HowToStep"/g) || []).length, 4);
});

test('guide uses the approved production widget image with explicit dimensions', async () => {
  const [page, asset] = await Promise.all([
    fs.readFile(path.join(root, 'currency-converter-widget/index.html'), 'utf8'),
    fs.readFile(path.join(root, 'assets/guides/widget-home-screen.png'))
  ]);
  assert.match(page, /src="\/assets\/guides\/widget-home-screen\.png" width="1080" height="1920"/);
  assert.match(page, /production currency widget/i);
  assert.deepEqual([...asset.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.ok(asset.length > 100_000);
});

test('guide accurately describes cached data, resize behavior, swap and app opening', async () => {
  const page = await fs.readFile(path.join(root, 'currency-converter-widget/index.html'), 'utf8');
  assert.match(page, /latest successfully cached rate dataset/i);
  assert.match(page, /not an independent live market feed/i);
  assert.match(page, /wider widget also shows a swap button/i);
  assert.match(page, /Tap the card to open that pair in the app/i);
});

test('widget guide is linked internally, listed in sitemap, and points to Google Play', async () => {
  const [page, home, offline, sitemap] = await Promise.all([
    fs.readFile(path.join(root, 'currency-converter-widget/index.html'), 'utf8'),
    fs.readFile(path.join(root, 'index.html'), 'utf8'),
    fs.readFile(path.join(root, 'offline-currency-converter/index.html'), 'utf8'),
    fs.readFile(path.join(root, 'sitemap.xml'), 'utf8')
  ]);
  for (const source of [home, offline]) assert.match(source, /href="\/currency-converter-widget\/"/);
  assert.match(page, /href="\/offline-currency-converter\/"/);
  assert.match(page, /play\.google\.com\/store\/apps\/details\?id=io\.github\.nstim605\.balkanconverter/);
  assert.match(sitemap, /<loc>https:\/\/balkanconverter\.com\/currency-converter-widget\/<\/loc>/);
});
