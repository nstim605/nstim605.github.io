import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { updateHomepageScreenshots, validateScreenshotCopy } from '../tools/sync-homepage-screenshots.mjs';

const root = path.resolve(import.meta.dirname, '..');
const locales = JSON.parse(await fs.readFile(path.join(root, 'site-locales.json'), 'utf8')).locales;
const englishHomepage = await fs.readFile(path.join(root, 'index.html'), 'utf8');
const englishDescription = englishHomepage.match(/<meta name="description" content="([^"]+)"/)?.[1];
const screenshotCopy = JSON.parse(await fs.readFile(path.join(root, 'tools/homepage-screenshots-copy.json'), 'utf8'));
const screenshotManifest = JSON.parse(await fs.readFile(path.join(root, 'assets/screenshots/v1-620/manifest.json'), 'utf8'));
const scenes = ['converter', 'scanner', 'cart', 'travel-board', 'exchange-comparison', 'chart', 'settings', 'crypto'];
const escapeHtml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const normalize = value => value.replace(/\s+/g, ' ').trim();

function pngDimensions(bytes) {
  assert.equal(bytes.subarray(1, 4).toString('ascii'), 'PNG');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function webpDimensions(bytes) {
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
  assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
  assert.equal(bytes.readUInt32LE(4) + 8, bytes.length, 'complete RIFF container');
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const type = bytes.toString('ascii', offset, offset + 4);
    const length = bytes.readUInt32LE(offset + 4);
    const data = offset + 8;
    assert.ok(data + length <= bytes.length, 'complete WebP chunk');
    if (type === 'VP8X') {
      assert.ok(length >= 10);
      return {width: bytes.readUIntLE(data + 4, 3) + 1, height: bytes.readUIntLE(data + 7, 3) + 1};
    }
    if (type === 'VP8 ') {
      assert.ok(length >= 10);
      assert.equal(bytes.toString('hex', data + 3, data + 6), '9d012a');
      return {width: bytes.readUInt16LE(data + 6) & 0x3fff, height: bytes.readUInt16LE(data + 8) & 0x3fff};
    }
    if (type === 'VP8L') {
      assert.ok(length >= 5);
      assert.equal(bytes[data], 0x2f);
      const bits = bytes.readUInt32LE(data + 1);
      return {width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1};
    }
    offset = data + length + (length % 2);
  }
  assert.fail('WebP dimension chunk is missing');
}

