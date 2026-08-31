import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const manifest = JSON.parse(await fs.readFile(path.join(root, 'site-locales.json'), 'utf8'));
const inventory = JSON.parse(await fs.readFile(path.join(root, 'tools', 'production-strings.json'), 'utf8'));
const androidRoot = path.resolve(process.env.ANDROID_SOURCE_ROOT || path.join(root, '..'));
const config = await fs.readFile(path.join(androidRoot, 'app', 'src', 'main', 'res', 'xml', 'locales_config.xml'), 'utf8');
const android = [...config.matchAll(/android:name="([^"]+)"/g)].map(match => match[1]);
const web = manifest.locales.map(locale => locale.androidLocale);
const errors = [];
const warnings = [];
const pages = new Map();
const expectedHreflangs = manifest.locales.map(locale => locale.hreflang);
const intentionalEnglish = new Set(['Balkan Currency Converter', 'Google Play', '© 2026 Balkan Currency Converter',
  'Google Privacy Policy', 'Google Analytics', 'Google advertising policies', 'google_play_click']);

if (android.length !== 44) errors.push(`Expected 44 Android locales, found ${android.length}`);
if (JSON.stringify(android) !== JSON.stringify(web)) errors.push(`Locale mismatch: Android=${android.join(',')} website=${web.join(',')}`);
if (manifest.locales.find(locale => locale.androidLocale === 'iw')?.webLocale !== 'he') errors.push('Missing iw → he mapping');
if (manifest.locales.find(locale => locale.androidLocale === 'in')?.webLocale !== 'id') errors.push('Missing in → id mapping');

function fileForUrl(url) {
  const pathname = new URL(url, 'https://balkanconverter.com').pathname;
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '').replace(/\/$/, '/index.html');
  return path.join(root, relative);
}

function visibleStrings(html) {
  const withoutScripts = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
  const values = new Set();
  withoutScripts.replace(/>([^<>]+)</g, (_, value) => {
    const text = value.trim(); if (/[\p{L}\p{N}]/u.test(text) && text !== '2026') values.add(text); return _;
  });
  withoutScripts.replace(/\b(?:aria-label|title|alt|data-label-light|data-label-dark)="([^"]+)"/g,
    (_, value) => { if (value) values.add(value); return _; });
  withoutScripts.replace(/<meta\s+(?:name|property)="(?:description|og:title|og:description|og:image:alt|twitter:title|twitter:description)"\s+content="([^"]+)"/g,
    (_, value) => { values.add(value); return _; });
  return values;
}

for (const locale of manifest.locales) {
  for (const [page, url] of [['home', locale.url], ['policy', locale.privacyUrl]]) {
    const full = fileForUrl(url);
    let html;
    try { html = await fs.readFile(full, 'utf8'); } catch { errors.push(`Missing ${full}`); continue; }
    pages.set(full, html);
    if ((html.match(/<!doctype html>/gi) ?? []).length !== 1) errors.push(`Bad doctype ${full}`);
    for (const tag of ['html', 'head', 'body']) {
      if ((html.match(new RegExp(`<${tag}(?:\\s|>)`, 'gi')) ?? []).length !== 1 || (html.match(new RegExp(`</${tag}>`, 'gi')) ?? []).length !== 1) errors.push(`Bad ${tag} structure ${full}`);
    }
    const dir = locale.dir === 'rtl' ? ' dir="rtl"' : '';
    if (!html.includes(`<html lang="${locale.hreflang}"${dir}>`)) errors.push(`Bad lang/dir ${full}`);
    if (!html.includes(`rel="canonical" href="https://balkanconverter.com${url}"`)) errors.push(`Bad canonical ${full}`);
    for (const hreflang of expectedHreflangs) {
      if ((html.match(new RegExp(`rel="alternate" hreflang="${hreflang.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g')) ?? []).length !== 1) errors.push(`Missing/duplicate hreflang ${hreflang} in ${full}`);
    }
    if ((html.match(/rel="alternate" hreflang="x-default"/g) ?? []).length !== 1) errors.push(`Missing/duplicate x-default in ${full}`);
    if ((html.match(/class="language-menu"/g) ?? []).length !== 1) errors.push(`Missing language selector ${full}`);
    if ((html.match(/aria-current="page"/g) ?? []).length !== 1) errors.push(`Bad current language ${full}`);
    if (!html.includes('analytics-consent-template')) errors.push(`Missing consent localization ${full}`);
    if (!html.includes('analytics-consent-accept') || !html.includes('analytics-consent-reject')) errors.push(`Incomplete consent actions ${full}`);
    if (!html.includes('play.google.com/store/apps/details?id=io.github.nstim605.balkanconverter')) errors.push(`Missing Google Play ${full}`);
    if (page === 'policy' && (!html.includes('id="website-analytics"') || !html.includes('id="contact"'))) errors.push(`Missing policy anchors ${full}`);
    if (locale.androidLocale !== 'en') {
      const sourceSet = new Set(page === 'home' ? inventory.home : inventory.privacyPolicy);
      for (const value of visibleStrings(html)) {
        if (sourceSet.has(value) && !intentionalEnglish.has(value) && !(locale.androidLocale === 'de' && value === 'Screenshots')) errors.push(`Untranslated source string in ${full}: ${value}`);
      }
    }
  }
}

for (const [full, html] of pages) {
  const currentUrl = `https://balkanconverter.com/${path.relative(root, full).replaceAll('\\', '/').replace(/index\.html$/, '')}`;
  for (const match of html.matchAll(/\bhref="([^"]+)"/g)) {
    const href = match[1];
    if (/^(https?:|mailto:|tel:)/.test(href)) continue;
    const resolved = new URL(href, currentUrl);
    const target = fileForUrl(resolved.pathname);
    try {
      const stat = await fs.stat(target);
      if (!stat.isFile()) errors.push(`Local link is not a file ${full}: ${href}`);
      if (resolved.hash) {
        const targetHtml = pages.get(target) ?? await fs.readFile(target, 'utf8');
        const id = decodeURIComponent(resolved.hash.slice(1)).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (!new RegExp(`\\bid="${id}"`).test(targetHtml)) errors.push(`Missing anchor ${full}: ${href}`);
      }
    } catch { errors.push(`Broken internal link ${full}: ${href}`); }
  }
}

const sitemap = await fs.readFile(path.join(root, 'sitemap.xml'), 'utf8');
const blocks = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(match => match[1]);
if (blocks.length !== 88) errors.push(`Sitemap URL count ${blocks.length}, expected 88`);
const expectedUrls = manifest.locales.flatMap(locale => [locale.url, locale.privacyUrl]).map(url => `https://balkanconverter.com${url}`);
for (const expected of expectedUrls) if (!sitemap.includes(`<loc>${expected}</loc>`)) errors.push(`Sitemap missing ${expected}`);
for (const block of blocks) {
  if ((block.match(/<xhtml:link /g) ?? []).length !== 45) errors.push('Sitemap alternate count is not 45');
  for (const hreflang of [...expectedHreflangs, 'x-default']) if (!block.includes(`hreflang="${hreflang}"`)) errors.push(`Sitemap block missing ${hreflang}`);
}

const generator = await fs.readFile(path.join(root, 'tools', 'localize-site.mjs'), 'utf8');
if (/fetch\s*\(|translate\.googleapis|translation endpoint/i.test(generator)) errors.push('Generator still contains network translation code');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
for (const warning of warnings) console.warn(`WARN: ${warning}`);
console.log(`PASS: Android production locales ${android.length}; website locales ${manifest.locales.length}; pages ${pages.size}; sitemap URLs ${blocks.length}; internal links and localized source strings checked.`);
