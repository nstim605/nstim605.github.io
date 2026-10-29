import fs from 'node:fs';
import path from 'node:path';

const currentRelease = {version: '1.614', published: true};
const currentReleaseFeatures = ['ShoppingCart', 'Themes', 'RewardedAds', 'PriceConversion', 'Navigation'];

const features = [
  ['Keyboard', 'updates_keypad_title', 'updates_keypad_body'],
  ['ProcessText', 'balco_points_history_process_text'],
  ['PriceScanner', 'price_scanner_title', 'camera_permission_explanation'],
  ['ActualCost', 'menu_actual_cost', 'actual_cost_explanation'],
  ['TravelBoard', 'travel_board_title', 'travel_board_base_hint'],
  ['Crypto', 'crypto_title', 'crypto_market_title']
];

export const escapeHtml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;');

function androidText(value) {
  return value.replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'").replaceAll('&amp;', '&').replace(/\\(["'])/g, '$1')
    .replaceAll('\\n', '\n').replace(/\s+/g, ' ').trim();
}

// Generate the website from the exact localized strings used by UpdatesScreenV2.
// The published HTML and JSON remain standalone; Android sources are needed only at generation time.
export function loadAppNews(root, manifest) {
  const androidRoot = path.resolve(process.env.ANDROID_SOURCE_ROOT || path.join(root, '..'));
  const result = {};
  for (const locale of manifest.locales) {
    const source = manifest.terminologySources.find(item => item.locale === locale.androidLocale);
    if (!source) throw new Error(`Missing Android source for ${locale.androidLocale}`);
    const directory = path.dirname(path.join(androidRoot, source.androidResource));
    const strings = new Map();
    for (const file of fs.readdirSync(directory).filter(name => name.endsWith('.xml'))) {
      const xml = fs.readFileSync(path.join(directory, file), 'utf8');
      for (const match of xml.matchAll(/<string\b[^>]*\bname="([^"]+)"[^>]*>([\s\S]*?)<\/string>/g)) {
        strings.set(match[1], androidText(match[2]));
      }
    }
    const required = key => {
      const value = strings.get(key);
      if (!value) throw new Error(`Missing ${key} in ${directory}`);
      return value;
    };
    const releaseFile = path.join(androidRoot, 'app', 'src', 'google', 'res', path.basename(directory), 'updates_release.xml');
    const releaseXml = fs.readFileSync(releaseFile, 'utf8');
    const releaseArray = releaseXml.match(/<string-array\b[^>]*\bname="updates_current_release"[^>]*>([\s\S]*?)<\/string-array>/)?.[1];
    if (!releaseArray) throw new Error(`Missing current release array in ${releaseFile}`);
    const releaseValues = [...releaseArray.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/g)].map(match => androidText(match[1]));
    if (releaseValues.length !== currentReleaseFeatures.length * 2 || releaseValues.some(value => !value)) {
      throw new Error(`Expected five title/body pairs in ${releaseFile}`);
    }
    const currentCards = currentReleaseFeatures.map((id, index) => ({
      id, title: releaseValues[index * 2], body: releaseValues[index * 2 + 1], ...currentRelease
    }));
    const exampleNumber = new Intl.NumberFormat(locale.hreflang, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    // The app illustrates this card with the same source, rate, and result.
    const selectedTextExample = `${required('process_text_result_title')}: ${exampleNumber.format(149.99)} EUR → ${exampleNumber.format(149.99 * 116.87)} RSD (1 EUR = ${exampleNumber.format(116.87)} RSD)`;
    result[locale.hreflang] = {
      title: required('menu_whats_new'),
      cards: [...currentCards, ...features.map(([id, title, body]) => ({
        id, title: required(title), ...(body ? {body: required(body)} : {}),
        ...(id === 'ProcessText' ? {body: selectedTextExample} : {}),
        ...(id === 'Keyboard' ? {version: '1.613', published: true} : {})
      }))]
    };
  }
  return result;
}

export function renderNewsCards(news) {
  return news.cards.map(card => `      <article class="app-update-card" data-app-feature="${card.id}">
${card.version ? `        <p class="eyebrow upcoming-release">${escapeHtml(card.version)}</p>\n` : ''}        <h2>${escapeHtml(card.title)}</h2>
${card.body ? `        <p>${escapeHtml(card.body)}</p>\n` : ''}      </article>`).join('\n');
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
