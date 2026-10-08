import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SUPPORTED_NEWS_LOCALES, validateStoryQuality } from './core.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const origin = 'https://balkanconverter.com';
const storyDataPath = path.join(root, 'news', 'data', 'stories.json');
const generatedPathsPath = path.join(root, 'news', 'data', 'generated-pages.json');
const newsConfig = JSON.parse(await fs.readFile(path.join(root, 'news', 'config.json'), 'utf8'));
const newsPublic = newsConfig.public === true;

const currencyMeta = {
  EUR: { flag: '🇪🇺', target: 'RSD' },
  USD: { flag: '🇺🇸', target: 'EUR' },
  RSD: { flag: '🇷🇸', target: 'EUR' },
  GBP: { flag: '🇬🇧', target: 'EUR' },
  CHF: { flag: '🇨🇭', target: 'EUR' },
  JPY: { flag: '🇯🇵', target: 'EUR' },
  CAD: { flag: '🇨🇦', target: 'USD' },
  AUD: { flag: '🇦🇺', target: 'USD' },
  CNY: { flag: '🇨🇳', target: 'USD' }
};

const ui = {
  en: {
    htmlLocale: 'en', prefix: '', localeName: 'English', dateLocale: 'en-GB',
    pageTitle: 'Currency News', eyebrow: 'Financial context for currency users',
    pageDescription: 'Concise, source-linked updates about central banks, interest rates, inflation and currencies—without forecasts or investment advice.',
    home: 'Home', converter: 'Currency converter', news: 'News', privacy: 'Privacy Policy',
    all: 'All', filterLabel: 'Filter news by currency', empty: 'No stories match this currency.',
    related: 'Related currencies', read: 'Read story', source: 'Source', sources: 'Sources',
    summary: 'Summary', happened: 'What happened', matters: 'Why it matters',
    back: 'Back to Currency News', published: 'Published', updated: 'Updated',
    disclaimer: 'Information only. This is not financial or investment advice.',
    footer: 'Currency conversion for Android', themeLight: 'Theme: Light', themeDark: 'Theme: Dark',
    categories: { 'Interest Rates': 'Interest Rates', 'Central Banks': 'Central Banks', Inflation: 'Inflation', Currency: 'Currency', Economy: 'Economy', Forex: 'Forex', Commodities: 'Commodities' }
  },
  sr: {
    htmlLocale: 'sr', prefix: '/sr', localeName: 'Српски', dateLocale: 'sr-Cyrl-RS',
    pageTitle: 'Вести о валутама', eyebrow: 'Финансијски контекст за кориснике конвертора',
    pageDescription: 'Сажете вести са изворима о централним банкама, каматним стопама, инфлацији и валутама — без прогноза и инвестиционих савета.',
    home: 'Почетна', converter: 'Конвертор валута', news: 'Вести', privacy: 'Политика приватности',
    all: 'Све', filterLabel: 'Филтрирај вести по валути', empty: 'Нема вести за изабрану валуту.',
    related: 'Повезане валуте', read: 'Прочитај вест', source: 'Извор', sources: 'Извори',
    summary: 'Сажетак', happened: 'Шта се догодило', matters: 'Зашто је важно',
    back: 'Назад на вести о валутама', published: 'Објављено', updated: 'Ажурирано',
    disclaimer: 'Само информативно. Ово није финансијски нити инвестициони савет.',
    footer: 'Конверзија валута за Android', themeLight: 'Тема: светла', themeDark: 'Тема: тамна',
    categories: { 'Interest Rates': 'Каматне стопе', 'Central Banks': 'Централне банке', Inflation: 'Инфлација', Currency: 'Валуте', Economy: 'Економија', Forex: 'Девизно тржиште', Commodities: 'Роба' }
  },
  ru: {
    htmlLocale: 'ru', prefix: '/ru', localeName: 'Русский', dateLocale: 'ru-RU',
    pageTitle: 'Валютные новости', eyebrow: 'Финансовый контекст для пользователей конвертера',
    pageDescription: 'Краткие новости со ссылками на источники о центральных банках, ставках, инфляции и валютах — без прогнозов и инвестиционных советов.',
    home: 'Главная', converter: 'Конвертер валют', news: 'Новости', privacy: 'Политика конфиденциальности',
    all: 'Все', filterLabel: 'Фильтр новостей по валюте', empty: 'Для выбранной валюты новостей нет.',
    related: 'Связанные валюты', read: 'Читать новость', source: 'Источник', sources: 'Источники',
    summary: 'Кратко', happened: 'Что произошло', matters: 'Почему это важно',
    back: 'Назад к валютным новостям', published: 'Опубликовано', updated: 'Обновлено',
    disclaimer: 'Только для информации. Это не финансовая и не инвестиционная рекомендация.',
    footer: 'Конвертация валют для Android', themeLight: 'Тема: светлая', themeDark: 'Тема: тёмная',
    categories: { 'Interest Rates': 'Процентные ставки', 'Central Banks': 'Центральные банки', Inflation: 'Инфляция', Currency: 'Валюты', Economy: 'Экономика', Forex: 'Форекс', Commodities: 'Сырьевые товары' }
  }
};

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function absolute(route) {
  return new URL(route, origin).href;
}

