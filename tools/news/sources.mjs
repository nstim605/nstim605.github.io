import {
  detectCategory,
  detectCurrencies,
  fetchWithRetry,
  normalizeWhitespace,
  parseRssOrAtom,
  stableCandidateId
} from './core.mjs';

export class NewsSource {
  constructor({ id, sourceName, sourceUrl, feedUrl }) {
    this.id = id;
    this.sourceName = sourceName;
    this.sourceUrl = sourceUrl;
    this.feedUrl = feedUrl;
  }

  async fetch(options = {}) {
    return parseRssOrAtom(await fetchWithRetry(this.feedUrl, options));
  }

  normalize(item) {
    const originalTitle = normalizeWhitespace(item.title);
    const originalUrl = new URL(item.url, this.sourceUrl).href;
    const publishedAt = new Date(item.publishedAt).toISOString();
    const externalId = normalizeWhitespace(item.externalId) || originalUrl;
    const currencies = detectCurrencies(originalTitle, item.description);
    return {
      id: stableCandidateId(this.id, externalId, originalUrl),
      originalTitle,
      originalUrl,
      publishedAt,
      category: detectCategory(originalTitle, item.description),
      currencies,
      status: currencies.length > 0 ? 'pending' : 'rejected',
      indexable: false,
      rejectionReason: currencies.length > 0 ? null : 'No supported currency could be identified',
      sources: [{
        sourceId: this.id,
        name: this.sourceName,
        originalTitle,
        originalUrl,
        publishedAt,
        externalId,
        metadata: { feedUrl: this.feedUrl }
      }]
    };
  }
}

export const automatedNewsSources = Object.freeze([
  new NewsSource({
    id: 'ecb',
    sourceName: 'European Central Bank',
    sourceUrl: 'https://www.ecb.europa.eu/',
    feedUrl: 'https://www.ecb.europa.eu/rss/press.html'
  }),
  new NewsSource({
    id: 'federal-reserve',
    sourceName: 'Board of Governors of the Federal Reserve System',
    sourceUrl: 'https://www.federalreserve.gov/',
    feedUrl: 'https://www.federalreserve.gov/feeds/press_monetary.xml'
  })
]);

export const manualNewsSources = Object.freeze([
  {
    id: 'nbs',
    sourceName: 'National Bank of Serbia',
    sourceUrl: 'https://nbs.rs/',
    acquisition: 'Official NBS publications and RSS index; manual review required before publication'
  }
]);
