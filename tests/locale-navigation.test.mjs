import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { searchHreflang, skipLinkCopy, skipLinkLabel, updateGenericSkipLink,
  updateSearchAlternates } from '../tools/locale-navigation.mjs';
import { expectedSitemapUrls } from '../tools/sitemap-validation.mjs';

const root = path.resolve(import.meta.dirname, '..');
const manifest = JSON.parse(await fs.readFile(path.join(root, 'site-locales.json'), 'utf8'));
const webCopy = JSON.parse(await fs.readFile(path.join(root, 'tools/web-copy.json'), 'utf8'));
const origin = 'https://balkanconverter.com';
const fileFor = route => path.join(root, route.slice(1), route.endsWith('/') ? 'index.html' : '');
const alternates = markup => [...markup.matchAll(/<(?:xhtml:)?link\b[^>]*\brel="alternate"[^>]*>/g)]
  .map(([tag]) => ({ lang: tag.match(/\bhreflang="([^"]+)"/)?.[1], href: tag.match(/\bhref="([^"]+)"/)?.[1] }));

test('search language aliases preserve the separate BCP 47 locale identity', () => {
  assert.equal(searchHreflang('es-419'), 'es');
  for (const locale of ['es-ES', 'zh-Hans', 'zh-Hant', 'en', 'sr', 'x-default']) {
    assert.equal(searchHreflang(locale), locale);
  }
  const latinAmerica = manifest.locales.find(locale => locale.webLocale === 'es-419');
  assert.equal(latinAmerica.androidLocale, 'es-419');
  assert.equal(latinAmerica.hreflang, 'es-419');
  assert.equal(latinAmerica.url, '/es-419/');
});

test('repair changes only search alternate tags, including XML sitemap tags', () => {
  const languageLink = '<a href="/es-419/" hreflang="es-419" lang="es-419">Español</a>';
  const source = '<html lang="es-419"><head>' +
    '<meta name="description" content="es-419">' +
    '<link rel="alternate" hreflang="es-419" href="/es-419/">' +
    '<link rel="alternate" hreflang="es-ES" href="/es-es/">' +
    '<link rel="stylesheet" hreflang="es-419" href="styles.css">' +
    '</head><body>' + languageLink + '</body></html>';
  const repaired = updateSearchAlternates(source);
  assert.equal(repaired, source.replace('rel="alternate" hreflang="es-419"', 'rel="alternate" hreflang="es"'));
  assert.ok(repaired.includes(languageLink));
  assert.equal(updateSearchAlternates(repaired), repaired);
  assert.equal(updateSearchAlternates("<xhtml:link href='/es-419/' hreflang='es-419' rel='alternate' />"),
    "<xhtml:link href='/es-419/' hreflang='es' rel='alternate' />");
});

test('skip-navigation copy covers every locale without reusing an app CTA or English fallback', () => {
  assert.equal(manifest.locales.length, 44);
  assert.deepEqual(Object.keys(skipLinkCopy).sort(), manifest.locales.map(locale => locale.webLocale).sort());
  for (const { webLocale } of manifest.locales) {
    const label = skipLinkLabel(webLocale);
    assert.ok(label.trim());
    assert.doesNotMatch(label, /[<>&]|\uFFFD/);
    assert.notEqual(label, webCopy[webLocale].seeApp, webLocale);
    if (webLocale !== 'en') assert.notEqual(label, skipLinkCopy.en, webLocale);
  }
  assert.throws(() => skipLinkLabel('unsupported'), /Missing skip-navigation copy/);
});

test('skip-label repair preserves its target, attributes and surrounding product content', () => {
  const source = '<body><a class="skip-link" href="#main">Посмотреть приложение</a>' +
    '<main id="main"><a href="#screenshots">Посмотреть приложение</a></main></body>';
  assert.equal(updateGenericSkipLink(source, 'ru'), source.replace(
    '>Посмотреть приложение</a>', '>Перейти к содержанию</a>'));
  assert.throws(() => updateGenericSkipLink('<main id="main"></main>', 'ru'), /found 0/);
  assert.throws(() => updateGenericSkipLink(source.replace('#main', '#other'), 'ru'), /unexpected skip-link target/);
});

test('all 572 locale URLs have correct search alternates in the sitemap and applicable HTML heads', async () => {
  const urls = expectedSitemapUrls(manifest, origin, [], { includeNews: false });
  assert.equal(new Set(urls).size, 572);
  const sitemap = await fs.readFile(path.join(root, 'sitemap.xml'), 'utf8');
  const blocks = new Map([...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)]
    .map(([, block]) => [block.match(/<loc>([^<]+)<\/loc>/)?.[1], block]));
  const expectedLangs = [...manifest.locales.map(locale => searchHreflang(locale.webLocale)), 'x-default'].sort();
  let headCount = 0;
  for (const locale of manifest.locales) {
    const routes = [locale.url, locale.privacyUrl, locale.linksUrl, ...Object.values(locale.toolUrls),
      locale.updatesUrl, ...Object.values(locale.updateArticleUrls)];
    for (const route of routes) {
      const url = origin + route;
      const expectedSpanishUrl = `${origin}/es-419/${route.slice(locale.url.length)}`;
      const sitemapAlternates = alternates(blocks.get(url) ?? '');
      assert.deepEqual(sitemapAlternates.map(item => item.lang).sort(), expectedLangs, url);
      assert.equal(sitemapAlternates.find(item => item.lang === 'es')?.href, expectedSpanishUrl, url);
      const html = await fs.readFile(fileFor(route), 'utf8');
      assert.ok(html.includes(`<html lang="${locale.webLocale}"`), `${route}: original HTML language`);
      const head = html.match(/<head>([\s\S]*?)<\/head>/)?.[1];
      assert.ok(head, route);
      const headAlternates = alternates(head);
      if (locale.webLocale === 'en' && Object.values(locale.toolUrls).includes(route)) {
        // These eight existing English templates use the sitemap method.
        assert.equal(headAlternates.length, 0, route);
      } else {
        assert.deepEqual(headAlternates.map(item => item.lang).sort(), expectedLangs, route);
        assert.equal(headAlternates.find(item => item.lang === 'es')?.href, expectedSpanishUrl, route);
        headCount += 1;
      }
      assert.equal(updateSearchAlternates(html), html, route);
    }
  }
  assert.equal(headCount, 564);
});

test('all 176 generic page skip links use localized navigation labels and reach main', async () => {
  let count = 0;
  for (const locale of manifest.locales) {
    for (const route of [locale.url, locale.privacyUrl, locale.linksUrl, locale.updatesUrl]) {
      const html = await fs.readFile(fileFor(route), 'utf8');
      const links = [...html.matchAll(/<a class="skip-link" href="#main">([^<]+)<\/a>/g)];
      assert.equal(links.length, 1, route);
      assert.equal(links[0][1], skipLinkLabel(locale.webLocale), route);
      assert.match(html, /<main\b[^>]*\bid="main"/, route);
      count += 1;
    }
  }
  assert.equal(count, 176);
});