function newsRoute(locale, slug = '') {
  return `${ui[locale].prefix}/news/${slug ? `${slug}/` : ''}` || '/news/';
}

function localPath(route) {
  return path.join(root, ...route.split('/').filter(Boolean), 'index.html');
}

function formatDate(value, locale) {
  return new Intl.DateTimeFormat(ui[locale].dateLocale, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(value));
}

function safeJson(value) {
  return JSON.stringify(value, null, 2).replace(/</g, '\\u003c');
}

function alternates(slug = '') {
  return [
    ...SUPPORTED_NEWS_LOCALES.map(locale => `  <link rel="alternate" hreflang="${locale}" href="${absolute(newsRoute(locale, slug))}">`),
    `  <link rel="alternate" hreflang="x-default" href="${absolute(newsRoute('en', slug))}">`
  ].join('\n');
}

function languageMenu(locale, slug = '') {
  return SUPPORTED_NEWS_LOCALES.map(code => `          <a href="${newsRoute(code, slug)}" hreflang="${code}" lang="${code}"${code === locale ? ' aria-current="page"' : ''}>${ui[code].localeName}</a>`).join('\n');
}

function header(locale, slug = '') {
  const copy = ui[locale];
  return `  <a class="skip-link" href="#main">${locale === 'en' ? 'Skip to content' : locale === 'sr' ? 'Пређи на садржај' : 'Перейти к содержанию'}</a>
  <header class="site-header">
    <div class="shell nav-wrap">
      <a class="brand" href="${copy.prefix}/" aria-label="Balkan Currency Converter">
        <img src="/assets/icons/v1-603/app-icon-v1-603.png" width="42" height="42" alt="">
        <span dir="ltr">Balkan Currency Converter</span>
      </a>
      <nav class="nav-links" aria-label="${locale === 'en' ? 'Main navigation' : locale === 'sr' ? 'Главна навигација' : 'Основная навигация'}">
        <a href="${copy.prefix}/">${copy.home}</a>
        <a href="${copy.prefix}/currency-converter/">${copy.converter}</a>
        <a href="${copy.prefix}/news/" aria-current="page">${copy.news}</a>
      </nav>
      <div class="nav-actions">
        <details class="language-selector">
          <summary aria-label="${copy.localeName}"><span aria-hidden="true">🌐</span><span>${copy.localeName}</span></summary>
          <div class="language-menu">
${languageMenu(locale, slug)}
          </div>
        </details>
        <button class="theme-toggle" type="button" data-label-light="${copy.themeLight}" data-label-dark="${copy.themeDark}" aria-label="${copy.themeDark}" title="${copy.themeDark}">
          <span class="theme-icon" aria-hidden="true">◐</span>
        </button>
      </div>
    </div>
  </header>`;
}

