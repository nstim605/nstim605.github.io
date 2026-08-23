import fs from 'node:fs/promises';
import path from 'node:path';
import { createRunTimestamp, writeGeneratedJson } from './generated-json.mjs';

const root = path.resolve(import.meta.dirname, '..');
const androidRoot = path.resolve(root, '..');
const getRunTimestamp = createRunTimestamp();
// The English production homepage contains separately approved metadata that is
// intentionally newer than the localization template. Never overwrite it while
// regenerating localized policy pages.
const preserved = new Set(['en']);
const preservedPolicies = new Set(['en', 'sr', 'bs', 'hr', 'sq', 'mk', 'bg']);
const locales = [
  ['en', '', 'English', 'ltr'], ['sr', 'sr', 'Српски', 'ltr'], ['bs', 'bs', 'Bosanski', 'ltr'],
  ['hr', 'hr', 'Hrvatski', 'ltr'], ['sq', 'sq', 'Shqip', 'ltr'], ['mk', 'mk', 'Македонски', 'ltr'],
  ['bg', 'bg', 'Български', 'ltr'], ['ro', 'ro', 'Română', 'ltr'], ['hu', 'hu', 'Magyar', 'ltr'],
  ['pl', 'pl', 'Polski', 'ltr'], ['cs', 'cs', 'Čeština', 'ltr'], ['sk', 'sk', 'Slovenčina', 'ltr'],
  ['sl', 'sl', 'Slovenščina', 'ltr'], ['de', 'de', 'Deutsch', 'ltr'], ['fr', 'fr', 'Français', 'ltr'],
  ['it', 'it', 'Italiano', 'ltr'], ['es-ES', 'es-es', 'Español (España)', 'ltr'],
  ['es-419', 'es-419', 'Español (Latinoamérica)', 'ltr'], ['pt-BR', 'pt-br', 'Português (Brasil)', 'ltr'],
  ['pt-PT', 'pt-pt', 'Português (Portugal)', 'ltr'], ['nl', 'nl', 'Nederlands', 'ltr'],
  ['da', 'da', 'Dansk', 'ltr'], ['sv', 'sv', 'Svenska', 'ltr'], ['nb', 'nb', 'Norsk bokmål', 'ltr'],
  ['fi', 'fi', 'Suomi', 'ltr'], ['is', 'is', 'Íslenska', 'ltr'], ['el', 'el', 'Ελληνικά', 'ltr'],
  ['tr', 'tr', 'Türkçe', 'ltr'], ['ru', 'ru', 'Русский', 'ltr'], ['uk', 'uk', 'Українська', 'ltr'],
  ['ar', 'ar', 'العربية', 'rtl'], ['iw', 'he', 'עברית', 'rtl'], ['fa', 'fa', 'فارسی', 'rtl'],
  ['ur', 'ur', 'اردو', 'rtl'], ['hi', 'hi', 'हिन्दी', 'ltr'], ['bn', 'bn', 'বাংলা', 'ltr'],
  ['in', 'id', 'Bahasa Indonesia', 'ltr'], ['ms', 'ms', 'Bahasa Melayu', 'ltr'], ['th', 'th', 'ไทย', 'ltr'],
  ['vi', 'vi', 'Tiếng Việt', 'ltr'], ['zh-Hans', 'zh-hans', '简体中文', 'ltr'],
  ['zh-Hant', 'zh-hant', '繁體中文', 'ltr'], ['ja', 'ja', '日本語', 'ltr'], ['ko', 'ko', '한국어', 'ltr']
].map(([android, route, name, dir]) => ({ android, route, name, dir,
  web: android === 'iw' ? 'he' : android === 'in' ? 'id' : android }));

const configPath = path.join(androidRoot, 'app', 'src', 'main', 'res', 'xml', 'locales_config.xml');
const config = await fs.readFile(configPath, 'utf8');
const androidLocales = [...config.matchAll(/android:name="([^"]+)"/g)].map(match => match[1]);
if (JSON.stringify(androidLocales) !== JSON.stringify(locales.map(locale => locale.android))) {
  throw new Error(`Android locale source changed: ${androidLocales.join(', ')}`);
}

