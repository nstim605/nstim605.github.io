import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assessCandidateValue,
  canonicalizeSourceUrl,
  classifyCandidate,
  deduplicateStories,
  detectCategory,
  detectCurrencies,
  detectEditorialTypes,
  fetchWithRetry,
  isSameEvent,
  parseRssOrAtom,
  slugify,
  titleSimilarity,
  validateStoryQuality
} from '../tools/news/core.mjs';
import { collectNewsCandidates } from '../tools/news/fetch-news.mjs';
import { automatedNewsSources, NewsSource } from '../tools/news/sources.mjs';
import storiesData from '../news/data/stories.json' with { type: 'json' };

test('normalizes RSS and Atom entries without retaining full article markup', () => {
  const rss = `<?xml version="1.0"?><rss><channel><item><title><![CDATA[ECB raises rates]]></title><link>https://example.test/a</link><guid>a-1</guid><pubDate>Wed, 16 Sep 2026 18:00:00 GMT</pubDate><description><![CDATA[<p>Short permitted excerpt.</p>&lt;img src=x onerror=unsafe()&gt;]]></description></item></channel></rss>`;
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

test('event-level deduplication crosses feeds, source aliases, headlines, and languages', () => {
  const approved = {
    id: 'nbs-rates-2026-09-10',
    originalTitle: 'Referentna kamatna stopa zadržana na nepromenjenom nivou',
    publishedAt: '2026-09-10',
    currencies: ['RSD'],
    translations: {
      en: { headline: 'National Bank of Serbia keeps its reference rate at 5.75%' },
      sr: { headline: 'Народна банка Србије задржала референтну каматну стопу на 5,75%' }
    },
    sources: [{
      sourceId: 'nbs', name: 'National Bank of Serbia', externalId: 'old-page',
      originalTitle: 'Referentna kamatna stopa zadržana na nepromenjenom nivou',
      originalUrl: 'https://nbs.rs/sr/ciljevi-i-funkcije/monetarna-politika/sednica-izvrsnog-odbora/index.html'
    }]
  };
  const candidate = {
    id: 'new-feed-item', originalTitle: 'Key policy rate kept unchanged',
    description: 'The NBS Executive Board kept the key policy rate at 5.75%.',
    publishedAt: '2026-09-10T12:19:25Z', currencies: ['RSD'],
    sources: [{
      sourceId: 'nbs-executive-board', name: 'National Bank of Serbia', externalId: '21715',
      originalTitle: 'Key policy rate kept unchanged',
      originalUrl: 'https://www.nbs.rs/en/scripts/showcontent/index.html?id=21715&konverzija=no'
    }]
  };
  assert.equal(isSameEvent(approved, candidate), true);
  assert.equal(deduplicateStories([approved, candidate]).length, 1);
});

test('candidate value gate rejects technical operations but accepts substantive inflation material', () => {
  const technical = {
    originalTitle: 'ECB amends monetary policy implementation guidelines as part of regular review',
    description: 'The amendments update collateral eligibility, external rating methodology and haircut schedules.',
    currencies: ['EUR'],
    sources: [{ sourceId: 'ecb', name: 'European Central Bank' }]
  };
  const inflation = {
    originalTitle: 'Inflation movements in August 2026',
    description: 'Annual inflation stood at 2.2%, monthly consumer prices rose 0.5%, and core inflation was 4.7%.',
    currencies: ['RSD'],
    sources: [{ sourceId: 'nbs-monetary-policy', name: 'National Bank of Serbia' }]
  };
  assert.equal(assessCandidateValue(technical).ok, false);
  assert.match(assessCandidateValue(technical).reasons.join('\n'), /technical or operational/);
  assert.equal(assessCandidateValue(inflation).ok, true);
});

test('content-led classification marks surveys as Inflation and exposes editorial types', () => {
  assert.equal(detectCategory('ECB Consumer Expectations Survey results – August 2026'), 'Inflation');
  assert.deepEqual(
    detectEditorialTypes('ECB Consumer Expectations Survey results and inflation expectations'),
    ['survey', 'expectations']
  );
  assert.deepEqual(
    detectEditorialTypes('FOMC economic projections and forward-looking dot plot'),
    ['projections', 'forward-looking-indicator']
  );
});

test('source URLs are canonicalized without losing required query parameters', () => {
  assert.equal(
    canonicalizeSourceUrl('https://www.ecb.europa.eu//press//pr/date/2026/item.html?lang=en&view=1'),
    'https://www.ecb.europa.eu/press/pr/date/2026/item.html?lang=en&view=1'
  );
  assert.equal(
    canonicalizeSourceUrl('https://www.nbs.rs//en/scripts/showcontent/index.html?id=21715&konverzija=no'),
    'https://www.nbs.rs/en/scripts/showcontent/index.html?id=21715&konverzija=no'
  );
});

test('Federal Reserve projection releases attach official data tables before moderation', () => {
  const source = automatedNewsSources.find(item => item.id === 'federal-reserve');
  const candidate = classifyCandidate(source.normalize({
    title: 'Federal Reserve Board and FOMC release economic projections from the September meeting',
    url: 'https://www.federalreserve.gov/newsevents/pressreleases/monetary20260916b.htm',
    publishedAt: '2026-09-16T18:00:00Z',
    externalId: 'monetary20260916b',
    description: 'Tables summarize participants’ economic projections.'
  }));
  assert.equal(candidate.sources.length, 2);
  assert.equal(candidate.sources[1].metadata.role, 'data');
  assert.equal(candidate.sources[1].originalUrl, 'https://www.federalreserve.gov/monetarypolicy/fomcprojtabl20260916.htm');
  assert.equal(candidate.category, 'Economy');
  assert.deepEqual(candidate.editorialTypes, ['projections']);
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
  const normalized = classifyCandidate(source.normalize({ title: 'General annual report', url: '/report', publishedAt: '2026-09-20', externalId: 'report', description: 'Administrative publication' }));
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

test('source limits keep the newest feed entries even when RSS order is irregular', async () => {
  const source = new NewsSource({
    id: 'test', sourceName: 'Test Bank', sourceUrl: 'https://example.test/',
    feedUrl: 'https://example.test/feed.xml', maxItems: 1
  });
  const xml = `<rss><channel>
    <item><title>Older item</title><link>https://example.test/old</link><guid>old</guid><pubDate>2026-09-01</pubDate></item>
    <item><title>Newest item</title><link>https://example.test/new</link><guid>new</guid><pubDate>2026-09-29</pubDate></item>
  </channel></rss>`;
  const items = await source.fetch({ fetchImpl: async () => ({ ok: true, status: 200, text: async () => xml }) });
  assert.equal(items.length, 1);
  assert.equal(items[0].title, 'Newest item');
});