function footer(locale) {
  const copy = ui[locale];
  return `  <footer class="site-footer">
    <div class="shell footer-grid">
      <div class="footer-brand">
        <img src="/assets/icons/v1-603/app-icon-v1-603.png" width="44" height="44" alt="">
        <div><strong dir="ltr">Balkan Currency Converter</strong><span>${copy.footer}</span></div>
      </div>
      <nav aria-label="${locale === 'en' ? 'Footer navigation' : locale === 'sr' ? 'Навигација у подножју' : 'Навигация в подвале'}">
        <a href="${copy.prefix}/">${copy.home}</a>
        <a href="${copy.prefix}/currency-converter/">${copy.converter}</a>
        <a href="${copy.prefix}/privacy-policy.html">${copy.privacy}</a>
      </nav>
      <p>© 2026 Balkan Currency Converter</p>
    </div>
  </footer>`;
}

function pageShell({ locale, slug = '', title, description, type = 'website', jsonLd, body,
  robots = newsPublic ? 'index,follow,max-image-preview:large' : 'noindex,nofollow' }) {
  const canonical = absolute(newsRoute(locale, slug));
  return `<!doctype html>
<html lang="${ui[locale].htmlLocale}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#f7f8fa" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#070a0f" media="(prefers-color-scheme: dark)">
  <title>${escapeHtml(title)} — Balkan Currency Converter</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="robots" content="${robots}">
  <link rel="canonical" href="${canonical}">
${alternates(slug)}
  <meta property="og:type" content="${type}">
  <meta property="og:site_name" content="Balkan Currency Converter">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${origin}/assets/og-v1-603.png">
  <meta property="og:image:width" content="1024">
  <meta property="og:image:height" content="500">
  <meta property="og:image:alt" content="Balkan Currency Converter">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${origin}/assets/og-v1-603.png">
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/icons/v1-603/favicon-32.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/assets/icons/v1-603/apple-touch-icon-180.png">
  <link rel="stylesheet" href="/styles.css">
  <link rel="stylesheet" href="/news/news.css">
  <script type="application/ld+json">
${safeJson(jsonLd)}
  </script>
</head>
<body>
${header(locale, slug)}
${body}
${footer(locale)}
  <script src="/script.js" defer></script>
  <script src="/news/news.js" defer></script>
</body>
</html>
`;
}

function currencyChip(code, locale, { link = false } = {}) {
  const copy = ui[locale];
  const meta = currencyMeta[code] ?? { flag: '¤', target: 'EUR' };
  const content = `<span aria-hidden="true">${meta.flag}</span> ${escapeHtml(code)}`;
  if (!link) return `<span class="currency-chip" data-currency-chip="${escapeHtml(code)}">${content}</span>`;
  return `<a class="currency-chip currency-chip-link" href="${copy.prefix}/currency-converter/?source=${encodeURIComponent(code)}&amp;target=${encodeURIComponent(meta.target)}" aria-label="${escapeHtml(`${copy.converter}: ${code} / ${meta.target}`)}">${content}</a>`;
}

function storyCard(story, locale) {
  const copy = ui[locale];
  const translation = story.translations[locale] ?? story.translations.en;
  return `      <article class="news-card" data-news-story data-currencies="${story.currencies.join(' ')}">
        <div class="news-card-meta">
          <span class="news-category">${escapeHtml(copy.categories[story.category] ?? story.category)}</span>
          <time datetime="${escapeHtml(story.publishedAt)}">${escapeHtml(formatDate(story.publishedAt, locale))}</time>
        </div>
        <h2><a href="${newsRoute(locale, story.slug)}">${escapeHtml(translation.headline)}</a></h2>
        <p>${escapeHtml(translation.summary)}</p>
        <div class="news-card-footer">
          <div class="currency-chips" aria-label="${copy.related}">${story.currencies.map(code => currencyChip(code, locale)).join('')}</div>
          <span>${copy.source}: ${escapeHtml(story.sources.map(source => source.name).join(', '))}</span>
        </div>
        <a class="news-card-link" href="${newsRoute(locale, story.slug)}">${copy.read} <span aria-hidden="true">→</span></a>
      </article>`;
}