const resourceFolders = {
  'es-ES': 'values-es-rES', 'es-419': 'values-b+es+419', 'pt-BR': 'values-pt-rBR',
  'pt-PT': 'values-pt-rPT', 'zh-Hans': 'values-b+zh+Hans', 'zh-Hant': 'values-b+zh+Hant'
};
const webCopy = JSON.parse(await fs.readFile(path.join(root, 'tools', 'web-copy.json'), 'utf8'));
const phase1dPolicyCopy = JSON.parse(await fs.readFile(path.join(root, 'tools', 'privacy-policy-phase1d.json'), 'utf8'));
const phase1dPolicySupplement = JSON.parse(await fs.readFile(path.join(root, 'tools', 'privacy-policy-phase1d-supplement.json'), 'utf8'));
const homeTemplate = await fs.readFile(path.join(root, 'tools', 'templates', 'index.html'), 'utf8');
const policyTemplate = await fs.readFile(path.join(root, 'tools', 'templates', 'privacy-policy.html'), 'utf8');

function decodeXml(value) {
  return value.replace(/<[^>]+>/g, '').replaceAll('&lt;', '<').replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"').replaceAll('&apos;', "'").replaceAll('&#39;', "'").replaceAll('&amp;', '&')
    .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
    .replace(/\\n/g, '\n').replace(/\\'/g, "'").replace(/\\"/g, '"').trim();
}

async function androidStrings(locale) {
  const folder = locale.android === 'en' ? 'values' : (resourceFolders[locale.android] ?? `values-${locale.android}`);
  const source = await fs.readFile(path.join(androidRoot, 'app', 'src', 'main', 'res', folder, 'strings.xml'), 'utf8');
  const strings = {};
  for (const match of source.matchAll(/<string\s+name="([^"]+)"[^>]*>([\s\S]*?)<\/string>/g)) strings[match[1]] = decodeXml(match[2]);
  const required = ['refresh_rates', 'select_currency', 'search_currency', 'favorites', 'calculator_add',
    'calculator_subtract', 'calculator_multiply', 'calculator_divide', 'history_title', 'history_empty_body',
    'theme', 'theme_dark', 'theme_light', 'about_description', 'data_source', 'disclaimer', 'privacy_policy',
    'contact_developer', 'privacy_last_updated', 'privacy_policy_body', 'all_currencies', 'offline_ready',
    'prepare_offline', 'back', 'actual_cost_title', 'actual_cost_explanation', 'travel_board_title',
    'trip_presets_title', 'trip_presets_explanation', 'pinned_pairs_title', 'no_pinned_pairs_body',
    'use_again', 'widget_description', 'move_up', 'move_down', 'add_currency'];
  const missing = required.filter(key => !strings[key]);
  if (missing.length) throw new Error(`${locale.android}: missing Android strings: ${missing.join(', ')}`);
  return { strings, folder };
}

const esc = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const brand = 'Balkan Currency Converter';
const webPolicyDate = value => value;

