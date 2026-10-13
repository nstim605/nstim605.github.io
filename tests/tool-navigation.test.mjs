import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const menuSlugs = [
  'currency-converter',
  'exchange-rate-markup-calculator',
  'multi-currency-converter',
  'exchange-rate-history',
  'currency-converter-widget',
  'foreign-transaction-fee-calculator',
  'travel-budget-calculator'
];
const toolPages = [...menuSlugs.slice(0, 3), 'offline-currency-converter', ...menuSlugs.slice(3)];
const expectedHrefs = menuSlugs.map(slug => `/${slug}/`);

function linksIn(html, className) {
  const block = html.match(new RegExp(`<nav class="${className}"[^>]*>([\\s\\S]*?)<\\/nav>`))?.[1] ?? '';
  return [...block.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>/g)].map(match => match[1]);
}

test('homepage replaces the large tools block with a compact header menu', async () => {
  const [home, styles, script] = await Promise.all([
    fs.readFile(path.join(root, 'index.html'), 'utf8'),
    fs.readFile(path.join(root, 'styles.css'), 'utf8'),
    fs.readFile(path.join(root, 'script.js'), 'utf8')
  ]);

  assert.doesNotMatch(home, /tool-promo|tool-promo-actions/);
  assert.match(home, /<details class="tools-menu">\s*<summary>Tools<\/summary>/);
  assert.deepEqual(linksIn(home, 'tools-menu-panel'), expectedHrefs);
  assert.match(styles, /\.tools-menu-panel\s*\{[^}]*position:\s*absolute;/);
  assert.match(styles, /@media \(max-width:\s*980px\)[\s\S]*\.tools-menu-panel\s*\{[^}]*position:\s*fixed;/);
  assert.match(script, /event\.key !== 'Escape'/);
  assert.match(script, /openMenu\.querySelector\('summary'\)\?\.focus\(\)/);
});

test('localized desktop header labels stay on one line and collapse before they crowd', async () => {
  const styles = await fs.readFile(path.join(root, 'styles.css'), 'utf8');

  assert.match(styles, /\.brand\s*\{[^}]*flex:\s*0 0 auto;[^}]*white-space:\s*nowrap;/);
  assert.match(styles, /\.nav-links a\s*\{[^}]*font-size:\s*\.95rem;[^}]*white-space:\s*nowrap;/);
  assert.match(styles, /\.nav-actions\s*\{[^}]*flex:\s*0 0 auto;/);
  assert.match(styles, /\.tools-menu summary\s*\{[^}]*white-space:\s*nowrap;/);
  assert.match(styles, /@media \(max-width:\s*1230px\)[\s\S]*?\.nav-links\s*\{[^}]*display:\s*none;/);
});

test('tool pages retain crawlable header and secondary navigation', async () => {
  for (const slug of toolPages) {
    const html = await fs.readFile(path.join(root, slug, 'index.html'), 'utf8');
    assert.match(html, /assets\/icons\/v1-603\/app-icon-v1-603\.png/, `${slug}: current app icon`);
    assert.doesNotMatch(html, /assets\/icons\/v1-5-11\//, `${slug}: no legacy icon assets`);
    assert.deepEqual(linksIn(html, 'tools-menu-panel'), expectedHrefs, `${slug}: header menu`);
    const related = linksIn(html, 'related-tools shell');
    assert.equal(related.length, menuSlugs.includes(slug) ? 6 : 7, `${slug}: related links`);
    assert.ok(related.every(href => expectedHrefs.includes(href)), `${slug}: known related routes`);
    if (menuSlugs.includes(slug)) {
      assert.match(html, new RegExp(`href="/${slug}/" aria-current="page"`), `${slug}: current page`);
      assert.ok(!related.includes(`/${slug}/`), `${slug}: current page omitted from related links`);
    }
  }
});
