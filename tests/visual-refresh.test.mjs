import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const locales = JSON.parse(await fs.readFile(path.join(root, 'site-locales.json'), 'utf8')).locales;
const listings = JSON.parse(await fs.readFile(
  path.join(root, '..', 'play_store_listings', 'release-1.6', 'google-play-listings.json'), 'utf8'));
const listingByLocale = new Map(listings.map(item => [item.locale, item]));
const listingLocale = locale => ({ iw: 'he', in: 'id' })[locale] ?? locale;

function pngDimensions(bytes) {
  assert.equal(bytes.subarray(1, 4).toString('ascii'), 'PNG');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

for (const locale of locales) test(`${locale.webLocale}: release 1.603 homepage content and imagery`, async () => {
  const file = path.join(root, locale.url === '/' ? 'index.html' : `${locale.url.slice(1)}index.html`);
  const html = await fs.readFile(file, 'utf8');
  const listing = listingByLocale.get(listingLocale(locale.androidLocale));
  assert.ok(listing);
  assert.match(html, new RegExp(`<meta name="description" content="${listing.shortDescription.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));
  assert.equal((html.match(/assets\/screenshots\/v1-603\/screenshot-/g) ?? []).length, 7);
  assert.equal((html.match(/<figure class="screenshot-card">/g) ?? []).length, 6);
  assert.equal((html.match(/<article class="feature-card/g) ?? []).length, 6);
  assert.match(html, /assets\/icons\/v1-603\/app-icon-v1-603\.png/);
  assert.match(html, /assets\/og-v1-603\.png/);
  assert.match(html, /<meta property="og:image:width" content="1024">/);
  assert.match(html, /<meta property="og:image:height" content="500">/);
  assert.doesNotMatch(html, /assets\/(?:screenshots|icons)\/v1-5-11\//);
  assert.doesNotMatch(html, /href="\/(?:sr\/|ru\/)?news\/"/);
  assert.match(html, new RegExp(`<html lang="${locale.hreflang}"${locale.dir === 'rtl' ? ' dir="rtl"' : ''}>`));
});

test('release 1.603 screenshot and icon assets have approved dimensions', async () => {
  for (let number = 1; number <= 6; number += 1) {
    const bytes = await fs.readFile(path.join(root, 'assets', 'screenshots', 'v1-603', `screenshot-${number}.png`));
    assert.deepEqual(pngDimensions(bytes), { width: 333, height: 592 });
    assert.ok(bytes.length > 50_000 && bytes.length < 250_000);
  }
  const icon = await fs.readFile(path.join(root, 'assets', 'icons', 'v1-603', 'app-icon-v1-603.png'));
  assert.deepEqual(pngDimensions(icon), { width: 512, height: 512 });
  assert.deepEqual(await fs.readFile(path.join(root, 'assets', 'app-icon.png')), icon);
  const social = await fs.readFile(path.join(root, 'assets', 'og-v1-603.png'));
  assert.deepEqual(pngDimensions(social), { width: 1024, height: 500 });
});

test('homepage template, responsive layout and web manifest use the current release', async () => {
  const [template, css, manifest] = await Promise.all([
    fs.readFile(path.join(root, 'tools', 'templates', 'index.html'), 'utf8'),
    fs.readFile(path.join(root, 'styles.css'), 'utf8'),
    fs.readFile(path.join(root, 'site.webmanifest'), 'utf8')
  ]);
  assert.equal((template.match(/assets\/screenshots\/v1-603\/screenshot-/g) ?? []).length, 7);
  assert.match(css, /\.screenshot-grid\s*\{[^}]*grid-template-columns:\s*repeat\(3, 1fr\)/);
  assert.match(css, /@media \(max-width: 980px\)[\s\S]*?\.screenshot-grid\s*\{[^}]*repeat\(2, 1fr\)/);
  assert.match(css, /@media \(max-width: 540px\)[\s\S]*?\.feature-grid, \.screenshot-grid\s*\{[^}]*grid-template-columns:\s*1fr/);
  assert.match(manifest, /assets\/icons\/v1-603\/app-icon-v1-603\.png/);
  assert.doesNotMatch(manifest, /v1-5-11/);
});
