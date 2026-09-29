import {
  canonicalizeSourceUrl,
  detectEditorialTypes,
  fetchWithRetry,
  normalizeWhitespace,
  parseRssOrAtom,
  stableCandidateId
} from './core.mjs';

export class NewsSource {
  constructor({ id, sourceName, sourceUrl, feedUrl, defaultCurrencies = [], requestHeaders = {}, maxItems = 30, additionalSources = () => [] }) {
    this.id = id;
    this.sourceName = sourceName;
    this.sourceUrl = sourceUrl;
    this.feedUrl = feedUrl;
    this.defaultCurrencies = defaultCurrencies;
    this.requestHeaders = requestHeaders;
    this.maxItems = maxItems;
    this.additionalSources = additionalSources;
  }

  async fetch(options = {}) {
    const items = parseRssOrAtom(await fetchWithRetry(this.feedUrl, {
      ...options,
      headers: { ...this.requestHeaders, ...(options.headers ?? {}) }
    }));
    return items
      .sort((left, right) => (Date.parse(right.publishedAt) || 0) - (Date.parse(left.publishedAt) || 0))
      .slice(0, this.maxItems);
  }

  normalize(item) {
    const originalTitle = normalizeWhitespace(item.title);
    const description = normalizeWhitespace(item.description);
    const rawOriginalUrl = new URL(item.url, this.sourceUrl).href;
    const originalUrl = canonicalizeSourceUrl(rawOriginalUrl);
    const publishedAt = new Date(item.publishedAt).toISOString();
    const externalId = normalizeWhitespace(item.externalId) || rawOriginalUrl;
    const additionalSources = this.additionalSources({ item, originalTitle, description, originalUrl, publishedAt })
      .map(source => ({
        ...source,
        originalUrl: canonicalizeSourceUrl(source.originalUrl, this.sourceUrl),
        publishedAt: source.publishedAt ?? publishedAt,
        metadata: { ...(source.metadata ?? {}), feedUrl: source.metadata?.feedUrl ?? this.feedUrl }
      }));
    const primarySource = {
      sourceId: this.id,
      name: this.sourceName,
      originalTitle,
      originalUrl,
      publishedAt,
      externalId,
      metadata: { feedUrl: this.feedUrl, role: additionalSources.length ? 'announcement' : 'primary' }
    };
    return {
      id: stableCandidateId(this.id, externalId, rawOriginalUrl),
      originalTitle,
      description,
      originalUrl,
      publishedAt,
      currencyHints: [...this.defaultCurrencies],
      editorialTypes: detectEditorialTypes(originalTitle, description),
      status: 'pending',
      indexable: false,
      rejectionReason: null,
      sources: [primarySource, ...additionalSources]
    };
  }
}

function federalReserveProjectionSources({ originalTitle, originalUrl, publishedAt }) {
  if (!/\beconomic projections?\b/i.test(originalTitle)) return [];
  const releaseId = originalUrl.match(/monetary(\d{8})[a-z]?\.htm$/i)?.[1];
  if (!releaseId) return [];
  return [{
    sourceId: 'federal-reserve',
    name: 'Board of Governors of the Federal Reserve System',
    originalTitle: 'FOMC economic projections tables and accessible materials',
    originalUrl: `https://www.federalreserve.gov/monetarypolicy/fomcprojtabl${releaseId}.htm`,
    publishedAt,
    externalId: `fomcprojtabl${releaseId}`,
    metadata: { role: 'data' }
  }];
}

export const automatedNewsSources = Object.freeze([
  new NewsSource({
    id: 'ecb',
    sourceName: 'European Central Bank',
    sourceUrl: 'https://www.ecb.europa.eu/',
    feedUrl: 'https://www.ecb.europa.eu/rss/press.html',
    defaultCurrencies: ['EUR'],
    maxItems: 25
  }),
  new NewsSource({
    id: 'federal-reserve',
    sourceName: 'Board of Governors of the Federal Reserve System',
    sourceUrl: 'https://www.federalreserve.gov/',
    feedUrl: 'https://www.federalreserve.gov/feeds/press_monetary.xml',
    defaultCurrencies: ['USD'],
    maxItems: 25,
    additionalSources: federalReserveProjectionSources
  }),
  new NewsSource({
    id: 'nbs-executive-board',
    sourceName: 'National Bank of Serbia',
    sourceUrl: 'https://www.nbs.rs/',
    feedUrl: 'https://nbs.rs/system/modules/yu.nbs.news/elements/responsive/RSSnews.xml?kategorija=191&konverzija=no&lang=en',
    defaultCurrencies: ['RSD'],
    maxItems: 18,
    requestHeaders: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) BalkanConverter-NewsBot/1.0 Chrome/140.0.0.0 Safari/537.36',
      Referer: 'https://nbs.rs/en/scripts/rss/index.html'
    }
  }),
  new NewsSource({
    id: 'nbs-monetary-policy',
    sourceName: 'National Bank of Serbia',
    sourceUrl: 'https://www.nbs.rs/',
    feedUrl: 'https://nbs.rs/system/modules/yu.nbs.news/elements/responsive/RSSnews.xml?kategorija=19&konverzija=no&lang=en',
    defaultCurrencies: ['RSD'],
    maxItems: 30,
    requestHeaders: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) BalkanConverter-NewsBot/1.0 Chrome/140.0.0.0 Safari/537.36',
      Referer: 'https://nbs.rs/en/scripts/rss/index.html'
    }
  })
]);

export const manualNewsSources = Object.freeze([]);
