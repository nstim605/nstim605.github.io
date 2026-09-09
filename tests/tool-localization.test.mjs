import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { resolveToolMessages } from '../tools/tool-localization-data.mjs';

const root = path.resolve(import.meta.dirname, '..');
const inventory = JSON.parse(await fs.readFile(path.join(root, 'site-locales.json'), 'utf8'));
const source = JSON.parse(await fs.readFile(path.join(root, 'tools/tool-localization-source.json'), 'utf8'));
const copy = JSON.parse(await fs.readFile(path.join(root, 'tools/tool-copy.json'), 'utf8'));
const overrides = JSON.parse(await fs.readFile(path.join(root, 'tools/tool-copy-overrides.json'), 'utf8'));
const replacements = JSON.parse(await fs.readFile(path.join(root, 'tools/tool-terminology-replacements.json'), 'utf8'));
const tools = [
  'currency-converter', 'exchange-rate-markup-calculator', 'multi-currency-converter',
  'offline-currency-converter', 'exchange-rate-history', 'currency-converter-widget',
  'foreign-transaction-fee-calculator', 'travel-budget-calculator'
];
const interactiveTools = new Set(tools.filter(slug =>
  !['offline-currency-converter', 'currency-converter-widget'].includes(slug)));
const protectedCopy = /Balkan Currency Converter|Balkan Converter|Google Play|Firebase Analytics|Frankfurter|Android|DCC|Dynamic Currency Conversion|https?:\/\/\S+/g;
const acceptableSharedTerms = /^(?:[A-Z]{3} — .+|Minimum|Maximum|Optional|Privacy|Widgets)$/u;

const routeFor = locale => locale.url === '/' ? '' : locale.url.slice(1, -1);
const urlFor = (locale, slug) => `/${routeFor(locale) ? `${routeFor(locale)}/` : ''}${slug}/`;
const expectedHreflangs = new Set([...inventory.locales.map(locale => locale.webLocale), 'x-default']);

test('production inventory contains 44 locale variants and eight tools', () => {
  assert.equal(inventory.locales.length, 44);
  assert.equal(tools.length, 8);
  assert.equal(inventory.locales.filter(locale => locale.webLocale !== 'en').length * tools.length, 344);
  assert.equal(inventory.locales.find(locale => locale.androidLocale === 'iw')?.webLocale, 'he');
  assert.equal(inventory.locales.find(locale => locale.androidLocale === 'in')?.webLocale, 'id');
});

test('translation catalog is complete, non-empty, and preserves placeholders', () => {
  const placeholders = value => [...value.matchAll(/\{[A-Za-z][A-Za-z0-9]*\}/g)].map(match => match[0]).sort();
  assert.equal(source.strings.length, 433);
  for (const locale of inventory.locales) {
    const rawMessages = copy.locales[locale.webLocale];
    assert.ok(rawMessages, `${locale.webLocale}: catalog missing`);
    assert.equal(Object.keys(rawMessages).length, source.strings.length, `${locale.webLocale}: incomplete catalog`);
    const messages = resolveToolMessages(locale.webLocale, rawMessages, overrides, replacements);
    for (const value of source.strings) {
      assert.ok(messages[value]?.trim(), `${locale.webLocale}: empty translation for ${value}`);
      assert.deepEqual(placeholders(messages[value]), placeholders(value), `${locale.webLocale}: placeholder mismatch for ${value}`);
      if (/^[,.;:!?]\s*/u.test(value)) {
        assert.match(messages[value], /^[,.;:!?،؛؟，。；：？！、]/u, `${locale.webLocale}: leading separator lost for ${value}`);
      }
      const translatableResidue = value.replace(protectedCopy, '').replace(/[\d\p{P}\p{S}\s]/gu, '');
      if (locale.webLocale !== 'en' && translatableResidue.length > 6 && !acceptableSharedTerms.test(value)) {
        assert.notEqual(messages[value], value, `${locale.webLocale}: untranslated source copy: ${value}`);
      }
    }
  }
});

test('translation catalogs contain no suspicious repeated long-copy values', () => {
  for (const locale of inventory.locales) {
    const buckets = new Map();
    for (const [sourceValue, translatedValue] of Object.entries(copy.locales[locale.webLocale])) {
      if (translatedValue.trim().length < 24) continue;
      const sources = buckets.get(translatedValue) ?? [];
      sources.push(sourceValue);
      buckets.set(translatedValue, sources);
    }
    for (const [translatedValue, sources] of buckets) {
      assert.ok(sources.length <= 3, `${locale.webLocale}: suspicious duplicate translation (${sources.length}×): ${translatedValue}`);
    }
  }
});

