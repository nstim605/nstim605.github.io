import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const escapeHtml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;');

export function validateScreenshotCopy(catalog, locales) {
  const expected = locales.map(locale => locale.webLocale).sort();
  if (JSON.stringify(Object.keys(catalog.locales).sort()) !== JSON.stringify(expected)) {
    throw new Error('Screenshot copy must cover the complete site locale inventory');
  }
  const scenes = ['converter', 'scanner', 'cart', 'travel-board', 'exchange-comparison', 'chart', 'settings', 'crypto'];
  if (catalog.version !== '1.620' || catalog.versionCode !== 37 || catalog.store !== 'Google Play'
      || JSON.stringify(catalog.scenes) !== JSON.stringify(scenes)) {
    throw new Error('Unexpected screenshot release or scene inventory');
  }
  for (const locale of locales) for (const scene of catalog.scenes) {
    const copy = catalog.locales[locale.webLocale][scene];
    if (!copy?.title || typeof copy.subtitle !== 'string') {
      throw new Error(`Missing screenshot caption: ${locale.webLocale}/${scene}`);
    }
  }
}

export function updateHomepageScreenshots(html, locale, catalog) {
  const eol = html.includes('\r\n') ? '\r\n' : '\n';
  const copy = catalog.locales[locale.webLocale];
  if (!copy) throw new Error(`Missing screenshot locale ${locale.webLocale}`);
  const image = (scene, index, hero = false) => {
    const base = `/assets/screenshots/v1-620/${locale.webLocale}/${String(index + 1).padStart(2, '0')}-${scene}`;
    const alt = escapeHtml([copy[scene].title, copy[scene].subtitle].filter(Boolean).join(' '));
    const sizes = hero
      ? '(max-width: 540px) 85vw, (max-width: 980px) 56vw, 400px'
      : '(max-width: 540px) 90vw, (max-width: 980px) 44vw, 360px';
    return `<img src="${base}-540.webp" srcset="${base}-540.webp 540w, ${base}.webp 1080w" sizes="${sizes}" width="1080" height="1920" decoding="async" ${hero ? 'fetchpriority="high"' : 'loading="lazy"'} alt="${alt}">`;
  };
  const heroPattern = /(<div class="hero-visual"[^>]*>[\s\S]*?<figure\b[^>]*>\s*)<img\b[^>]*>/;
  if (!heroPattern.test(html)) throw new Error('Missing homepage hero image');
  let result = html.replace(heroPattern, (_, prefix) => prefix + image('converter', 0, true));
  const sectionPattern = /<section class="section screenshots-section"[\s\S]*?<\/section>/;
  const section = result.match(sectionPattern)?.[0];
  if (!section) throw new Error('Missing screenshots section');
  const gridPattern = /        <div class="screenshot-grid">[\s\S]*?        <\/div>/;
  if (!gridPattern.test(section)) throw new Error('Missing screenshots grid');
  const figures = catalog.scenes.map((scene, index) => [
    '          <figure class="screenshot-card">',
    `            ${image(scene, index)}`,
    `            <figcaption><strong>${escapeHtml(copy[scene].title)}</strong>${copy[scene].subtitle ? `<span>${escapeHtml(copy[scene].subtitle)}</span>` : ''}</figcaption>`,
    '          </figure>'
  ].join(eol)).join(eol);
  let updated = section.replace(gridPattern, `        <div class="screenshot-grid">${eol}${figures}${eol}        </div>`);
  updated = updated.replace(/\s*<p class="screenshot-release">[\s\S]*?<\/p>/, '');
  updated = updated.replace('        <div class="screenshot-grid">',
    `        <p class="screenshot-release"><bdi dir="ltr">Google Play · 1.620</bdi></p>${eol}        <div class="screenshot-grid">`);
  return result.replace(sectionPattern, () => updated);
}

export async function syncHomepageScreenshots({ check = false } = {}) {
  const { locales } = JSON.parse(await fs.readFile(path.join(root, 'site-locales.json'), 'utf8'));
  const catalog = JSON.parse(await fs.readFile(path.join(root, 'tools/homepage-screenshots-copy.json'), 'utf8'));
  validateScreenshotCopy(catalog, locales);
  const updates = [];
  for (const locale of locales) {
    const file = path.join(root, locale.url.slice(1), 'index.html');
    const before = await fs.readFile(file, 'utf8');
    const after = updateHomepageScreenshots(before, locale, catalog);
    if (before !== after) updates.push({ file, after });
  }
  const template = path.join(root, 'tools/templates/index.html');
  const before = await fs.readFile(template, 'utf8');
  const after = updateHomepageScreenshots(before, locales.find(locale => locale.webLocale === 'en'), catalog);
  if (before !== after) updates.push({ file: template, after });
  if (check && updates.length) throw new Error(`${updates.length} homepage/template screenshot blocks are stale`);
  if (!check) for (const update of updates) await fs.writeFile(update.file, update.after, 'utf8');
  console.log(`Screenshots: ${locales.length}/${locales.length} locales, ${catalog.scenes.length} scenes each; ${check ? 'current' : `${updates.length} files updated`}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await syncHomepageScreenshots({ check: process.argv.includes('--check') });
}
