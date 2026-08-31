import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { refreshVisuals } from '../tools/refresh-home-visuals.mjs';

const root = path.resolve(import.meta.dirname, '..');
const locales = JSON.parse(await fs.readFile(path.join(root, 'site-locales.json'), 'utf8')).locales;
const attribute = (tag, name) => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
const screens = ['main-converter', 'main-converter', 'actual-cost', 'travel-board', 'saved-sets'];
const approvedRelease = JSON.parse(await fs.readFile(path.join(root, 'tools/active-release-manifest.json'), 'utf8'));
// User-approved B frame exports retain lossless pixels. Keep explicit budgets
// per responsive width plus exact approved hashes; never recompress on publish.
const screenshotBudgets = { '540w': 130000, '810w': 260000, '1080w': 400000 };

for (const locale of locales) test(`${locale.webLocale}: current responsive screenshot and branding references`, async () => {
  const file = path.join(root, locale.url === '/' ? 'index.html' : `${locale.url.slice(1)}index.html`);
  const html = await fs.readFile(file, 'utf8');
  const tags = [...html.matchAll(/<img\b[^>]*>/g)].map(match => match[0]);
  const screenshots = tags.filter(tag => tag.includes('/screenshots/'));
  assert.equal(screenshots.length, 5);
  assert.equal(refreshVisuals(html), html, 'visual update is idempotent');
  for (const [index, tag] of screenshots.entries()) {
    assert.equal(attribute(tag, 'src'), `/assets/screenshots/v1-5-11/${screens[index]}-540.webp`);
    assert.equal(attribute(tag, 'width'), '1080');
    assert.equal(attribute(tag, 'height'), '1884');
    // A complete Chinese label can be only four characters long.
    assert.ok(attribute(tag, 'alt')?.trim().length > 0);
    assert.doesNotMatch(attribute(tag, 'alt'), /1\.4/);
    assert.ok(attribute(tag, 'sizes'));
    const candidates = attribute(tag, 'srcset').split(', ');
    assert.equal(candidates.length, 3);
    for (const candidate of candidates) {
      const [url, width] = candidate.split(' ');
      assert.match(width, /^(540|810|1080)w$/);
      const bytes = await fs.readFile(path.join(root, url.slice(1)));
      assert.ok(bytes.length > 1000 && bytes.length <= screenshotBudgets[width]);
      const approved = approvedRelease.visual_assets[url.slice(1)];
      assert.equal(bytes.length, approved.size);
      assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), approved.sha256);
    }
    if (index === 0) {
      assert.equal(attribute(tag, 'fetchpriority'), 'high');
      assert.notEqual(attribute(tag, 'loading'), 'lazy');
    } else assert.equal(attribute(tag, 'loading'), 'lazy');
  }
  for (const key of ['og:image', 'twitter:image']) {
    assert.match(html, new RegExp(`<meta (?:property|name)="${key}" content="https://balkanconverter.com/assets/og-v1-5-11.png">`));
  }
  for (const size of [32, 48, 96]) {
    assert.equal((html.match(new RegExp(`sizes="${size}x${size}"`, 'g')) ?? []).length, 1);
  }
  assert.ok(html.includes('icons/v1-5-11/apple-touch-icon-180.png'));
  assert.doesNotMatch(html, /assets\/(?:app-icon\.png|og\.png|balkan-converter-og-1200x630\.png)/);
  assert.match(html, new RegExp(`<html lang="${locale.hreflang}"${locale.dir === 'rtl' ? ' dir="rtl"' : ''}>`));
});

test('approved icon pixels and protected policy compatibility alias are identical', async () => {
  const approved = await fs.readFile(path.join(root, 'assets/icons/v1-5-11/app-icon-v1-5-11.png'));
  assert.equal(crypto.createHash('sha256').update(approved).digest('hex'),
    '85826126bfbe45d1f5331376ee40f47cd09cd3a34b262f9dc3dd12682efc50ab');
  assert.deepEqual(await fs.readFile(path.join(root, 'assets/app-icon.png')), approved);
});

test('homepage template stays version-neutral and directly localizable', async () => {
  const template = await fs.readFile(path.join(root, 'tools/templates/index.html'), 'utf8');
  const generator = await fs.readFile(path.join(root, 'tools/localize-site.mjs'), 'utf8');
  assert.doesNotMatch(template, /Balkan Currency Converter 1\.4/);
  assert.ok(template.includes('main conversion screen showing euros and Serbian dinars'));
  assert.ok(generator.includes('main conversion screen showing euros and Serbian dinars'));
  assert.equal(refreshVisuals(template), template);
});
