import fs from 'node:fs';
import path from 'node:path';

const currentRelease = {
  id: 'ChartsAndConversion', version: '1.620', versionCode: 37,
  published: true, statusLabel: 'Google Play · 1.620'
};

export const escapeHtml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;');

// Historical cards are the published website snapshot from commit ebe8bde.
// The 1.620 copy is frozen from release-publication-2026-11-10/news-copy-all-locales.json.
// Never read mutable Android updates_release.xml to regenerate an older release.
export function loadAppNews(root, manifest) {
  const archive = JSON.parse(fs.readFileSync(path.join(root, 'tools', 'app-news-archive.json'), 'utf8'));
  const release = JSON.parse(fs.readFileSync(path.join(root, 'tools', 'app-news-release-1.620.json'), 'utf8'));
  const sameLocales = (actual, expected) => JSON.stringify(actual.sort()) === JSON.stringify(expected.sort());
  if (!sameLocales(Object.keys(archive), manifest.locales.map(locale => locale.hreflang))) {
    throw new Error('Archived news must cover exactly the website locale inventory');
  }
  if (!sameLocales(Object.keys(release), manifest.locales.map(locale => locale.androidLocale))) {
    throw new Error('Frozen release copy must cover exactly the Android locale mappings');
  }
  const result = {};
  for (const locale of manifest.locales) {
    const history = archive[locale.hreflang];
    const copy = release[locale.androidLocale];
    const text = value => typeof value === 'string' && value.trim().length > 0;
    if (!text(copy.title) || !Array.isArray(copy.bullets) || copy.bullets.length !== 4 || !copy.bullets.every(text)) {
      throw new Error(`Expected a localized title and four release bullets for ${locale.hreflang}`);
    }
    if (!text(history.title) || !Array.isArray(history.cards) || history.cards.some(card => card.id === currentRelease.id)) {
      throw new Error(`Invalid historical news snapshot for ${locale.hreflang}`);
    }
    result[locale.hreflang] = {
      title: history.title,
      cards: [{...currentRelease, title: copy.title, bullets: copy.bullets}, ...history.cards]
    };
  }
  return result;
}

export function renderNewsCards(news) {
  return news.cards.map(card => {
    const bullets = card.bullets || (['CartContinuous', 'CartExperience', 'ScannerAccuracy'].includes(card.id)
      ? card.body.slice(2).split(' • ') : null);
    const body = bullets
      ? `        <ul>${bullets.map(line => `<li>${escapeHtml(line)}</li>`).join('')}</ul>\n`
      : card.body ? `        <p>${escapeHtml(card.body)}</p>\n` : '';
    return `      <article class="app-update-card" data-app-feature="${card.id}">
${card.version ? `        <p class="eyebrow upcoming-release">${escapeHtml(card.statusLabel || card.version)}</p>\n` : ''}        <h2>${escapeHtml(card.title)}</h2>
${body}      </article>`;
  }).join('\n');
}

export function renderNewsHeader(homepage, locale, news, manifest) {
  const homePath = locale.dir ? `/${locale.dir}/` : '/';
  const newsPath = `${homePath}updates/`;
  let header = homepage.match(/<header class="site-header">[\s\S]*?<\/header>/)?.[0];
  if (!header) throw new Error(`No shared header for ${locale.hreflang}`);
  header = header.replace(/href="#(features|screenshots)"/g, `href="${homePath}#$1"`)
    .replaceAll('href="privacy-policy.html"', `href="${homePath}privacy-policy.html"`)
    .replace(/src="(?:\.\.\/)?assets\//g, 'src="/assets/')
    .replace(new RegExp(`(<a href="${newsPath}"[^>]*>)[^<]*(</a>)`, 'g'),
      `<a href="${newsPath}" aria-current="page">${escapeHtml(news.title)}</a>`);
  header = header.replace(/(<div class="language-menu">)([\s\S]*?)(<\/div>)/, (_, start, menu, end) => {
    for (const entry of manifest.locales) {
      menu = menu.replace(`href="${entry.url}"`, `href="${entry.updatesUrl}"`);
    }
    return start + menu + end;
  });
  return header;
}