test('every localized tool page has correct language, direction, canonical, hreflang and shared scripts', async () => {
  for (const locale of inventory.locales.filter(locale => locale.webLocale !== 'en')) {
    const route = routeFor(locale);
    for (const slug of tools) {
      const file = path.join(root, route, slug, 'index.html');
      const html = await fs.readFile(file, 'utf8');
      assert.match(html, new RegExp(`<html lang="${locale.webLocale}"${locale.dir === 'rtl' ? ' dir="rtl"' : ''}>`), `${locale.webLocale}/${slug}: lang/dir`);
      assert.match(html, new RegExp(`rel="canonical" href="https://balkanconverter\\.com${urlFor(locale, slug).replaceAll('/', '\\/')}"`), `${locale.webLocale}/${slug}: canonical`);
      assert.equal((html.match(/rel="alternate" hreflang=/g) ?? []).length, 45, `${locale.webLocale}/${slug}: hreflang count`);
      assert.match(html, /hreflang="x-default" href="https:\/\/balkanconverter\.com\/[^"]*"/);
      const hreflangs = new Set([...html.matchAll(/rel="alternate" hreflang="([^"]+)"/g)].map(match => match[1]));
      assert.deepEqual(hreflangs, expectedHreflangs, `${locale.webLocale}/${slug}: complete hreflang set`);
      assert.match(html, /src="\.\.\/\.\.\/script\.js"/, `${locale.webLocale}/${slug}: shared site script`);
      assert.doesNotMatch(html, /src="\.\/[^\"]+\.js"/, `${locale.webLocale}/${slug}: copied script path`);
      assert.match(html, new RegExp(`href="${urlFor(locale, 'currency-converter').replaceAll('/', '\\/')}"`));
      if (interactiveTools.has(slug)) {
        assert.match(html, new RegExp(`src="\\.\\.\\/\\.\\.\\/${slug}\\/[^\"]+\\.js"`), `${locale.webLocale}/${slug}: shared calculator script`);
        const i18n = html.match(/<script id="tool-i18n" type="application\/json">([\s\S]*?)<\/script>/)?.[1];
        assert.ok(i18n, `${locale.webLocale}/${slug}: runtime catalog missing`);
        assert.doesNotThrow(() => JSON.parse(i18n), `${locale.webLocale}/${slug}: invalid runtime catalog`);
      }
      for (const jsonText of [...html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => match[1])) {
        const data = JSON.parse(jsonText);
        for (const key of ['url', 'mainEntityOfPage']) {
          if (typeof data[key] === 'string' && data[key].includes(`/${slug}/`)) {
            assert.equal(data[key], `https://balkanconverter.com${urlFor(locale, slug)}`, `${locale.webLocale}/${slug}: JSON-LD ${key}`);
          }
        }
      }
    }
  }
});

test('localized homepages and tool navigation preserve locale routes', async () => {
  for (const locale of inventory.locales.filter(locale => locale.webLocale !== 'en')) {
    const route = routeFor(locale);
    const home = await fs.readFile(path.join(root, route, 'index.html'), 'utf8');
    for (const slug of tools.filter(slug => slug !== 'offline-currency-converter')) {
      assert.match(home, new RegExp(`href="${urlFor(locale, slug).replaceAll('/', '\\/')}"`), `${locale.webLocale}: ${slug}`);
    }
    const navigation = home.match(/<div class="tool-promo-actions">([\s\S]*?)<\/div>/)?.[1];
    assert.ok(navigation, `${locale.webLocale}: tool navigation missing`);
    const links = [...navigation.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
    assert.equal(links.length, 7, `${locale.webLocale}: tool navigation item count`);
    assert.ok(links.slice(0, -1).every(link => /<span aria-hidden="true">→<\/span>/.test(link[2])), `${locale.webLocale}: intermediate arrow missing`);
    assert.match(links.at(-1)?.[2] ?? '', /<span aria-hidden="true">→<\/span>/, `${locale.webLocale}: final arrow markup missing`);
  }
});

test('localized tool pages resolve local assets and include one consent template', async () => {
  for (const locale of inventory.locales.filter(locale => locale.webLocale !== 'en')) {
    for (const slug of tools) {
      const file = path.join(root, routeFor(locale), slug, 'index.html');
      const html = await fs.readFile(file, 'utf8');
      assert.equal((html.match(/<template id="analytics-consent-template">/g) ?? []).length, 1, `${locale.webLocale}/${slug}: consent template count`);
      for (const reference of [...html.matchAll(/(?:href|src)="(\.\.\/\.\.\/[^"#?]+)"/g)].map(match => match[1])) {
        const target = path.resolve(path.dirname(file), reference);
        await assert.doesNotReject(fs.access(target), `${locale.webLocale}/${slug}: missing asset ${reference}`);
      }
    }
  }
});

test('sitemap contains all 440 locale/page URLs once with complete alternates', async () => {
  const sitemap = await fs.readFile(path.join(root, 'sitemap.xml'), 'utf8');
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  assert.equal(locations.length, 440);
  assert.equal(new Set(locations).size, locations.length);
  for (const locale of inventory.locales) {
    for (const slug of tools) assert.ok(locations.includes(`https://balkanconverter.com${urlFor(locale, slug)}`));
  }
  for (const block of sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    assert.equal((block[1].match(/<xhtml:link rel="alternate"/g) ?? []).length, 45);
  }
});

test('localized directories contain no duplicated calculator JavaScript', async () => {
  for (const locale of inventory.locales.filter(locale => locale.webLocale !== 'en')) {
    for (const slug of tools) {
      const entries = await fs.readdir(path.join(root, routeFor(locale), slug));
      assert.deepEqual(entries, ['index.html']);
    }
  }
});