function localMap(strings, copy) {
  const calculator = [strings.calculator_add, strings.calculator_subtract, strings.calculator_multiply, strings.calculator_divide].join(' · ');
  const map = {
    'Balkan Currency Converter — Convert currencies quickly, anywhere': `${brand} — ${copy.h1}`,
    'Convert currencies worldwide with Actual Cost, Travel Board, saved sets, offline rates, pinned pairs, history, and a home-screen widget.': copy.marketingSummary,
    'Convert currencies worldwide with travel-ready tools, offline rates, and a clear view of exchange costs.': copy.marketingSummary,
    'Balkan Currency Converter app preview': `${brand} — ${copy.seeApp}`,
    'Skip to content': copy.seeApp,
    'Balkan Currency Converter home': brand,
    'Main navigation': copy.features,
    'Features': copy.features,
    'Screenshots': copy.screenshots,
    'Privacy': strings.privacy_policy,
    'Switch color theme': strings.theme,
    'Get Balkan Currency Converter on Google Play': `${brand} — Google Play`,
    'Get it on Google Play': 'Google Play',
    'Currency utility for Android': strings.about_description,
    'Convert currencies quickly, anywhere': copy.h1,
    'Compare exchange terms with Actual Cost, view several currencies on the Travel Board, and save rates for offline trips.': copy.marketingSummary,
    'See the app': copy.seeApp,
    'App highlights': copy.features,
    'Actual Cost comparison': strings.actual_cost_title,
    'Multi-currency Travel Board': strings.travel_board_title,
    'Offline saved rates': strings.prepare_offline,
    'Saved for offline use': strings.offline_ready,
    'Everything you need': copy.features,
    'Useful tools, without the clutter': copy.toolsHeading,
    'Built for quick everyday calculations while travelling, shopping, or comparing prices.': copy.marketingSummary,
    'Actual Cost': strings.actual_cost_title,
    'Compare exchange terms and fees with the app’s reference rate.': strings.actual_cost_explanation,
    'Travel Board': strings.travel_board_title,
    'View several currencies together and reorder them for each trip.': `${strings.add_currency}. ${strings.move_up} / ${strings.move_down}.`,
    'Saved sets &amp; offline travel': `${strings.trip_presets_title} · ${strings.prepare_offline}`,
    'Open saved trip sets and prepare their rates for offline use.': `${strings.trip_presets_explanation} ${strings.prepare_offline}.`,
    'Pinned pairs': strings.pinned_pairs_title,
    'Pin a pair from History for quick access.': strings.no_pinned_pairs_body,
    'History &amp; 30-day charts': strings.history_title,
    'Reuse past conversions and review a pair’s recent direction.': `${strings.use_again}. ${strings.history_empty_body}`,
    'Global currency coverage': copy.globalCoverage,
    'Convert currencies used across dozens of countries with an adaptive, localized interface.': strings.all_currencies,
    'Inside the app': copy.seeApp,
    'A clear view of every conversion': copy.screenshots,
    'Real screens from Balkan Currency Converter on Android.': strings.about_description,
    'Balkan Currency Converter 1.4 main converter with calculator keypad': `${copy.seeApp}: ${calculator}`,
    'Balkan Currency Converter 1.4 main conversion screen showing euros and US dollars': `${brand}: ${strings.select_currency}`,
    'Convert and calculate': calculator,
    'Rates and arithmetic in one place': strings.about_description,
    'Actual Cost screen comparing an exchange quote and fees with the reference rate': strings.actual_cost_explanation,
    'See the real exchange cost': strings.actual_cost_title,
    'Compare offered terms and fees': strings.actual_cost_explanation,
    'Travel Board showing several currencies with flags and reorder controls': strings.travel_board_title,
    'Compare a whole trip': strings.travel_board_title,
    'View and reorder several currencies': `${strings.move_up} / ${strings.move_down}`,
    'Saved Sets screen with trips ready for offline use': `${strings.trip_presets_title}: ${strings.offline_ready}`,
    'Prepare trips offline': strings.prepare_offline,
    'Save sets and cache their rates': `${strings.trip_presets_title} · ${strings.prepare_offline}`,
    'Why Balkan Currency Converter': brand,
    'Made for real-world calculations wherever you are': copy.h1,
    'Whether you are travelling, shopping across borders, or checking an everyday price, the app gives you access to currencies used across many countries worldwide.': strings.about_description,
    'Save trip sets, pin pairs from your history, check 30-day rate charts, and keep a cached conversion on your home screen.': `${strings.trip_presets_title}. ${strings.pinned_pairs_title}. ${strings.history_title}. ${strings.widget_description}.`,
    'Balkan Currency Converter app icon': brand,
    'Ready when you are': copy.seeApp,
    'Take the converter with you': copy.ctaHeading,
    'Download Balkan Currency Converter for Android from Google Play.': `${brand} — Google Play`,
    'Currency conversion for Android': strings.about_description,
    'Footer navigation': strings.privacy_policy,
    'Privacy Policy': strings.privacy_policy,
    'Analytics choices': copy.analyticsChoices,
    'Contact': strings.contact_developer,
    'Switch to light theme': `${strings.theme}: ${strings.theme_light}`,
    'Switch to dark theme': `${strings.theme}: ${strings.theme_dark}`,
    'Privacy Policy — Balkan Currency Converter': `${strings.privacy_policy} — ${brand}`,
    'Privacy Policy for the Balkan Currency Converter Android application and website.': strings.privacy_policy,
    'How Balkan Currency Converter handles app data, exchange-rate requests, local storage, and advertising.': strings.privacy_policy_body.split('\n\n')[0],
    'Back to home': strings.back,
    'Last updated:': webPolicyDate(strings.privacy_last_updated),
    'Home': strings.back
  };
  return Object.fromEntries(Object.entries(map).map(([key, value]) => [key, esc(value)]));
}

