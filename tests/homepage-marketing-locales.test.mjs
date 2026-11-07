import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { updateHomepageMarketing, validateCopy } from '../tools/sync-homepage-marketing.mjs';

const root = path.resolve(import.meta.dirname, '..');
const { locales } = JSON.parse(await fs.readFile(path.join(root, 'site-locales.json'), 'utf8'));
const catalog = JSON.parse(await fs.readFile(path.join(root, 'tools/homepage-marketing-copy.json'), 'utf8'));

test('homepage marketing covers the complete site inventory with consistent access terms', () => {
  validateCopy(catalog, locales);
});

test('a language subset cannot pass the homepage publication check', () => {
  assert.throws(() => validateCopy({ en: catalog.en, ru: catalog.ru }, locales), /complete site locale inventory/);
  const broken = structuredClone(catalog);
  broken.en.details[1].text = broken.en.details[1].text.replace('24', '48');
  assert.throws(() => validateCopy(broken, locales), /allowance or BP amounts/);
});

for (const locale of locales) test(`${locale.webLocale}: published homepage has current localized marketing copy`, async () => {
  const file = path.join(root, locale.url.slice(1), 'index.html');
  const html = await fs.readFile(file, 'utf8');
  assert.equal(updateHomepageMarketing(html, catalog[locale.webLocale], locale), html,
    'a missing or stale translated block must fail before publication');
  for (const id of ['shopping', 'shopping-title', 'cart-title', 'google-play-access', 'access-title']) {
    assert.equal((html.match(new RegExp(`id="${id}"`, 'g')) ?? []).length, 1, `unique ${id}`);
  }
  assert.equal((html.match(/<details class="access-details">/g) ?? []).length, 1);
  if (locale.dir === 'rtl') {
    assert.match(html, /dir="rtl"/);
    assert.match(html, /<bdi dir="ltr">Google Play<\/bdi>/);
    assert.match(html, /<bdi dir="ltr">2 BP<\/bdi>/);
  }
});