function renderIndex(stories, locale) {
  const copy = ui[locale];
  const currencies = [...new Set(stories.flatMap(story => story.currencies))].sort();
  const route = newsRoute(locale);
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'CollectionPage',
    name: copy.pageTitle, description: copy.pageDescription, url: absolute(route),
    inLanguage: copy.htmlLocale,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: stories.map((story, index) => ({
        '@type': 'ListItem', position: index + 1,
        url: absolute(newsRoute(locale, story.slug)),
        name: story.translations[locale].headline
      }))
    },
    isPartOf: { '@type': 'WebSite', name: 'Balkan Currency Converter', url: origin }
  };
  const body = `  <main id="main" class="news-main">
    <section class="news-hero shell" aria-labelledby="news-title">
      <p class="eyebrow">${copy.eyebrow}</p>
      <h1 id="news-title">${copy.pageTitle}</h1>
      <p>${copy.pageDescription}</p>
    </section>
    <section class="shell news-feed-section" aria-labelledby="news-feed-title">
      <h2 class="visually-hidden" id="news-feed-title">${copy.pageTitle}</h2>
      <div class="news-filters" role="group" aria-label="${copy.filterLabel}">
        <button type="button" class="news-filter is-active" data-news-filter="all" aria-pressed="true">${copy.all}</button>
${currencies.map(code => `        <button type="button" class="news-filter" data-news-filter="${code}" aria-pressed="false">${currencyChip(code, locale)}</button>`).join('\n')}
      </div>
      <p class="news-empty" data-news-empty hidden>${copy.empty}</p>
      <div class="news-grid">
${stories.map(story => storyCard(story, locale)).join('\n')}
      </div>
      <aside class="news-disclaimer" aria-label="${copy.disclaimer}">${copy.disclaimer}</aside>
    </section>
  </main>`;
  return pageShell({ locale, title: copy.pageTitle, description: copy.pageDescription, jsonLd, body });
}

function renderStory(story, locale) {
  const copy = ui[locale];
  const translation = story.translations[locale] ?? story.translations.en;
  const articleUrl = absolute(newsRoute(locale, story.slug));
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'NewsArticle',
    headline: translation.headline,
    description: translation.description,
    datePublished: story.publishedAt,
    dateModified: story.updatedAt,
    inLanguage: copy.htmlLocale,
    mainEntityOfPage: { '@type': 'WebPage', '@id': articleUrl },
    author: { '@type': 'Organization', name: 'Balkan Currency Converter', url: origin },
    publisher: { '@type': 'Organization', name: 'Balkan Currency Converter', url: origin },
    about: story.currencies.map(code => ({ '@type': 'Thing', name: code })),
    citation: story.sources.map(source => source.originalUrl),
    isAccessibleForFree: true
  };
  const modified = story.updatedAt !== story.publishedAt
    ? `<span> · ${copy.updated} <time datetime="${escapeHtml(story.updatedAt)}">${escapeHtml(formatDate(story.updatedAt, locale))}</time></span>`
    : '';
  const body = `  <main id="main" class="news-main">
    <article class="news-article shell">
      <a class="news-back" href="${newsRoute(locale)}"><span aria-hidden="true">←</span> ${copy.back}</a>
      <header class="news-article-header">
        <p class="eyebrow">${escapeHtml(copy.categories[story.category] ?? story.category)}</p>
        <h1>${escapeHtml(translation.headline)}</h1>
        <p class="news-article-description">${escapeHtml(translation.description)}</p>
        <p class="news-byline">${copy.published} <time datetime="${escapeHtml(story.publishedAt)}">${escapeHtml(formatDate(story.publishedAt, locale))}</time>${modified}</p>
        <div class="currency-chips currency-chips-large" aria-label="${copy.related}">${story.currencies.map(code => currencyChip(code, locale, { link: true })).join('')}</div>
      </header>
      <div class="news-article-layout">
        <div class="news-article-body">
          <section aria-labelledby="summary-title"><h2 id="summary-title">${copy.summary}</h2><p>${escapeHtml(translation.summary)}</p></section>
          <section aria-labelledby="happened-title"><h2 id="happened-title">${copy.happened}</h2><p>${escapeHtml(translation.whatHappened)}</p></section>
          <section class="why-it-matters" aria-labelledby="matters-title"><h2 id="matters-title">${copy.matters}</h2><p>${escapeHtml(translation.whyItMatters)}</p></section>
        </div>
        <aside class="news-sources" aria-labelledby="sources-title">
          <h2 id="sources-title">${story.sources.length === 1 ? copy.source : copy.sources}</h2>
          <ul>
${story.sources.map(source => `            <li><a href="${escapeHtml(source.originalUrl)}" rel="external noopener">${escapeHtml(source.name)}</a><span>${escapeHtml(source.originalTitle)}</span></li>`).join('\n')}
          </ul>
          <p>${copy.disclaimer}</p>
        </aside>
      </div>
    </article>
  </main>`;
  return pageShell({ locale, slug: story.slug, title: translation.headline, description: translation.description, type: 'article', jsonLd, body });
}