function applyMap(html, map) {
  const scripts = [];
  let output = html.replace(/<script[\s\S]*?<\/script>/g, script => {
    scripts.push(script); return `<script data-localization-mask="${scripts.length - 1}"></script>`;
  });
  output = output.replace(/>([^<>]+)</g, (whole, value) => {
    const trimmed = value.trim();
    if (!map[trimmed]) return whole;
    const start = value.indexOf(trimmed);
    return `>${value.slice(0, start)}${map[trimmed]}${value.slice(start + trimmed.length)}<`;
  });
  output = output.replace(/\b(aria-label|title|alt|data-label-light|data-label-dark)="([^"]+)"/g,
    (whole, name, value) => `${name}="${map[value] ?? value}"`);
  output = output.replace(/(<meta\s+(?:name|property)="(?:description|og:title|og:description|og:image:alt|twitter:title|twitter:description)"\s+content=")([^"]+)(")/g,
    (whole, before, value, after) => before + (map[value] ?? value) + after);
  return output.replace(/<script data-localization-mask="(\d+)"><\/script>/g, (_, index) => scripts[Number(index)]);
}

function linkify(value) {
  return value.replace(/https:\/\/policies\.google\.com\/privacy/g, '<a href="https://policies.google.com/privacy">Google Privacy Policy</a>')
    .replace(/https:\/\/policies\.google\.com\/technologies\/ads/g, '<a href="https://policies.google.com/technologies/ads">Google advertising policies</a>');
}

function phase1dPolicySection(copy) {
  return `      <!-- PHASE1D_POLICY_START -->
      <h2 id="android-analytics">${esc(copy.analyticsHeading)}</h2>
      <p>${esc(copy.analyticsConsent)}</p>
      <p>${esc(copy.analyticsData)}</p>
      <p>${esc(copy.analyticsWithdrawal)}</p>

      <h2 id="app-advertising-consent">${esc(copy.advertisingHeading)}</h2>
      <p>${esc(copy.advertisingSummary)}</p>

      <h2 id="local-app-data">${esc(copy.localHeading)}</h2>
      <p>${esc(copy.localSummary)}</p>

      <h2 id="website-qa-isolation">${esc(copy.websiteQaHeading)}</h2>
      <p>${esc(copy.websiteQaSummary)}</p>

      <h2 id="security">${esc(copy.securityHeading)}</h2>
      <p>${esc(copy.securitySummary)}</p>
      <!-- PHASE1D_POLICY_END -->`;
}

function policyArticle(strings, copy, policyCopy) {
  const phaseParagraphs = new Set([
    policyCopy.analyticsConsent, policyCopy.analyticsData, policyCopy.analyticsWithdrawal,
    policyCopy.advertisingSummary, policyCopy.localSummary,
    policyCopy.websiteQaSummary, policyCopy.securitySummary
  ]);
  const paragraphs = strings.privacy_policy_body.split(/\n\n+/)
    .filter(paragraph => !phaseParagraphs.has(paragraph))
    .map(paragraph => `      <p>${linkify(esc(paragraph))}</p>`);
  paragraphs.splice(1, 0, `      <h2 id="website-analytics">${esc(copy.consentTitle)}</h2>`,
    `      <p>${esc(copy.analyticsSummary)}</p>`,
    `      <p>${esc(copy.learnMore)}: <a href="https://policies.google.com/privacy">Google Privacy Policy</a> · <a href="https://support.google.com/analytics/answer/11593727">Google Analytics</a>.</p>`);
  paragraphs.push(phase1dPolicySection(policyCopy));
  paragraphs.push(`      <h2 id="contact">${esc(strings.contact_developer)}</h2>`);
  return `    <article class="policy-card">\n${paragraphs.join('\n\n')}\n    </article>`;
}

function updatePreservedPolicy(html, policyCopy, lastUpdated) {
  const withoutPrevious = html.replace(/\s*<!-- PHASE1D_POLICY_START -->[\s\S]*?<!-- PHASE1D_POLICY_END -->\s*/g, '\n\n');
  const withSection = withoutPrevious.replace(
    /\s*<h2 id="website-analytics">/,
    `\n\n${phase1dPolicySection(policyCopy)}\n\n      <h2 id="website-analytics">`
  );
  return withSection.replace(
    /<p class="policy-meta">[\s\S]*?<\/p>/,
    `<p class="policy-meta">${esc(lastUpdated)}</p>`
  );
}

