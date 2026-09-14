import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const inventory = JSON.parse(await fs.readFile(path.join(root, 'site-locales.json'), 'utf8'));
const copy = JSON.parse(await fs.readFile(path.join(root, 'tools', 'homepage-link-copy.json'), 'utf8'));
const englishSource = 'Learn how offline rates work';

const localeKeys = inventory.locales.map(locale => locale.webLocale);

test('offline-guide catalog exactly covers the production locale inventory', () => {
  assert.deepEqual(Object.keys(copy).sort(), [...localeKeys].sort());
  assert.equal(copy.en.offlineGuide, englishSource);
});

for (const locale of inventory.locales) test(`${locale.webLocale}: homepage offline guide is localized and locale-preserving`, async () => {
  const file = locale.url === '/' ? 'index.html' : `${locale.url.slice(1)}index.html`;
  const html = await fs.readFile(path.join(root, file), 'utf8');
  const expectedHref = locale.toolUrls['offline-currency-converter'];
  const cards = [...html.matchAll(/<article class="feature-card">([\s\S]*?)<\/article>/g)].map(match => match[1]);
  const matchingCards = cards.filter(card => card.includes(`href="${expectedHref}"`));

  assert.equal(matchingCards.length, 1, 'offline guide must occur in exactly one intact feature card');
  const links = [...matchingCards[0].matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)];
  assert.equal(links.length, 1, 'offline feature card must contain exactly one link');
  assert.match(links[0][1], /\bclass="text-link"/);
  assert.match(links[0][1], new RegExp(`\\bhref="${expectedHref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));

  const text = links[0][2].replace(/<[^>]+>/g, '').trim();
  assert.ok(text.length > 0);
  assert.equal(text, copy[locale.webLocale].offlineGuide);
  assert.match(matchingCards[0], /<\/a>\.<\/p>/, 'sentence punctuation and card markup must remain intact');
  if (locale.webLocale !== 'en') assert.notEqual(text, englishSource);
});