function sitemapBlock(route, lastmod, alternatesForRoute) {
  return `  <url>\n    <loc>${absolute(route)}</loc>\n${alternatesForRoute.map(item => `    <xhtml:link rel="alternate" hreflang="${item.locale}" href="${absolute(item.route)}" />`).join('\n')}\n    <xhtml:link rel="alternate" hreflang="x-default" href="${absolute(alternatesForRoute[0].route)}" />${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}\n  </url>`;
}

async function updateSitemaps(stories) {
  const sitemapPath = path.join(root, 'sitemap.xml');
  let sitemap = await fs.readFile(sitemapPath, 'utf8');
  sitemap = sitemap.replace(/\s*<!-- news:start -->[\s\S]*?<!-- news:end -->\s*/g, '\n');
  const robotsPath = path.join(root, 'robots.txt');
  let robots = await fs.readFile(robotsPath, 'utf8');
  robots = robots.replace(/\r?\nSitemap: https:\/\/balkanconverter\.com\/news-sitemap\.xml\s*/g, '\n');

  if (!newsPublic) {
    await fs.writeFile(sitemapPath, sitemap, 'utf8');
    await fs.writeFile(robotsPath, robots.trimEnd() + '\n', 'utf8');
    await fs.writeFile(path.join(root, 'news-sitemap.xml'),
      '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n</urlset>\n',
      'utf8');
    return;
  }
  const indexAlternates = SUPPORTED_NEWS_LOCALES.map(locale => ({ locale, route: newsRoute(locale) }));
  const blocks = SUPPORTED_NEWS_LOCALES.map(locale => sitemapBlock(newsRoute(locale), null, indexAlternates));
  for (const story of stories) {
    const storyAlternates = SUPPORTED_NEWS_LOCALES.map(locale => ({ locale, route: newsRoute(locale, story.slug) }));
    for (const locale of SUPPORTED_NEWS_LOCALES) blocks.push(sitemapBlock(newsRoute(locale, story.slug), story.updatedAt, storyAlternates));
  }
  const marker = `\n  <!-- news:start -->\n${blocks.join('\n')}\n  <!-- news:end -->\n`;
  sitemap = sitemap.replace(/\s*<\/urlset>\s*$/, `${marker}</urlset>\n`);
  await fs.writeFile(sitemapPath, sitemap, 'utf8');

  const cutoff = Date.now() - (2 * 24 * 60 * 60 * 1000);
  const recent = stories.filter(story => Date.parse(story.publishedAt) >= cutoff);
  const newsBlocks = recent.flatMap(story => SUPPORTED_NEWS_LOCALES.map(locale => {
    const translation = story.translations[locale];
    return `  <url>\n    <loc>${absolute(newsRoute(locale, story.slug))}</loc>\n    <news:news>\n      <news:publication><news:name>Balkan Currency Converter</news:name><news:language>${locale}</news:language></news:publication>\n      <news:publication_date>${story.publishedAt}</news:publication_date>\n      <news:title>${escapeHtml(translation.headline)}</news:title>\n    </news:news>\n  </url>`;
  }));
  const newsSitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n${newsBlocks.join('\n')}\n</urlset>\n`;
  await fs.writeFile(path.join(root, 'news-sitemap.xml'), newsSitemap, 'utf8');
  await fs.writeFile(robotsPath,
    `${robots.trimEnd()}\nSitemap: https://balkanconverter.com/news-sitemap.xml\n`, 'utf8');
}

