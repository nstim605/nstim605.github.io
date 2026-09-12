import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');

test('tool navigation renders arrows for every link except the last one', async () => {
  const [home, styles] = await Promise.all([
    fs.readFile(path.join(root, 'index.html'), 'utf8'),
    fs.readFile(path.join(root, 'styles.css'), 'utf8')
  ]);
  const navigation = home.match(/<div class="tool-promo-actions">([\s\S]*?)<\/div>/)?.[1];
  assert.ok(navigation, 'tool navigation should exist');

  const links = [...navigation.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
  assert.equal(links.length, 7);
  assert.deepEqual(links.map((link) => link[1]), [
    '/currency-converter/',
    '/exchange-rate-markup-calculator/',
    '/multi-currency-converter/',
    '/exchange-rate-history/',
    '/currency-converter-widget/',
    '/foreign-transaction-fee-calculator/',
    '/travel-budget-calculator/'
  ]);
  assert.match(links.at(-1)?.[2] ?? '', /^Travel budget calculator\s*<span aria-hidden="true">→<\/span>$/);
  assert.ok(links.slice(0, -1).every((link) => /<span aria-hidden="true">→<\/span>/.test(link[2])));
  assert.match(styles, /\.tool-promo-actions\s*>\s*a:last-child\s*>\s*\[aria-hidden="true"\]\s*\{\s*display:\s*none;\s*\}/);
  assert.match(styles, /\.tool-promo\s*>\s*div\s*\{[^}]*min-width:\s*0;/);
  assert.match(styles, /\.tool-promo\s+h2\s*\{[^}]*overflow-wrap:\s*anywhere;/);
  assert.match(styles, /\.tool-promo-actions\s*\{[^}]*flex-wrap:\s*wrap;/);
  assert.match(styles, /\.tool-promo-actions\s*\{[^}]*min-width:\s*0;/);
  assert.doesNotMatch(styles, /\.tool-promo-actions\s*\{[^}]*flex-shrink:\s*0;/);
  assert.match(styles, /\.tool-promo-actions\s*>\s*a\s*\{[^}]*max-width:\s*100%;[^}]*white-space:\s*normal;/);
});
