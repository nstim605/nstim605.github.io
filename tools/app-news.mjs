import fs from 'node:fs';
import path from 'node:path';

const upcoming = {
  en: 'Coming in 1.613', sr: 'Ускоро у верзији 1.613', bs: 'Uskoro u verziji 1.613',
  hr: 'Uskoro u verziji 1.613', sq: 'Së shpejti në versionin 1.613', mk: 'Наскоро во верзијата 1.613',
  bg: 'Скоро във версия 1.613', ro: 'În curând în versiunea 1.613', hu: 'Hamarosan az 1.613-as verzióban',
  pl: 'Wkrótce w wersji 1.613', cs: 'Již brzy ve verzi 1.613', sk: 'Čoskoro vo verzii 1.613',
  sl: 'Kmalu v različici 1.613', de: 'Demnächst in Version 1.613', fr: 'Bientôt dans la version 1.613',
  it: 'In arrivo nella versione 1.613', 'es-ES': 'Próximamente en la versión 1.613',
  'es-419': 'Próximamente en la versión 1.613', 'pt-BR': 'Em breve na versão 1.613',
  'pt-PT': 'Em breve na versão 1.613', nl: 'Binnenkort in versie 1.613', da: 'Kommer i version 1.613',
  sv: 'Kommer i version 1.613', nb: 'Kommer i versjon 1.613', fi: 'Tulossa versioon 1.613',
  is: 'Væntanlegt í útgáfu 1.613', el: 'Σύντομα στην έκδοση 1.613', tr: 'Yakında 1.613 sürümünde',
  ru: 'Скоро в версии 1.613', uk: 'Незабаром у версії 1.613', ar: 'قريبًا في الإصدار 1.613',
  he: 'בקרוב בגרסה 1.613', fa: 'به‌زودی در نسخهٔ 1.613', ur: 'جلد ہی ورژن 1.613 میں',
  hi: 'संस्करण 1.613 में जल्द आ रहा है', bn: 'শীঘ্রই সংস্করণ 1.613-এ আসছে',
  id: 'Segera hadir di versi 1.613', ms: 'Akan datang dalam versi 1.613', th: 'เร็วๆ นี้ในเวอร์ชัน 1.613',
  vi: 'Sắp có trong phiên bản 1.613', 'zh-Hans': '即将在 1.613 版推出', 'zh-Hant': '即將在 1.613 版推出',
  ja: 'バージョン1.613で近日公開', ko: '버전 1.613에서 곧 제공'
};

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
    const status = upcoming[locale.hreflang];
    if (!status) throw new Error(`Missing upcoming release status for ${locale.hreflang}`);
    const exampleNumber = new Intl.NumberFormat(locale.hreflang, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    // The app illustrates this card with the same source, rate, and result.
    const selectedTextExample = `${required('process_text_result_title')}: ${exampleNumber.format(149.99)} EUR → ${exampleNumber.format(149.99 * 116.87)} RSD (1 EUR = ${exampleNumber.format(116.87)} RSD)`;
    result[locale.hreflang] = {
      title: required('menu_whats_new'),
      cards: features.map(([id, title, body]) => ({
        id, title: required(title), ...(body ? {body: required(body)} : {}),
        ...(id === 'ProcessText' ? {body: selectedTextExample} : {}),
        ...(id === 'Keyboard' ? {version: '1.613', published: false, status} : {})
      }))
    };
  }
  return result;
}

export function renderNewsCards(news) {
  return news.cards.map(card => `      <article class="app-update-card" data-app-feature="${card.id}">
${card.status ? `        <p class="eyebrow upcoming-release">${escapeHtml(card.status)}</p>\n` : ''}        <h2>${escapeHtml(card.title)}</h2>
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