function consentTemplate(copy, page) {
  const privacyLink = page === 'home' ? 'privacy-policy.html#website-analytics' : '#website-analytics';
  return `\n  <template id="analytics-consent-template">\n    <div class="analytics-consent-copy">\n      <strong id="analytics-consent-title">${esc(copy.consentTitle)}</strong>\n      <p id="analytics-consent-description">${esc(copy.consentHelp)} <a href="${privacyLink}">${esc(copy.learnMore)}</a>.</p>\n    </div>\n    <div class="analytics-consent-actions">\n      <button class="analytics-consent-button analytics-consent-accept" type="button">${esc(copy.acceptAnalytics)}</button>\n      <button class="analytics-consent-button analytics-consent-reject" type="button">${esc(copy.rejectAnalytics)}</button>\n    </div>\n  </template>`;
}

function urlFor(locale, page = 'home') {
  const base = locale.route ? `/${locale.route}/` : '/';
  return page === 'home' ? base : `${base}privacy-policy.html`;
}

function alternateLinks(page) {
  return locales.map(locale => `  <link rel="alternate" hreflang="${locale.web}" href="https://balkanconverter.com${urlFor(locale, page)}">`)
    .concat(`  <link rel="alternate" hreflang="x-default" href="https://balkanconverter.com${urlFor(locales[0], page)}">`).join('\n');
}

function languageSelector(current, page) {
  const links = locales.map(locale => `          <a href="${urlFor(locale, page)}" hreflang="${locale.web}" lang="${locale.web}"${locale.dir === 'rtl' ? ' dir="rtl"' : ''}${locale.android === current.android ? ' aria-current="page"' : ''}>${locale.name}</a>`).join('\n');
  return `        <details class="language-selector">\n          <summary aria-label="${current.name}"><span aria-hidden="true">🌐</span><span>${current.name}</span></summary>\n          <div class="language-menu">\n${links}\n          </div>\n        </details>\n`;
}

function finalize(html, locale, page, copy, strings) {
  const prefix = locale.route ? '../' : '';
  html = html.replace(/<html lang="[^"]+"(?: dir="[^"]+")?>/, `<html lang="${locale.web}"${locale.dir === 'rtl' ? ' dir="rtl"' : ''}>`);
  html = html.replace(/  <link rel="canonical"[^>]+>/, `  <link rel="canonical" href="https://balkanconverter.com${urlFor(locale, page)}">\n${alternateLinks(page)}`);
  html = html.replace(/<meta property="og:url" content="[^"]+">/, `<meta property="og:url" content="https://balkanconverter.com${urlFor(locale, page)}">`);
  html = html.replace('<div class="nav-actions">', `<div class="nav-actions">\n${languageSelector(locale, page)}`);
  html = html.replaceAll('href="assets/', `href="${prefix}assets/`).replaceAll('src="assets/', `src="${prefix}assets/`);
  html = html.replaceAll('href="styles.css"', `href="${prefix}styles.css"`).replaceAll('href="site.webmanifest"', `href="${prefix}site.webmanifest"`);
  html = html.replaceAll('src="script.js"', `src="${prefix}script.js"`).replaceAll('src="analytics.js"', `src="${prefix}analytics.js"`);
  html = html.replace(/class="theme-toggle" type="button"/, `class="theme-toggle" type="button" data-label-light="${esc(`${strings.theme}: ${strings.theme_light}`)}" data-label-dark="${esc(`${strings.theme}: ${strings.theme_dark}`)}"`);
  if (page === 'policy') html = html.replaceAll('href="/"', `href="${urlFor(locale, 'home')}"`);
  html = html.replace('class="brand" href="/"', `class="brand" href="${urlFor(locale, 'home')}"`);
  html = html.replaceAll('<span>Balkan Currency Converter</span>', '<span dir="ltr">Balkan Currency Converter</span>');
  html = html.replaceAll('<strong>Balkan Currency Converter</strong>', '<strong dir="ltr">Balkan Currency Converter</strong>');
  html = html.replace('</body>', `${consentTemplate(copy, page)}\n</body>`);
  const marketingDescription = `${strings.about_description} ${strings.actual_cost_title} · ${strings.travel_board_title} · ${strings.trip_presets_title} · ${strings.prepare_offline} · ${strings.pinned_pairs_title} · ${strings.history_title} · ${strings.widget_description}.`;
  html = html.replace(/"description": "[^"]+"/, `"description": ${JSON.stringify(marketingDescription)}`);
  return html;
}

