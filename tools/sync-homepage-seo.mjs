import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const escapeHtml = value => value.replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);

export function validateHomepageSeoCopy(catalog, localeCodes) {
  if (!catalog || typeof catalog !== 'object' || Array.isArray(catalog) ||
      JSON.stringify(Object.keys(catalog).sort()) !== JSON.stringify([...localeCodes].sort())) {
    throw new Error('Homepage SEO copy must cover exactly the complete locale manifest');
  }
  for (const locale of localeCodes) {
    const copy = catalog[locale];
    if (!copy || JSON.stringify(Object.keys(copy).sort()) !== '["description","title"]') {
      throw new Error(`${locale}: homepage SEO copy needs exactly title and description`);
    }
    for (const field of ['title', 'description']) {
      const value = copy[field];
      if (typeof value !== 'string' || !value.trim() || value !== value.trim() || /[\u0000-\u001f]/u.test(value)) {
        throw new Error(`${locale}: invalid ${field}`);
      }
      if (!value.includes('BALCO Converter')) throw new Error(`${locale}: missing product name in ${field}`);
      if (locale !== 'en' && value === catalog.en?.[field]) throw new Error(`${locale}: English fallback in ${field}`);
    }
    if (!copy.description.includes('Android')) throw new Error(`${locale}: missing Android scope`);
  }
}

function replaceOne(source, pattern, replacement, label) {
  if ([...source.matchAll(pattern)].length !== 1) throw new Error(`Expected exactly one homepage ${label}`);
  return source.replace(pattern, replacement);
}

// Restrict changes to these seven metadata values. Preserve body content, URLs,
// images, language attributes, search alternates and JSON-LD formatting.
export function updateHomepageSeo(html, copy) {
  return replaceOne(html, /(<head>)([\s\S]*?)(<\/head>)/g, (_, opening, head, closing) => {
    let updated = replaceOne(head, /(<title>)[\s\S]*?(<\/title>)/g,
      (_, start, end) => `${start}${escapeHtml(copy.title)}${end}`, 'title');
    for (const [attribute, name, value] of [
      ['name', 'description', copy.description],
      ['property', 'og:title', copy.title],
      ['property', 'og:description', copy.description],
      ['name', 'twitter:title', copy.title],
      ['name', 'twitter:description', copy.description]
    ]) {
      updated = replaceOne(updated, new RegExp(`(<meta ${attribute}="${name}" content=")[^"]*(">)`, 'g'),
        (_, start, end) => `${start}${escapeHtml(value)}${end}`, name);
    }
    updated = replaceOne(updated, /(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/g,
      (_, start, json, end) => {
        const data = JSON.parse(json);
        if (data['@type'] !== 'MobileApplication' || typeof data.description !== 'string') {
          throw new Error('Expected homepage MobileApplication JSON-LD with a description');
        }
        const description = JSON.stringify(copy.description).replaceAll('<', '\\u003c');
        const replaced = replaceOne(json, /("description"\s*:\s*)"(?:\\.|[^"\\])*"/g,
          (_, prefix) => `${prefix}${description}`, 'JSON-LD description');
        return `${start}${replaced}${end}`;
      }, 'JSON-LD block');
    return `${opening}${updated}${closing}`;
  }, 'head');
}

export async function syncHomepageSeo({ check = false } = {}) {
  const { locales } = JSON.parse(await fs.readFile(path.join(root, 'site-locales.json'), 'utf8'));
  const catalog = JSON.parse(await fs.readFile(path.join(root, 'tools/homepage-seo-copy.json'), 'utf8'));
  validateHomepageSeoCopy(catalog, locales.map(locale => locale.webLocale));
  const updates = [];
  // Validate every output before writing any page, so malformed input cannot
  // leave only part of the locale inventory updated.
  for (const locale of locales) {
    const file = path.join(root, locale.url.slice(1), 'index.html');
    const before = await fs.readFile(file, 'utf8');
    const after = updateHomepageSeo(before, catalog[locale.webLocale]);
    if (before !== after) updates.push({ file, after });
  }
  if (check && updates.length) throw new Error(`${updates.length}/${locales.length} homepages have stale SEO metadata`);
  if (!check) for (const { file, after } of updates) await fs.writeFile(file, after, 'utf8');
  return { locales: locales.length, changedPages: updates.length, mode: check ? 'check' : 'write' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  console.log(JSON.stringify(await syncHomepageSeo({ check: process.argv.includes('--check') })));
}
