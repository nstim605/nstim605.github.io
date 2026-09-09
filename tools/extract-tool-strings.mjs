import fs from 'node:fs/promises';
import path from 'node:path';
import { createRunTimestamp, writeGeneratedJson } from './generated-json.mjs';

const root = path.resolve(import.meta.dirname, '..');
export const toolSlugs = [
  'currency-converter',
  'exchange-rate-markup-calculator',
  'multi-currency-converter',
  'offline-currency-converter',
  'exchange-rate-history',
  'currency-converter-widget',
  'foreign-transaction-fee-calculator',
  'travel-budget-calculator'
];

const attributeNames = 'aria-label|title|alt|placeholder|data-label-light|data-label-dark';
const strings = new Set();

function decode(value) {
  return value.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<').replaceAll('&gt;', '>').replace(/\s+/g, ' ').trim();
}

function add(value) {
  const text = decode(value);
  if (!/[\p{L}]/u.test(text)) return;
  if (/^(?:Balkan Converter|Balkan Currency Converter|Google Play|Frankfurter|DCC|EUR|USD|RSD)$/.test(text)) return;
  if (/^(?:https?:|\/)/.test(text)) return;
  strings.add(text);
}

function collectJson(value, key = '') {
  if (typeof value === 'string') {
    if (!['@context', '@type', 'url', 'operatingSystem', 'applicationCategory'].includes(key)) add(value);
    return;
  }
  if (Array.isArray(value)) value.forEach(item => collectJson(item));
  else if (value && typeof value === 'object') Object.entries(value).forEach(([name, item]) => collectJson(item, name));
}

function collectHtml(html) {
  for (const match of html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    collectJson(JSON.parse(match[1]));
  }
  const masked = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
  for (const match of masked.matchAll(/>([^<>]+)</g)) add(match[1]);
  for (const match of masked.matchAll(new RegExp(`\\b(?:${attributeNames})="([^"]+)"`, 'g'))) add(match[1]);
  for (const match of masked.matchAll(/<meta\s+(?:name|property)="(?:description|og:title|og:description|og:image:alt|twitter:title|twitter:description)"\s+content="([^"]+)"/g)) add(match[1]);
}

for (const slug of toolSlugs) {
  collectHtml(await fs.readFile(path.join(root, slug, 'index.html'), 'utf8'));
  for (const file of await fs.readdir(path.join(root, slug))) {
    if (!/\.(?:js|mjs)$/.test(file)) continue;
    const code = await fs.readFile(path.join(root, slug, file), 'utf8');
    for (const match of code.matchAll(/\bt\(\s*'((?:\\'|[^'])+)'/g)) add(match[1].replaceAll("\\'", "'"));
    for (const match of code.matchAll(/throw new (?:RangeError|Error)\('((?:\\'|[^'])+)'\)/g)) add(match[1].replaceAll("\\'", "'"));
  }
}

// Homepage tool navigation is part of the same localized user journey.
const home = await fs.readFile(path.join(root, 'index.html'), 'utf8');
const navigation = home.match(/<section class="section shell tool-promo"[\s\S]*?<\/section>/)?.[0];
if (navigation) collectHtml(navigation);

const values = [...strings].sort((a, b) => a.localeCompare(b, 'en'));
await writeGeneratedJson(path.join(root, 'tools', 'tool-localization-source.json'), {
  sources: toolSlugs.map(slug => `${slug}/index.html`).concat(toolSlugs.map(slug => `${slug}/*.{js,mjs}`)),
  strings: values
}, { getRunTimestamp: createRunTimestamp(), generatedAtIndex: 1 });

console.log(`Collected ${values.length} unique localizable tool strings.`);