function sourceStrings(html) {
  const withoutScripts = html.replace(/<script[\s\S]*?<\/script>/g, '');
  const values = new Set();
  withoutScripts.replace(/>([^<>]+)</g, (_, value) => {
    const text = value.trim(); if (/[\p{L}\p{N}]/u.test(text) && text !== '2026') values.add(text); return _;
  });
  withoutScripts.replace(/\b(?:aria-label|title|alt|data-label-light|data-label-dark)="([^"]+)"/g, (_, value) => { if (value) values.add(value); return _; });
  withoutScripts.replace(/<meta\s+(?:name|property)="(?:description|og:title|og:description|og:image:alt|twitter:title|twitter:description)"\s+content="([^"]+)"/g, (_, value) => { values.add(value); return _; });
  return [...values];
}

const sourceInventory = { source: ['tools/templates/index.html', 'tools/templates/privacy-policy.html'],
  home: sourceStrings(homeTemplate), privacyPolicy: sourceStrings(policyTemplate) };
await writeGeneratedJson(path.join(root, 'tools', 'production-strings.json'), sourceInventory, {
  getRunTimestamp,
  generatedAtIndex: 1
});

const generated = [];
const sources = [];
for (const locale of locales) {
  const copy = webCopy[locale.web];
  const policyCopy = { ...phase1dPolicyCopy[locale.web], ...phase1dPolicySupplement[locale.web] };
  if (!copy) throw new Error(`${locale.android}: missing local web copy (${locale.web})`);
  if (!policyCopy) throw new Error(`${locale.android}: missing Phase 1D policy copy (${locale.web})`);
  if (!copy.marketingSummary) throw new Error(`${locale.android}: missing localized marketing summary (${locale.web})`);
  const { strings, folder } = await androidStrings(locale);
  const map = localMap(strings, copy);
  let home = locale.android === 'en' ? homeTemplate : applyMap(homeTemplate, map);
  let policy = policyTemplate.replace(/    <article class="policy-card">[\s\S]*?    <\/article>/, policyArticle(strings, copy, policyCopy));
  policy = applyMap(policy, map);
  policy = policy.replace(/<p class="policy-meta">[\s\S]*?<\/p>/, `<p class="policy-meta">${esc(webPolicyDate(strings.privacy_last_updated))}</p>`);
  home = finalize(home, locale, 'home', copy, strings);
  policy = finalize(policy, locale, 'policy', copy, strings);
  const directory = path.join(root, locale.route);
  await fs.mkdir(directory, { recursive: true });
  if (!preserved.has(locale.android)) await fs.writeFile(path.join(directory, 'index.html'), home);
  if (preservedPolicies.has(locale.android)) {
    const preservedPath = path.join(directory, 'privacy-policy.html');
    const preservedPolicy = await fs.readFile(preservedPath, 'utf8');
    await fs.writeFile(preservedPath, updatePreservedPolicy(preservedPolicy, policyCopy, webPolicyDate(strings.privacy_last_updated)));
  } else {
    await fs.writeFile(path.join(directory, 'privacy-policy.html'), policy);
  }
  if (!preserved.has(locale.android)) generated.push(locale.android);
  sources.push({ locale: locale.android, webLocale: locale.web, androidResource: `app/src/main/res/${folder}/strings.xml` });
}

const manifest = { androidSource: '../app/src/main/res/xml/locales_config.xml',
  preservedLocales: [...preserved], generatedLocales: generated, terminologySources: sources,
  locales: locales.map(locale => ({ androidLocale: locale.android, webLocale: locale.web, hreflang: locale.web,
    url: urlFor(locale), privacyUrl: urlFor(locale, 'policy'), dir: locale.dir, name: locale.name })) };
await writeGeneratedJson(path.join(root, 'site-locales.json'), manifest, { getRunTimestamp });

const xmlEsc = value => value.replaceAll('&', '&amp;');
const sitemapLinks = page => locales.map(locale => `    <xhtml:link rel="alternate" hreflang="${locale.web}" href="${xmlEsc(`https://balkanconverter.com${urlFor(locale, page)}`)}" />`)
  .concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${xmlEsc(`https://balkanconverter.com${urlFor(locales[0], page)}`)}" />`).join('\n');
const urls = [];
for (const page of ['home', 'policy']) for (const locale of locales) urls.push(`  <url>\n    <loc>${xmlEsc(`https://balkanconverter.com${urlFor(locale, page)}`)}</loc>\n${sitemapLinks(page)}\n  </url>`);
await fs.writeFile(path.join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`);
console.log(`Generated ${generated.length} locales from local Android resources; preserved ${preserved.size}; total ${locales.length}.`);
