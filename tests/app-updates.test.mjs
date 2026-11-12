import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const readJson = async file => JSON.parse(await fs.readFile(path.join(root, file), 'utf8'));
const manifest = await readJson('site-locales.json');
const archive = await readJson('tools/app-news-archive.json');
const release = await readJson('tools/app-news-release-1.620.json');
const current = await readJson('updates/data/app-news.json');
const semanticHash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;');

test('all 44 update feeds prepend the frozen Google release and preserve published history', () => {
  // Published site ebe8bde and the approved 2026-11-10 release snapshot, respectively.
  assert.equal(semanticHash(archive), 'c050a60e45ce415ec077c939b4f44393fa30af543d0d1396eda57c25d6360766');
  assert.equal(semanticHash(release), 'd68ac944623f3b01d54a9a5a745059ba410c91a89c17eaa573e0870948557835');
  assert.equal(manifest.locales.length, 44);
  assert.deepEqual(Object.keys(current).sort(), manifest.locales.map(locale => locale.hreflang).sort());
  for (const locale of manifest.locales) {
    const news = current[locale.hreflang];
    const first = news.cards[0];
    const copy = release[locale.androidLocale];
    assert.equal(first.version, '1.620', locale.hreflang);
    assert.equal(first.versionCode, 37, locale.hreflang);
    assert.equal(first.statusLabel, 'Google Play · 1.620', locale.hreflang);
    assert.equal(first.published, true, locale.hreflang);
    assert.equal(first.title, copy.title, locale.hreflang);
    assert.deepEqual(first.bullets, copy.bullets, locale.hreflang);
    assert.equal(first.bullets.length, 4, locale.hreflang);
    assert.deepEqual({title: news.title, cards: news.cards.slice(1)}, archive[locale.hreflang], locale.hreflang);
  }
});

test('all update indexes render the localized release first with locale-preserving navigation and direction', async () => {
  for (const locale of manifest.locales) {
    const html = await fs.readFile(path.join(root, locale.updatesUrl.slice(1), 'index.html'), 'utf8');
    const first = html.match(/<article class="app-update-card"[^>]*>([\s\S]*?)<\/article>/)?.[1];
    assert.ok(first, locale.hreflang);
    assert.ok(first.includes('Google Play · 1.620'), locale.hreflang);
    assert.doesNotMatch(first, /AppGallery|Huawei/i);
    assert.ok(first.includes(`<h2>${escape(release[locale.androidLocale].title)}</h2>`), locale.hreflang);
    assert.deepEqual([...first.matchAll(/<li>([\s\S]*?)<\/li>/g)].map(match => match[1]),
      release[locale.androidLocale].bullets.map(escape), locale.hreflang);
    assert.ok(html.includes(`<html lang="${locale.hreflang}"${['ar', 'he', 'fa', 'ur'].includes(locale.hreflang) ? ' dir="rtl"' : ''}>`));
    assert.ok(html.includes(`href="https://balkanconverter.com${locale.updatesUrl}"`));
    assert.ok(html.includes(`href="https://balkanconverter.com${locale.updateArticleUrls['version-1-604']}"`));
    assert.ok(html.includes(`href="${locale.url}"`));
    assert.equal((html.match(/data-app-feature=/g) || []).length, archive[locale.hreflang].cards.length + 1);
  }
});

test('current-news-only generation needs no Android checkout and preserves archives, homepages and other sitemap entries', async t => {
  const temporaryRoot = path.resolve(os.tmpdir());
  const fixture = await fs.mkdtemp(path.join(temporaryRoot, 'balco-app-updates-'));
  t.after(async () => {
    const relative = path.relative(temporaryRoot, path.resolve(fixture));
    assert.ok(relative.startsWith('balco-app-updates-') && !relative.includes(path.sep));
    await fs.rm(fixture, {recursive: true, force: true});
  });
  const protectedFiles = ['site-locales.json', 'updates/data/releases.json',
    ...manifest.locales.flatMap(locale => [path.join(locale.url.slice(1), 'index.html'),
      path.join(locale.updateArticleUrls['version-1-604'].slice(1), 'index.html')])];
  const inputs = [...protectedFiles, 'sitemap.xml', ...[
    'app-news.mjs', 'app-news-archive.json', 'app-news-release-1.620.json',
    'generate-updates-locales.mjs', 'locale-navigation.mjs', 'store-links.mjs'
  ].map(file => path.join('tools', file))];
  const before = new Map();
  for (const file of inputs) {
    const bytes = await fs.readFile(path.join(root, file));
    before.set(file, bytes);
    await fs.mkdir(path.dirname(path.join(fixture, file)), {recursive: true});
    await fs.writeFile(path.join(fixture, file), bytes);
  }
  const run = () => execFileSync(process.execPath, ['tools/generate-updates-locales.mjs', '--current-news-only'], {
    cwd: fixture, env: {...process.env, ANDROID_SOURCE_ROOT: path.join(fixture, 'absent-android-checkout')}, encoding: 'utf8'
  });
  assert.match(run(), /Generated 44 current update pages/);
  for (const file of protectedFiles) assert.deepEqual(await fs.readFile(path.join(fixture, file)), before.get(file), file);
  const sitemap = await fs.readFile(path.join(fixture, 'sitemap.xml'), 'utf8');
  const blocks = markup => new Map([...markup.matchAll(/<url>[\s\S]*?<\/url>/g)]
    .map(([block]) => [block.match(/<loc>([^<]+)<\/loc>/)[1], block]));
  const originalBlocks = blocks(before.get('sitemap.xml').toString('utf8'));
  const currentUrls = new Set(manifest.locales.map(locale => `https://balkanconverter.com${locale.updatesUrl}`));
  assert.equal(blocks(sitemap).size, originalBlocks.size);
  for (const [url, block] of blocks(sitemap)) {
    if (currentUrls.has(url)) {
      assert.ok(block.includes('<lastmod>2026-11-12</lastmod>'), url);
      assert.equal(block.replace(/<lastmod>[^<]+<\/lastmod>/, ''), originalBlocks.get(url).replace(/<lastmod>[^<]+<\/lastmod>/, ''), url);
    } else assert.equal(block, originalBlocks.get(url), url);
  }
  const outputs = ['sitemap.xml', 'updates/data/app-news.json',
    ...manifest.locales.map(locale => path.join(locale.updatesUrl.slice(1), 'index.html'))];
  const firstRun = new Map(await Promise.all(outputs.map(async file => [file, await fs.readFile(path.join(fixture, file))])));
  run();
  for (const file of outputs) assert.deepEqual(await fs.readFile(path.join(fixture, file)), firstRun.get(file), file);
});