function assertScreenshotMarkup(html, locale) {
  const images = [...html.matchAll(/<img\b[^>]*\bsrc="\/assets\/screenshots\/[^>]*>/g)].map(match => match[0]);
  assert.equal(images.length, 9, `${locale.webLocale}: hero plus eight gallery images`);
  const expectedScenes = ['converter', ...scenes];
  for (const [index, image] of images.entries()) {
    const scene = expectedScenes[index];
    const number = String(index === 0 ? 1 : index).padStart(2, '0');
    const base = `/assets/screenshots/v1-620/${locale.webLocale}/${number}-${scene}`;
    const copy = screenshotCopy.locales[locale.webLocale][scene];
    assert.ok(image.includes(`src="${base}-540.webp"`), `${locale.webLocale}/${scene}`);
    assert.ok(image.includes(`srcset="${base}-540.webp 540w, ${base}.webp 1080w"`));
    assert.ok(image.includes('width="1080" height="1920"'));
    assert.ok(image.includes('decoding="async"'));
    assert.ok(image.includes(`alt="${escapeHtml([copy.title, copy.subtitle].filter(Boolean).join(' '))}"`));
    assert.match(image, /\bsizes="[^"]+"/);
    if (index === 0) {
      assert.match(image, /fetchpriority="high"/);
      assert.doesNotMatch(image, /loading="lazy"/);
    } else assert.match(image, /loading="lazy"/);
  }
  assert.equal((html.match(/<figure class="screenshot-card">/g) ?? []).length, 8);
  const captions = [...html.matchAll(/<figcaption><strong>([\s\S]*?)<\/strong>(?:<span>([\s\S]*?)<\/span>)?<\/figcaption>/g)];
  assert.deepEqual(captions.map(match => [match[1], match[2] || '']), scenes.map(scene => {
    const copy = screenshotCopy.locales[locale.webLocale][scene];
    return [escapeHtml(copy.title), escapeHtml(copy.subtitle)];
  }));
  assert.equal((html.match(/<p class="screenshot-release"><bdi dir="ltr">Google Play · 1\.620<\/bdi><\/p>/g) || []).length, 1);
  assert.doesNotMatch(html, /assets\/screenshots\/v1-(?:607|603|5-11)\//);
}

for (const locale of locales) test(`${locale.webLocale}: current homepage content and imagery`, async () => {
  const file = path.join(root, locale.url === '/' ? 'index.html' : `${locale.url.slice(1)}index.html`);
  const html = await fs.readFile(file, 'utf8');
  const description = html.match(/<meta name="description" content="([^"]+)"/)?.[1];
  assert.ok(description, `${locale.webLocale}: meta description`);
  assert.ok(description.length >= 20, `${locale.webLocale}: useful meta description`);
  if (locale.webLocale !== 'en') {
    assert.notEqual(description, englishDescription, `${locale.webLocale}: localized meta description`);
  }
  assert.ok(html.includes(`<meta property="og:description" content="${description}">`));
  assert.ok(html.includes(`<meta name="twitter:description" content="${description}">`));
  assertScreenshotMarkup(html, locale);
  assert.equal(updateHomepageScreenshots(html, locale, screenshotCopy), html, 'screenshot sync is idempotent');
  assert.equal((html.match(/<article class="feature-card/g) ?? []).length, 6);
  assert.match(html, /assets\/icons\/v1-603\/app-icon-v1-603\.png/);
  assert.match(html, /assets\/og-v1-603\.png/);
  assert.match(html, /<meta property="og:image:width" content="1024">/);
  assert.match(html, /<meta property="og:image:height" content="500">/);
  assert.doesNotMatch(html, /assets\/(?:screenshots|icons)\/v1-5-11\//);
  assert.doesNotMatch(html, /href="\/(?:sr\/|ru\/)?news\/"/);
  assert.match(html, new RegExp(`<html lang="${locale.hreflang}"${locale.dir === 'rtl' ? ' dir="rtl"' : ''}>`));
});

test('all 704 localized WebP variants match the approved release manifest, dimensions and hashes', async () => {
  assert.equal(screenshotManifest.complete, true);
  assert.equal(screenshotManifest.appVersion, '1.620');
  assert.equal(screenshotManifest.appVersionCode, 37);
  assert.equal(screenshotManifest.flavor, 'google');
  assert.equal(screenshotManifest.exactApkSha256, '99d2445b810a0449b6aa80ea6eb571252e7e12c2f38a05e4cc317954eeb31662');
  assert.equal(screenshotManifest.expectedOutputs, 704);
  assert.deepEqual(screenshotManifest.order, scenes);
  assert.deepEqual(screenshotCopy.scenes, scenes);
  validateScreenshotCopy(screenshotCopy, locales);
  assert.deepEqual(Object.keys(screenshotManifest.locales).sort(), locales.map(locale => locale.webLocale).sort());
  const urls = new Set();
  for (const locale of locales) {
    const entry = screenshotManifest.locales[locale.webLocale];
    assert.equal(entry.complete, true, locale.webLocale);
    assert.equal(entry.appLocale, locale.androidLocale);
    assert.deepEqual(entry.cards.map(card => card.scene), scenes);
    for (const [index, card] of entry.cards.entries()) {
      assert.equal(card.index, index + 1);
      assert.deepEqual({width: card.source.width, height: card.source.height}, {width: 1080, height: 1920});
      const copy = screenshotCopy.locales[locale.webLocale][card.scene];
      assert.equal(copy.title, normalize(card.caption.title));
      assert.equal(copy.subtitle, normalize(card.caption.subtitle));
      for (const width of [540, 1080]) {
        const variant = card.variants[width];
        const suffix = width === 540 ? '-540' : '';
        const url = `/assets/screenshots/v1-620/${locale.webLocale}/${String(card.index).padStart(2, '0')}-${card.scene}${suffix}.webp`;
        assert.equal(variant.url, url);
        assert.equal(urls.has(url), false, url);
        urls.add(url);
        const bytes = await fs.readFile(path.join(root, url.slice(1)));
        assert.deepEqual(webpDimensions(bytes), {width, height: width * 16 / 9}, url);
        assert.equal(variant.width, width, url);
        assert.equal(variant.height, width * 16 / 9, url);
        assert.equal(bytes.length, variant.bytes, url);
        assert.equal(createHash('sha256').update(bytes).digest('hex'), variant.sha256, url);
      }
    }
  }
  assert.equal(urls.size, 704);
  const actual = (await fs.readdir(path.join(root, 'assets/screenshots/v1-620'), {recursive: true}))
    .filter(file => file.endsWith('.webp')).map(file => `/assets/screenshots/v1-620/${file.replaceAll(path.sep, '/')}`);
  assert.deepEqual(actual.sort(), [...urls].sort(), 'no missing, duplicate or stale WebP variants');
});

test('approved icon and social assets retain their dimensions', async () => {
  const icon = await fs.readFile(path.join(root, 'assets', 'icons', 'v1-603', 'app-icon-v1-603.png'));
  assert.deepEqual(pngDimensions(icon), { width: 512, height: 512 });
  assert.deepEqual(await fs.readFile(path.join(root, 'assets', 'app-icon.png')), icon);
  const rootFavicon = await fs.readFile(path.join(root, 'favicon.ico'));
  assert.equal(rootFavicon.readUInt16LE(0), 0);
  assert.equal(rootFavicon.readUInt16LE(2), 1);
  assert.equal(rootFavicon.readUInt16LE(4), 4);
  const social = await fs.readFile(path.join(root, 'assets', 'og-v1-603.png'));
  assert.deepEqual(pngDimensions(social), { width: 1024, height: 500 });
});

test('homepage template, responsive layout and web manifest use the current release', async () => {
  const [template, css, manifest] = await Promise.all([
    fs.readFile(path.join(root, 'tools', 'templates', 'index.html'), 'utf8'),
    fs.readFile(path.join(root, 'styles.css'), 'utf8'),
    fs.readFile(path.join(root, 'site.webmanifest'), 'utf8')
  ]);
  assertScreenshotMarkup(template, locales.find(locale => locale.webLocale === 'en'));
  assert.equal(updateHomepageScreenshots(template, locales.find(locale => locale.webLocale === 'en'), screenshotCopy), template);
  assert.match(css, /\.screenshot-grid\s*\{[^}]*grid-template-columns:\s*repeat\(3, 1fr\)/);
  assert.match(css, /@media \(max-width: 980px\)[\s\S]*?\.screenshot-grid\s*\{[^}]*repeat\(2, 1fr\)/);
  assert.match(css, /@media \(max-width: 540px\)[\s\S]*?\.feature-grid, \.screenshot-grid\s*\{[^}]*grid-template-columns:\s*1fr/);
  assert.match(manifest, /assets\/icons\/v1-603\/app-icon-v1-603\.png/);
  assert.doesNotMatch(manifest, /v1-5-11/);
});

test('screenshot copy is escaped and syncing preserves unrelated homepage content', () => {
  const catalog = structuredClone(screenshotCopy);
  catalog.locales.en.converter = {title: 'Convert "prices" & <amounts>', subtitle: '</span><img src=x onerror="alert(1)">'};
  const locale = locales.find(locale => locale.webLocale === 'en');
  const changed = updateHomepageScreenshots(englishHomepage, locale, catalog);
  const copy = catalog.locales.en.converter;
  assert.ok(changed.includes(`alt="${escapeHtml(`${copy.title} ${copy.subtitle}`)}"`));
  assert.ok(changed.includes(`<strong>${escapeHtml(copy.title)}</strong><span>${escapeHtml(copy.subtitle)}</span>`));
  assert.equal((changed.match(/<img\b/g) || []).length, (englishHomepage.match(/<img\b/g) || []).length);
  assert.equal(updateHomepageScreenshots(changed, locale, catalog), changed);
  const maskScreenshots = html => html
    .replace(/(<div class="hero-visual"[^>]*>[\s\S]*?<figure\b[^>]*>\s*)<img\b[^>]*>/, '$1HERO_IMAGE')
    .replace(/<section class="section screenshots-section"[\s\S]*?<\/section>/, 'SCREENSHOT_SECTION');
  assert.equal(maskScreenshots(changed), maskScreenshots(englishHomepage));
});
