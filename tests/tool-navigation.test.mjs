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

function fileForUrl(url) {
  const pathname = new URL(url, 'https://balkanconverter.com').pathname;
  return pathname.endsWith('/')
    ? path.join(root, ...pathname.slice(1).split('/').filter(Boolean), 'index.html')
    : path.join(root, ...pathname.slice(1).split('/'));
}

test('homepage keeps tool routes but hides their header menu', async () => {
  const [home, styles, script] = await Promise.all([
    fs.readFile(path.join(root, 'index.html'), 'utf8'),
    fs.readFile(path.join(root, 'styles.css'), 'utf8'),
    fs.readFile(path.join(root, 'script.js'), 'utf8')
  ]);

  assert.doesNotMatch(home, /tool-promo|tool-promo-actions/);
  assert.match(home, /<details class="tools-menu">\s*<summary>Tools<\/summary>/);
  assert.deepEqual(linksIn(home, 'tools-menu-panel'), expectedHrefs);
  assert.match(styles, /\.site-header \.tools-menu\s*\{[^}]*display:\s*none;/);
  assert.match(styles, /\.tools-menu-panel\s*\{[^}]*position:\s*absolute;/);
  assert.match(styles, /@media \(max-width:\s*980px\)[\s\S]*\.tools-menu-panel\s*\{[^}]*position:\s*fixed;/);
  assert.match(script, /event\.key !== 'Escape'/);
  assert.match(script, /openMenu\.querySelector\('summary'\)\?\.focus\(\)/);
});

test('mobile header exposes the primary navigation without horizontal button crowding', async () => {
  const [home, styles, script] = await Promise.all([
    fs.readFile(path.join(root, 'index.html'), 'utf8'),
    fs.readFile(path.join(root, 'styles.css'), 'utf8'),
    fs.readFile(path.join(root, 'script.js'), 'utf8')
  ]);
  assert.deepEqual(linksIn(home, 'mobile-nav-menu-panel'), ['#features', '#screenshots', '/updates/', 'privacy-policy.html']);
  assert.match(home, /<details class="mobile-nav-menu">\s*<summary aria-label="Main navigation"><span aria-hidden="true">☰<\/span><\/summary>/);
  assert.match(styles, /\.mobile-nav-menu\s*\{[^}]*display:\s*none;/);
  assert.match(styles, /@media \(max-width:\s*1230px\)[\s\S]*?\.mobile-nav-menu\s*\{[^}]*display:\s*block;/);
  assert.match(styles, /@media \(max-width:\s*540px\)[\s\S]*?\.brand span\s*\{[^}]*display:\s*none;/);
  assert.match(styles, /@media \(max-width:\s*420px\)[\s\S]*?\.nav-wrap, \.nav-actions\s*\{[^}]*gap:\s*7px;/);
  assert.match(script, /\.mobile-nav-menu, \.tools-menu, \.language-selector/);
  assert.match(script, /event\.target\.closest\('a'\)/);
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
    assert.deepEqual(linksIn(html, 'nav-links'), ['/#features', '/#screenshots', '/privacy-policy.html'], `${slug}: consistent primary navigation`);
    assert.match(html, /<details class="language-selector">/, `${slug}: language selector`);
    assert.match(html, /<a class="play-link play-link-small"/, `${slug}: Google Play action`);
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

test('every localized tool page uses the same locale-level header actions', async () => {
  const manifest = JSON.parse(await fs.readFile(path.join(root, 'site-locales.json'), 'utf8'));

  for (const locale of manifest.locales) {
    const homePath = new URL(locale.url, 'https://balkanconverter.com').pathname;
    const directory = homePath === '/' ? root : path.join(root, homePath.slice(1, -1));
    const expectedPrimaryLinks = [`${homePath}#features`, `${homePath}#screenshots`, locale.privacyUrl];
    const home = await fs.readFile(path.join(directory, 'index.html'), 'utf8');

    assert.deepEqual(linksIn(home, 'mobile-nav-menu-panel'), [
      '#features',
      '#screenshots',
      locale.updatesUrl,
      path.basename(locale.privacyUrl)
    ], `${locale.webLocale}: mobile homepage navigation`);

    for (const slug of toolPages) {
      const html = await fs.readFile(path.join(directory, slug, 'index.html'), 'utf8');
      assert.deepEqual(linksIn(html, 'nav-links'), expectedPrimaryLinks, `${locale.webLocale}/${slug}: primary navigation`);
      assert.deepEqual(linksIn(html, 'mobile-nav-menu-panel'), expectedPrimaryLinks, `${locale.webLocale}/${slug}: mobile primary navigation`);
      assert.match(html, /<details class="tools-menu">/, `${locale.webLocale}/${slug}: Tools action`);
      assert.match(html, /<details class="language-selector">/, `${locale.webLocale}/${slug}: language action`);
      assert.match(html, /<button class="theme-toggle"/, `${locale.webLocale}/${slug}: theme action`);
      assert.match(html, /<a class="play-link play-link-small"/, `${locale.webLocale}/${slug}: Google Play action`);
    }
  }
});

test('privacy and links pages keep the complete locale-level site header', async () => {
  const manifest = JSON.parse(await fs.readFile(path.join(root, 'site-locales.json'), 'utf8'));

  for (const locale of manifest.locales) {
    const expectedPrimaryLinks = [`${locale.url}#features`, `${locale.url}#screenshots`, locale.privacyUrl];
    const expectedToolLinks = menuSlugs.map(slug => locale.toolUrls[slug]);

    for (const pageUrl of [locale.privacyUrl, locale.linksUrl]) {
      const html = await fs.readFile(fileForUrl(pageUrl), 'utf8');
      assert.deepEqual(linksIn(html, 'nav-links'), expectedPrimaryLinks, `${pageUrl}: desktop primary navigation`);
      assert.deepEqual(linksIn(html, 'mobile-nav-menu-panel'), expectedPrimaryLinks, `${pageUrl}: mobile primary navigation`);
      assert.deepEqual(linksIn(html, 'tools-menu-panel'), expectedToolLinks, `${pageUrl}: Tools navigation`);
      assert.match(html, /<details class="language-selector">/, `${pageUrl}: language action`);
      assert.match(html, /<button class="theme-toggle"/, `${pageUrl}: theme action`);
      assert.match(html, /<a class="play-link play-link-small"/, `${pageUrl}: Google Play action`);
      assert.match(html, /assets\/icons\/v1-603\/app-icon-v1-603\.png/, `${pageUrl}: current app icon`);
      assert.doesNotMatch(html, /<a href="#(?:features|screenshots)">/, `${pageUrl}: no broken local section links`);
    }
  }
});
