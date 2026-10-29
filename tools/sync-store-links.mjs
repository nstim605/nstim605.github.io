import fs from 'node:fs/promises';
import path from 'node:path';
import { ensureStoreLinks } from './store-links.mjs';

const root = path.resolve(import.meta.dirname, '..');
const manifest = JSON.parse(await fs.readFile(path.join(root, 'site-locales.json'), 'utf8'));
const paths = new Set();
for (const locale of manifest.locales) {
  const updates = locale.updatesUrl ?? `${locale.url}updates/`;
  for (const url of [locale.url, locale.privacyUrl, locale.linksUrl,
    ...Object.values(locale.toolUrls), updates, `${updates}version-1-604/`]) {
    paths.add(url.slice(1) + (url.endsWith('/') ? 'index.html' : ''));
  }
}
for (const name of ['index.html', 'privacy-policy.html', 'links.html']) paths.add(`tools/templates/${name}`);

let changed = 0;
for (const relative of paths) {
  const file = path.join(root, relative);
  const before = await fs.readFile(file, 'utf8');
  const after = ensureStoreLinks(before);
  if (after !== before) {
    await fs.writeFile(file, after, 'utf8');
    changed++;
  }
}
console.log(`Store links: ${changed} updated; ${paths.size} pages and templates checked.`);
