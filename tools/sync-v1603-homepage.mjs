/**
 * Synchronise the public homepages with the approved 1.603 store listing and
 * current promotional screenshots. The script is deterministic and leaves
 * legal pages and utility pages untouched.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const androidRoot = path.resolve(root, '..');
const locales = JSON.parse(await fs.readFile(path.join(root, 'site-locales.json'), 'utf8')).locales;
const listings = JSON.parse(await fs.readFile(
  path.join(androidRoot, 'play_store_listings', 'release-1.6', 'google-play-listings.json'),
  'utf8'
));
const listingByLocale = new Map(listings.map(listing => [listing.locale, listing]));
const listingLocale = locale => ({ iw: 'he', in: 'id' })[locale] ?? locale;
const homepageLinks = JSON.parse(await fs.readFile(path.join(root, 'tools', 'homepage-link-copy.json'), 'utf8'));
const resourceFiles = ['strings.xml', 'scanner_strings.xml', 'help_strings.xml', 'crypto_strings.xml'];
const requiredStrings = [
  'about_description',
  'actual_cost_title',
  'actual_cost_explanation',
  'travel_board_title',
  'travel_board_base_hint',
  'price_scanner_title',
  'marketing_offline_headline',
  'help_offline_answer',
  'help_crypto_answer',
  'help_scanner_answer',
  'crypto_title'
];

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);

function decodeAndroidString(value = '') {
  return value
    .replace(/<xliff:g\b[^>]*>([\s\S]*?)<\/xliff:g>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/\\n/g, ' ')
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function resourceDirectory(androidLocale) {
  const special = {
    en: 'values',
    'es-419': 'values-b+es+419',
    'es-ES': 'values-es-rES',
    'pt-BR': 'values-pt-rBR',
    'pt-PT': 'values-pt-rPT',
    'zh-Hans': 'values-b+zh+Hans',
    'zh-Hant': 'values-b+zh+Hant',
    id: 'values-in',
    he: 'values-iw'
  };
  return special[androidLocale] ?? `values-${androidLocale}`;
}

async function loadResourceStrings(androidLocale) {
  const defaults = androidLocale === 'en' ? {} : await loadResourceStrings('en');
  const strings = { ...defaults };
  const directory = path.join(androidRoot, 'app', 'src', 'main', 'res', resourceDirectory(androidLocale));
  for (const fileName of resourceFiles) {
    let xml;
    try {
      xml = await fs.readFile(path.join(directory, fileName), 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }
    for (const name of requiredStrings) {
      const match = xml.match(new RegExp(`<string\\s+name="${name}"[^>]*>([\\s\\S]*?)<\\/string>`));
      if (match) strings[name] = decodeAndroidString(match[1]);
    }
  }
  return strings;
}

function firstSentences(value, count = 2) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  const matches = text.match(/.*?(?:[.!?。！？](?=\s|$)|$)/g)?.map(item => item.trim()).filter(Boolean) ?? [];
  return matches.slice(0, count).join(' ') || text;
}

function extractExistingFeatures(html) {
  const grid = html.match(/<div class="feature-grid">([\s\S]*?)<\/div>\s*<\/section>/)?.[1] ?? '';
  return [...grid.matchAll(/<article\b[^>]*>[\s\S]*?<h3>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>[\s\S]*?<\/article>/g)]
    .map(match => ({ title: match[1].replace(/<[^>]+>/g, '').trim(), description: match[2].trim() }));
}

function renderFeatureGrid(features, eol) {
  const marks = ['↔', '⌁', '%', '≡', '↓', '₿'];
  return `<div class="feature-grid">${eol}${features.map((feature, index) =>
    `        <article class="feature-card${index === 5 ? ' feature-card-accent' : ''}">${eol}` +
    `          <span class="feature-mark" aria-hidden="true">${marks[index]}</span>${eol}` +
    `          <h3>${escapeHtml(feature.title)}</h3>${eol}` +
    `          <p>${escapeHtml(feature.description)}${feature.link ? ` <a class="text-link" href="${feature.link.href}">${escapeHtml(feature.link.label)}</a>.` : ''}</p>${eol}` +
    '        </article>'
  ).join(eol)}${eol}      </div>`;
}

function renderScreenshotGrid(features, eol) {
  return `<div class="screenshot-grid">${eol}${features.map((feature, index) => {
    const number = index + 1;
    return `          <figure class="screenshot-card">${eol}` +
      `            <img src="/assets/screenshots/v1-603/screenshot-${number}.png" ` +
      `width="333" height="592" decoding="async" loading="lazy" ` +
      `alt="${escapeHtml(`${feature.title}. ${feature.description}`)}">${eol}` +
      `            <figcaption><strong>${escapeHtml(feature.title)}</strong><span>${escapeHtml(feature.description)}</span></figcaption>${eol}` +
      '          </figure>';
  }).join(eol)}${eol}        </div>`;
}

export function updateHomepage(html, { listing, strings, locale }) {
  const eol = html.includes('\r\n') ? '\r\n' : '\n';
  const paragraphs = listing.fullDescription.split(/\r?\n\r?\n/).map(item => item.trim()).filter(Boolean);
  const points = listing.shortDescription.split(/\s*•\s*/).map(item => item.trim()).filter(Boolean);
  const currentFeatures = extractExistingFeatures(html);
  const travelDescription = strings.travel_board_base_hint;
  const scannerDescription = firstSentences(strings.help_scanner_answer || paragraphs[1], 2);
  const offlineDescription = firstSentences(strings.help_offline_answer, 2);
  const cryptoDescription = firstSentences(strings.help_crypto_answer || paragraphs[2], 2);
  const features = [
    { title: points[0], description: strings.about_description || firstSentences(paragraphs[0], 1) },
    { title: strings.price_scanner_title || points[1], description: scannerDescription },
    { title: strings.actual_cost_title || currentFeatures[0]?.title, description: strings.actual_cost_explanation || currentFeatures[0]?.description },
    { title: strings.travel_board_title || currentFeatures[1]?.title, description: travelDescription },
    {
      title: strings.marketing_offline_headline || points[2],
      description: offlineDescription,
      link: {
        href: locale.toolUrls['offline-currency-converter'],
        label: homepageLinks[locale.webLocale].offlineGuide
      }
    },
    { title: strings.crypto_title, description: cryptoDescription }
  ];
  if (features.some(feature => !feature.title || !feature.description)) {
    throw new Error(`Incomplete homepage copy for ${listing.locale}`);
  }

  let result = html
    .replaceAll('assets/icons/v1-5-11/app-icon-v1-5-11.png', 'assets/icons/v1-603/app-icon-v1-603.png')
    .replaceAll('/assets/icons/v1-5-11/favicon-', '/assets/icons/v1-603/favicon-')
    .replaceAll('/assets/icons/v1-5-11/apple-touch-icon-180.png', '/assets/icons/v1-603/apple-touch-icon-180.png')
    .replaceAll('https://balkanconverter.com/assets/og-v1-5-11.png', 'https://balkanconverter.com/assets/og-v1-603.png')
    .replace(/<meta property="og:image:width" content="\d+">/, '<meta property="og:image:width" content="1024">')
    .replace(/<meta property="og:image:height" content="\d+">/, '<meta property="og:image:height" content="500">')
    .replace(/\s*<a href="\/(?:sr\/|ru\/)?news\/">[^<]+<\/a>/g, '')
    .replace(/<p class="hero-lede">[\s\S]*?<\/p>/,
      `<p class="hero-lede">${escapeHtml(paragraphs[0])}</p>`)
    .replace(/<ul class="quick-points"[^>]*>[\s\S]*?<\/ul>/,
      `<ul class="quick-points" aria-label="${escapeHtml(listing.shortDescription)}">${eol}` +
      points.map(point => `          <li>${escapeHtml(point)}</li>`).join(eol) + `${eol}        </ul>`)
    .replace(/<figure class="phone-frame(?: phone-frame-v1603)?">[\s\S]*?<\/figure>/,
      `<figure class="phone-frame phone-frame-v1603">${eol}` +
      `          <img src="/assets/screenshots/v1-603/screenshot-1.png" width="333" height="592" decoding="async" ` +
      `alt="${escapeHtml(`${features[0].title}. ${features[0].description}`)}" fetchpriority="high">${eol}` +
      '        </figure>')
    .replace(/\s*<div class="rate-note rate-note-bottom"[\s\S]*?<\/div>/, '')
    .replace(/<div class="feature-grid">[\s\S]*?<\/div>\s*<\/section>/,
      `${renderFeatureGrid(features, eol)}${eol}    </section>`)
    .replace(/<div class="screenshot-grid">[\s\S]*?<\/div>\s*<\/div>\s*<\/section>/,
      `${renderScreenshotGrid(features, eol)}${eol}      </div>${eol}    </section>`)
    .replace(/(<div class="about-copy">[\s\S]*?<h2 id="about-title">[\s\S]*?<\/h2>)\s*<p>[\s\S]*?<\/p>\s*<p>[\s\S]*?<\/p>(\s*<\/div>)/,
      `$1${eol}        <p>${escapeHtml(paragraphs[0])}</p>${eol}` +
      `        <p>${escapeHtml(firstSentences(paragraphs[3], 2))}</p>$2`);

  result = result.replace(/(<meta name="description" content=")[^"]*(">)/,
    `$1${escapeHtml(listing.shortDescription)}$2`);
  result = result.replace(/(<meta property="og:description" content=")[^"]*(">)/,
    `$1${escapeHtml(listing.shortDescription)}$2`);
  result = result.replace(/(<meta name="twitter:description" content=")[^"]*(">)/,
    `$1${escapeHtml(listing.shortDescription)}$2`);
  result = result.replace(/("description"\s*:\s*")[^"]*(")/,
    `$1${listing.shortDescription.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}$2`);
  return result;
}

export async function syncHomepages() {
  let updated = 0;
  for (const locale of locales) {
    const listing = listingByLocale.get(listingLocale(locale.androidLocale));
    if (!listing) throw new Error(`Missing Play listing for ${locale.androidLocale}`);
    const strings = await loadResourceStrings(locale.androidLocale);
    const file = path.join(root, locale.url === '/' ? 'index.html' : `${locale.url.slice(1)}index.html`);
    const before = await fs.readFile(file, 'utf8');
    const after = updateHomepage(before, { listing, strings, locale });
    if (after !== before) {
      await fs.writeFile(file, after, 'utf8');
      updated += 1;
    }
  }

  const templatePath = path.join(root, 'tools', 'templates', 'index.html');
  const templateBefore = await fs.readFile(templatePath, 'utf8');
  const templateAfter = updateHomepage(templateBefore, {
    listing: listingByLocale.get('en'),
    strings: await loadResourceStrings('en'),
    locale: locales.find(locale => locale.webLocale === 'en')
  });
  if (templateAfter !== templateBefore) await fs.writeFile(templatePath, templateAfter, 'utf8');
  console.log(`Updated ${updated} localized homepages for release 1.603.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await syncHomepages();
