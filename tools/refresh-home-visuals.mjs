/** Deterministic, idempotent visual-only update. Never regenerates legal pages. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const locales = JSON.parse(await fs.readFile(path.join(root, 'site-locales.json'), 'utf8')).locales;
const icons = 'assets/icons/v1-5-11/';
const screenRoot = '/assets/screenshots/v1-5-11/';
const names = ['main-converter', 'actual-cost', 'travel-board', 'saved-sets'];

export function refreshVisuals(html) {
  let result = html.replaceAll('Balkan Currency Converter 1.4 main converter with calculator keypad',
    'Balkan Currency Converter main converter with calculator keypad')
    .replaceAll('Balkan Currency Converter 1.4 main conversion screen showing euros and US dollars',
      'Balkan Currency Converter main conversion screen showing euros and Serbian dinars')
    .replaceAll('assets/balkan-converter-og-1200x630.png', 'assets/og-v1-5-11.png')
    .replaceAll('assets/og.png', 'assets/og-v1-5-11.png')
    .replaceAll('assets/app-icon.png', `${icons}app-icon-v1-5-11.png`);
  result = result.replace(/<link rel="icon"[^>]*>/,
    `<link rel="icon" type="image/png" sizes="32x32" href="/${icons}favicon-32.png">\n` +
    `  <link rel="icon" type="image/png" sizes="48x48" href="/${icons}favicon-48.png">\n` +
    `  <link rel="icon" type="image/png" sizes="96x96" href="/${icons}favicon-96.png">`);
  // Repeated runs keep exactly one link per size.
  for (const size of [48, 96]) {
    const tag = `<link rel="icon" type="image/png" sizes="${size}x${size}" href="/${icons}favicon-${size}.png">`;
    const first = result.indexOf(tag);
    result = result.slice(0, first + tag.length) + result.slice(first + tag.length).replaceAll(`\n  ${tag}`, '');
  }
  result = result.replace(/<link rel="apple-touch-icon"[^>]*>/,
    `<link rel="apple-touch-icon" sizes="180x180" href="/${icons}apple-touch-icon-180.png">`);
  result = result.replace(/<img\b[^>]*>/g, tag => {
    const name = names.find(name => tag.includes(`/${name}.webp`) || tag.includes(`/${name}-540.webp`));
    if (!name) return tag;
    const hero = tag.includes('fetchpriority="high"');
    const sizes = hero ? '(max-width: 540px) 242px, 286px' :
      '(max-width: 540px) calc(100vw - 50px), (max-width: 760px) calc((100vw - 68px) / 2), (max-width: 980px) 330px, 262px';
    return tag.replace(/\s(?:src|srcset|sizes|width|height|decoding)="[^"]*"/g, '')
      .replace('<img', `<img src="${screenRoot}${name}-540.webp"` +
        ` srcset="${screenRoot}${name}-540.webp 540w, ${screenRoot}${name}-810.webp 810w, ${screenRoot}${name}.webp 1080w"` +
        ` sizes="${sizes}" width="1080" height="1884" decoding="async"`);
  });
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
const pages = locales.map(locale => path.join(root, locale.url === '/' ? 'index.html' : `${locale.url.slice(1)}index.html`));
pages.push(path.join(root, 'tools/templates/index.html'));
for (const file of pages) {
  const before = await fs.readFile(file, 'utf8');
  const after = refreshVisuals(before);
  if (after !== before) await fs.writeFile(file, after);
}
const inventoryPath = path.join(root, 'tools/production-strings.json');
const inventoryBefore = await fs.readFile(inventoryPath, 'utf8');
const inventoryAfter = inventoryBefore
  .replaceAll('Balkan Currency Converter 1.4 main converter with calculator keypad', 'Balkan Currency Converter main converter with calculator keypad')
  .replaceAll('Balkan Currency Converter 1.4 main conversion screen showing euros and US dollars', 'Balkan Currency Converter main conversion screen showing euros and Serbian dinars');
if (inventoryAfter !== inventoryBefore) await fs.writeFile(inventoryPath, inventoryAfter);
console.log(`Updated visual references on ${locales.length} homepages and the homepage template; policy pages untouched.`);
}
