import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const manifest = JSON.parse(await fs.readFile(path.join(root, 'site-locales.json'), 'utf8'));
const copy = JSON.parse(await fs.readFile(path.join(root, 'tools', 'links-copy.json'), 'utf8'));
const directory = JSON.parse(await fs.readFile(path.join(root, 'tools', 'external-links.json'), 'utf8'));
const sitemap = await fs.readFile(path.join(root, 'sitemap.xml'), 'utf8');
const appsApkUrl = 'https://www.appsapk.com/';

function fileForUrl(url) {
  return path.join(root, url.replace(/^\//, ''), 'index.html');
}

test('external links use a small future-friendly data list with the official AppsApk URL', () => {
  assert.deepEqual(directory.links[0], {
    name: 'AppsApk',
    url: appsApkUrl,
    descriptionKey: 'androidAppDirectory'
  });
});

test('all locale variants expose an indexable links page with localized SEO and navigation', async () => {
  assert.equal(manifest.locales.length, 44);
  for (const locale of manifest.locales) {
    const html = await fs.readFile(fileForUrl(locale.linksUrl), 'utf8');
    const localeCopy = copy[locale.webLocale];
    assert.ok(localeCopy, `${locale.webLocale}: copy missing`);
    assert.match(html, new RegExp(`<html lang="${locale.webLocale}"${locale.dir === 'rtl' ? ' dir="rtl"' : ''}>`));
    assert.match(html, new RegExp(`<title>${localeCopy.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\| BALCO Converter<\\/title>`));
    assert.match(html, new RegExp(`rel="canonical" href="https://balkanconverter\\.com${locale.linksUrl.replaceAll('/', '\\/')}"`));
    assert.equal((html.match(/rel="alternate" hreflang=/g) ?? []).length, 45, locale.webLocale);
    assert.match(html, /<meta name="description" content="[^"]+">/);
    assert.doesNotMatch(html, /noindex/i);
    assert.match(html, new RegExp(`href="${locale.linksUrl.replaceAll('/', '\\/')}" aria-current="page"`));
    assert.match(html, new RegExp(`<h1>${localeCopy.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<\\/h1>`));
  }
});

test('AppsApk backlink is crawlable and contains no nofollow or sponsored relation', async () => {
  for (const locale of manifest.locales) {
    const html = await fs.readFile(fileForUrl(locale.linksUrl), 'utf8');
    const anchor = html.match(/<a class="text-link"[^>]*>[^<]+<span aria-hidden="true">→<\/span><\/a>/)?.[0];
    assert.ok(anchor, `${locale.webLocale}: AppsApk anchor missing`);
    assert.match(anchor, new RegExp(`href="${appsApkUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));
    assert.doesNotMatch(anchor, /rel="[^"]*(?:nofollow|sponsored)/i);
  }
});

test('footer links point to the locale page while the main header does not promote it', async () => {
  for (const locale of manifest.locales) {
    const homeFile = locale.url === '/' ? path.join(root, 'index.html') : path.join(root, locale.url.slice(1), 'index.html');
    const home = await fs.readFile(homeFile, 'utf8');
    const header = home.match(/<header class="site-header">[\s\S]*?<\/header>/)?.[0] ?? '';
    const footer = home.match(/<footer class="site-footer">[\s\S]*?<\/footer>/)?.[0] ?? '';
    assert.doesNotMatch(header, new RegExp(`href="${locale.linksUrl.replaceAll('/', '\\/')}"`), `${locale.webLocale}: header link`);
    assert.match(footer, new RegExp(`href="${locale.linksUrl.replaceAll('/', '\\/')}"`), `${locale.webLocale}: footer link`);
  }
});

test('sitemap contains each localized links URL exactly once', () => {
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  for (const locale of manifest.locales) {
    const expected = `https://balkanconverter.com${locale.linksUrl}`;
    assert.equal(locations.filter(url => url === expected).length, 1, locale.webLocale);
  }
});