async function removeStalePages(nextPaths) {
  let previous = [];
  try { previous = JSON.parse(await fs.readFile(generatedPathsPath, 'utf8')); } catch {}
  const next = new Set(nextPaths.map(item => path.resolve(item)));
  for (const previousPath of previous) {
    const resolved = path.resolve(root, previousPath);
    if (!resolved.startsWith(root + path.sep) || next.has(resolved) || path.basename(resolved) !== 'index.html') continue;
    await fs.rm(resolved, { force: true });
    try { await fs.rmdir(path.dirname(resolved)); } catch {}
  }
}

async function syncHomepageLinks() {
  const pages = [
    ['index.html', '<a href="#screenshots">Screenshots</a>', '<a href="#screenshots">Screenshots</a>\n        <a href="/news/">News</a>'],
    ['sr/index.html', '<a href="#screenshots">Снимци екрана</a>', '<a href="#screenshots">Снимци екрана</a>\n        <a href="/sr/news/">Вести</a>'],
    ['ru/index.html', '<a href="#screenshots">Снимки экрана</a>', '<a href="#screenshots">Снимки экрана</a>\n        <a href="/ru/news/">Новости</a>']
  ];
  for (const [relativePath, anchor, replacement] of pages) {
    const file = path.join(root, relativePath);
    let html = await fs.readFile(file, 'utf8');
    html = html.replace(/\s*<a href="\/(?:sr\/|ru\/)?news\/">[^<]+<\/a>/g, '');
    if (newsPublic) {
      if (!html.includes(anchor)) throw new Error(`Cannot locate navigation anchor in ${relativePath}`);
      html = html.replace(anchor, replacement);
    }
    await fs.writeFile(file, html, 'utf8');
  }
}

async function main() {
  const data = JSON.parse(await fs.readFile(storyDataPath, 'utf8'));
  const stories = [];
  const failures = [];
  for (const story of data.stories ?? []) {
    if (story.status !== 'published' || story.indexable !== true) {
      if (story.indexable !== false) failures.push(`${story.id ?? 'unknown'}: non-published stories must be explicitly non-indexable`);
      continue;
    }
    const quality = validateStoryQuality(story);
    if (quality.ok) stories.push(story);
    else failures.push(`${story.id ?? 'unknown'}: ${quality.errors.join('; ')}`);
  }
  if (failures.length) throw new Error(`News quality gate failed:\n${failures.join('\n')}`);
  stories.sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt));

  const generated = [];
  for (const locale of SUPPORTED_NEWS_LOCALES) {
    const indexPath = localPath(newsRoute(locale));
    await fs.mkdir(path.dirname(indexPath), { recursive: true });
    await fs.writeFile(indexPath, renderIndex(stories, locale), 'utf8');
    generated.push(indexPath);
    for (const story of stories) {
      const storyPath = localPath(newsRoute(locale, story.slug));
      await fs.mkdir(path.dirname(storyPath), { recursive: true });
      await fs.writeFile(storyPath, renderStory(story, locale), 'utf8');
      generated.push(storyPath);
    }
  }
  await removeStalePages(generated);
  await fs.writeFile(generatedPathsPath, `${JSON.stringify(generated.map(item => path.relative(root, item).replaceAll('\\', '/')), null, 2)}\n`, 'utf8');
  await updateSitemaps(stories);
  await syncHomepageLinks();
  console.log(`Generated ${generated.length} news pages from ${stories.length} quality-approved stories.`);
}

await main();
