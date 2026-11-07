import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { skipLinkCopy, updateGenericNavigation, updateSearchAlternates } from './locale-navigation.mjs';

const root = path.resolve(import.meta.dirname, '..');

export async function syncLocaleNavigation({ check = false } = {}) {
  const { locales } = JSON.parse(await fs.readFile(path.join(root, 'site-locales.json'), 'utf8'));
  const expected = locales.map(locale => locale.webLocale).sort();
  if (JSON.stringify(Object.keys(skipLinkCopy).sort()) !== JSON.stringify(expected)) {
    throw new Error('Skip-navigation copy must cover exactly the complete locale manifest');
  }
  const changes = [];
  let pages = 0;
  for (const locale of locales) {
    const genericRoutes = [locale.url, locale.privacyUrl, locale.linksUrl, locale.updatesUrl];
    const routes = [...genericRoutes, ...Object.values(locale.toolUrls), ...Object.values(locale.updateArticleUrls)];
    if (routes.some(route => !route?.startsWith('/'))) throw new Error(`${locale.webLocale}: missing public route`);
    for (const route of routes) {
      const relative = route.endsWith('/') ? `${route.slice(1)}index.html` : route.slice(1);
      const file = path.join(root, relative);
      const before = await fs.readFile(file, 'utf8');
      const after = genericRoutes.includes(route)
        ? updateGenericNavigation(before, locale.webLocale)
        : updateSearchAlternates(before);
      pages += 1;
      if (after !== before) {
        changes.push(relative);
        if (!check) await fs.writeFile(file, after, 'utf8');
      }
    }
  }
  const sitemapFile = path.join(root, 'sitemap.xml');
  const sitemap = await fs.readFile(sitemapFile, 'utf8');
  const updatedSitemap = updateSearchAlternates(sitemap);
  if (updatedSitemap !== sitemap) {
    changes.push('sitemap.xml');
    if (!check) await fs.writeFile(sitemapFile, updatedSitemap, 'utf8');
  }
  if (check && changes.length) throw new Error(`Stale locale navigation in ${changes.length} files: ${changes.join(', ')}`);
  return { locales: locales.length, pages, changedFiles: changes.length, mode: check ? 'check' : 'write' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  console.log(JSON.stringify(await syncLocaleNavigation({ check: process.argv.includes('--check') })));
}
