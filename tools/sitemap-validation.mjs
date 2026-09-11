const defaultOrigin = 'https://balkanconverter.com';

function duplicates(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts].filter(([, count]) => count > 1).map(([value]) => value).sort();
}

export function expectedSitemapUrls(manifest, origin = defaultOrigin) {
  if (!Array.isArray(manifest?.locales)) throw new TypeError('Locale manifest must contain a locales array');
  return manifest.locales.flatMap(locale => {
    const routes = [locale.url, locale.privacyUrl, ...Object.values(locale.toolUrls ?? {})];
    if (routes.some(route => typeof route !== 'string' || !route.startsWith('/'))) {
      throw new TypeError(`Locale ${locale.webLocale ?? locale.androidLocale ?? 'unknown'} contains an invalid route`);
    }
    return routes.map(route => new URL(route, origin).href);
  });
}

export function validateSitemapUrlSet(sitemap, manifest, origin = defaultOrigin) {
  const blocks = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(match => match[1]);
  const malformedBlocks = blocks.filter(block => (block.match(/<loc>[^<]+<\/loc>/g) ?? []).length !== 1);
  const actualUrls = blocks.flatMap(block => [...block.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]));
  const expectedUrls = expectedSitemapUrls(manifest, origin);
  const expectedSet = new Set(expectedUrls);
  const actualSet = new Set(actualUrls);
  const missingUrls = [...expectedSet].filter(url => !actualSet.has(url)).sort();
  const unexpectedUrls = [...actualSet].filter(url => !expectedSet.has(url)).sort();
  const duplicateUrls = duplicates(actualUrls);
  const duplicateExpectedUrls = duplicates(expectedUrls);
  const errors = [
    ...malformedBlocks.map(() => 'Sitemap URL block must contain exactly one <loc>'),
    ...duplicateExpectedUrls.map(url => `Locale manifest contains duplicate URL ${url}`),
    ...missingUrls.map(url => `Sitemap missing ${url}`),
    ...unexpectedUrls.map(url => `Sitemap contains unexpected URL ${url}`),
    ...duplicateUrls.map(url => `Sitemap contains duplicate URL ${url}`)
  ];
  return {
    ok: errors.length === 0,
    errors,
    blocks,
    expectedUrls,
    actualUrls,
    missingUrls,
    unexpectedUrls,
    duplicateUrls,
    duplicateExpectedUrls
  };
}
