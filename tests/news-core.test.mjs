import assert from 'node:assert/strict';
import test from 'node:test';
import {
  deduplicateStories,
  detectCategory,
  detectCurrencies,
  fetchWithRetry,
  parseRssOrAtom,
  slugify,
  titleSimilarity,
  validateStoryQuality
} from '../tools/news/core.mjs';
import { collectNewsCandidates } from '../tools/news/fetch-news.mjs';
import { NewsSource } from '../tools/news/sources.mjs';
import storiesData from '../news/data/stories.json' with { type: 'json' };

test('normalizes RSS and Atom entries without retaining full article markup', () => {
  const rss = `<?xml version="1.0"?><rss><channel><item><title><![CDATA[ECB raises rates]]></title><link>https://example.test/a</link><guid>a-1</guid><pubDate>Wed, 16 Sep 2026 18:00:00 GMT</pubDate><description><![CDATA[<p>Short permitted excerpt.</p>]]></description></item></channel></rss>`;
  const atom = `<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Fed statement</title><link href="https://example.test/b"/><id>b-1</id><updated>2026-09-16T18:00:00Z</updated><summary>Short summary.</summary></entry></feed>`;
  assert.deepEqual(parseRssOrAtom(rss), [{ title: 'ECB raises rates', url: 'https://example.test/a', publishedAt: 'Wed, 16 Sep 2026 18:00:00 GMT', externalId: 'a-1', description: 'Short permitted excerpt.' }]);
  assert.equal(parseRssOrAtom(atom)[0].url, 'https://example.test/b');
  assert.throws(() => parseRssOrAtom('<html>not a feed</html>'), /RSS or Atom/);
});

test('detects currencies, categories, and stable slugs', () => {
  assert.deepEqual(detectCurrencies('ECB decision for the euro and US dollar'), ['EUR', 'USD']);
  assert.deepEqual(detectCurrencies('Народна банка Србије задржала стопу'), ['RSD']);
  assert.equal(detectCategory('Federal Reserve raises interest rates'), 'Interest Rates');
  assert.equal(slugify('НБС задржала каматну стопу'), 'nbs-zadrzhala-kamatnu-stopu');
});

test('deduplicates a shared event but keeps different central-bank decisions separate', () => {
  const base = {
    id: 'one', originalTitle: 'ECB raises interest rates by 25 basis points', publishedAt: '2026-09-10T12:15:00Z', currencies: ['EUR'],
    sources: [{ sourceId: 'ecb', externalId: '1', originalUrl: 'https://example.test/one' }]
  };
  const duplicate = {
    id: 'two', originalTitle: 'ECB lifts key rates 25 basis points', publishedAt: '2026-09-10T14:00:00Z', currencies: ['EUR'],
    sources: [{ sourceId: 'wire', externalId: '2', originalUrl: 'https://example.test/two' }]
  };
  const different = {
    id: 'three', originalTitle: 'Fed raises interest rates by 25 basis points', publishedAt: '2026-09-10T15:00:00Z', currencies: ['USD'],
    sources: [{ sourceId: 'fed', externalId: '3', originalUrl: 'https://example.test/three' }]
  };
  assert.ok(titleSimilarity(base.originalTitle, duplicate.originalTitle) > 0.3);
  const groups = deduplicateStories([base, duplicate, different], { similarityThreshold: 0.3 });
  assert.equal(groups.length, 2);
  assert.equal(groups[0].sources.length, 2);
  assert.deepEqual(groups[0].duplicateIds, ['two']);
  assert.equal(groups[0].duplicates[0].status, 'duplicate');
  assert.equal(groups[0].duplicates[0].indexable, false);
});

test('quality gate accepts curated stories and rejects thin or incomplete material', () => {
  for (const story of storiesData.stories) assert.deepEqual(validateStoryQuality(story), { ok: true, errors: [] });
  const thin = structuredClone(storiesData.stories[0]);
  thin.id = 'thin';
  thin.translations.ru.whyItMatters = 'Too short.';
  assert.equal(validateStoryQuality(thin).ok, false);
  assert.match(validateStoryQuality(thin).errors.join('\n'), /whyItMatters is too short/);
});

test('source normalization rejects missing dates and marks irrelevant entries rejected', () => {
  const source = new NewsSource({ id: 'test', sourceName: 'Test Bank', sourceUrl: 'https://example.test/', feedUrl: 'https://example.test/feed.xml' });
  const normalized = source.normalize({ title: 'General annual report', url: '/report', publishedAt: '2026-09-20', externalId: 'report', description: 'Administrative publication' });
  assert.equal(normalized.status, 'rejected');
  assert.equal(normalized.indexable, false);
  assert.throws(() => source.normalize({ title: 'ECB rates', url: '/a', publishedAt: '', externalId: 'a' }), /Invalid time value/);
});

test('fetch retry recovers from a temporary source error', async () => {
  let attempts = 0;
  const text = await fetchWithRetry('https://example.test/feed', {
    retries: 2, retryDelayMs: 0,
    fetchImpl: async () => {
      attempts += 1;
      if (attempts < 2) return { ok: false, status: 503, text: async () => '' };
      return { ok: true, status: 200, text: async () => '<rss></rss>' };
    }
  });
  assert.equal(text, '<rss></rss>');
  assert.equal(attempts, 2);
});

test('one failed source does not prevent successful candidates from being collected', async () => {
  const failed = { id: 'failed', fetch: async () => { throw new Error('offline'); } };
  const healthy = {
    id: 'healthy',
    fetch: async () => [{ title: 'ECB interest rate decision', url: 'https://example.test/item', publishedAt: '2026-09-20', externalId: 'item' }],
    normalize: item => ({ id: 'item', originalTitle: item.title, publishedAt: item.publishedAt, currencies: ['EUR'], status: 'pending', indexable: false, sources: [{ sourceId: 'healthy', externalId: 'item', originalUrl: item.url }] })
  };
  const result = await collectNewsCandidates({ sources: [failed, healthy], contentProvider: { createTranslations: async () => null }, now: new Date('2026-09-20T12:00:00Z') });
  assert.equal(result.candidates.length, 1);
  assert.equal(result.sourceRuns.find(run => run.sourceId === 'failed').ok, false);
  assert.equal(result.sourceRuns.find(run => run.sourceId === 'healthy').ok, true);
});
