import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import { mergeInbox } from '../tools/news/fetch-news.mjs';
import { prepareModeration } from '../tools/news/prepare-moderation.mjs';
import { classifyCandidate, validateCandidateQuality } from '../tools/news/core.mjs';
import { promoteDraftData } from '../tools/news/promote-draft.mjs';
import storiesData from '../news/data/stories.json' with { type: 'json' };

const now = new Date('2026-09-29T12:00:00Z');

function candidate(overrides = {}) {
  return {
    id: 'candidate-001',
    originalTitle: 'Federal Reserve issues FOMC statement on monetary policy',
    publishedAt: '2026-09-28T18:00:00Z',
    category: 'Central Banks',
    currencies: ['USD'],
    status: 'pending',
    indexable: false,
    sources: [{
      sourceId: 'federal-reserve',
      name: 'Federal Reserve',
      originalTitle: 'Federal Reserve issues FOMC statement on monetary policy',
      originalUrl: 'https://www.federalreserve.gov/newsevents/pressreleases/monetary20260928a.htm',
      publishedAt: '2026-09-28T18:00:00Z',
      externalId: 'monetary20260928a'
    }],
    duplicates: [],
    ...overrides
  };
}

const emptyStories = { schemaVersion: 1, stories: [] };

test('candidate quality gate accepts a recent official monetary-policy item', () => {
  assert.deepEqual(validateCandidateQuality(candidate(), { now }), { ok: true, errors: [] });
  const untrusted = candidate({
    sources: [{ ...candidate().sources[0], originalUrl: 'https://attacker.example/fake' }]
  });
  assert.match(validateCandidateQuality(untrusted, { now }).errors.join('\n'), /not approved/);
});

test('worthy candidate becomes a stable, non-public draft after the quality gate', async () => {
  let providerCalls = 0;
  const result = await prepareModeration({
    inbox: { candidates: [candidate()] }, stories: emptyStories, now,
    contentProvider: { createTranslations: async () => { providerCalls += 1; return null; } }
  });
  assert.equal(providerCalls, 1);
  assert.equal(result.report.summary.proposed, 1);
  assert.equal(result.drafts.drafts[0].status, 'draft');
  assert.equal(result.drafts.drafts[0].indexable, false);
  assert.equal(result.drafts.drafts[0].translations, null);
  assert.equal(result.drafts.drafts[0].quality.publicationReady, false);
  assert.ok(result.drafts.drafts[0].slug.endsWith(candidate().id.slice(0, 8)));
});

test('rejected candidate never reaches the content provider', async () => {
  let providerCalls = 0;
  const irrelevant = candidate({ originalTitle: 'Annual staff picnic schedule and office notices' });
  const result = await prepareModeration({
    inbox: { candidates: [irrelevant] }, stories: emptyStories, now,
    contentProvider: { createTranslations: async () => { providerCalls += 1; return null; } }
  });
  assert.equal(providerCalls, 0);
  assert.equal(result.report.summary.rejected, 1);
  assert.equal(result.drafts.drafts.length, 0);
});

test('published events and nested feed duplicates remain non-public duplicate state', async () => {
  const item = candidate({ duplicates: [{ id: 'secondary-id', status: 'duplicate', indexable: false }] });
  const published = {
    id: 'published-story', slug: 'published-story', originalTitle: item.originalTitle,
    publishedAt: item.publishedAt, currencies: ['USD'], sources: item.sources,
    status: 'published', indexable: true
  };
  const result = await prepareModeration({ inbox: { candidates: [item] }, stories: { stories: [published] }, now });
  assert.equal(result.report.summary.proposed, 0);
  assert.equal(result.report.summary.duplicates, 2);
  assert.equal(result.state.processed[item.id].status, 'duplicate');
  assert.equal(result.state.processed['secondary-id'].status, 'duplicate');
});

test('approved NBS rate story absorbs a cross-feed English duplicate', async () => {
  const item = classifyCandidate(candidate({
    id: 'nbs-rate-repeat',
    originalTitle: 'Key policy rate kept unchanged',
    description: 'The NBS Executive Board kept the key policy rate at 5.75%.',
    publishedAt: '2026-09-10T12:19:25Z',
    sources: [{
      sourceId: 'nbs-executive-board', name: 'National Bank of Serbia',
      originalTitle: 'Key policy rate kept unchanged',
      originalUrl: 'https://www.nbs.rs/en/scripts/showcontent/index.html?id=21715&konverzija=no',
      publishedAt: '2026-09-10T12:19:25Z', externalId: '21715'
    }]
  }));
  const result = await prepareModeration({ inbox: { candidates: [item] }, stories: storiesData, now });
  assert.equal(result.report.summary.proposed, 0);
  assert.equal(result.report.summary.duplicates, 1);
  assert.equal(result.state.processed[item.id].status, 'duplicate');
  assert.equal(result.state.processed[item.id].canonicalStoryId, 'nbs-rates-2026-09-10');
});

test('stronger gate re-evaluates open drafts before content preparation and stays idempotent', async () => {
  let providerCalls = 0;
  const source = (sourceId, title, url) => ({
    sourceId, name: sourceId === 'ecb' ? 'European Central Bank' : 'National Bank of Serbia',
    originalTitle: title, originalUrl: url, publishedAt: '2026-09-20T08:00:00Z', externalId: url
  });
  const technical = classifyCandidate(candidate({
    id: 'technical-draft',
    originalTitle: 'ECB amends monetary policy implementation guidelines as part of regular review',
    description: 'The amendments update collateral eligibility, rating methodology and haircut schedules.',
    publishedAt: '2026-09-20T08:00:00Z',
    sources: [source('ecb', 'ECB amends monetary policy implementation guidelines as part of regular review', 'https://www.ecb.europa.eu/press/pr/date/2026/technical.html')]
  }));
  const substantive = classifyCandidate(candidate({
    id: 'inflation-draft',
    originalTitle: 'Inflation movements in August 2026',
    description: 'Annual inflation stood at 2.2%, monthly prices rose 0.5%, and core inflation was 4.7%.',
    publishedAt: '2026-09-20T08:00:00Z',
    sources: [source('nbs-monetary-policy', 'Inflation movements in August 2026', 'https://www.nbs.rs/en/scripts/showcontent/index.html?id=inflation&konverzija=no')]
  }));
  const drafts = {
    schemaVersion: 1,
    drafts: [technical, substantive].map(item => ({
      id: `official-2026-09-20-${item.id}`,
      candidateId: item.id,
      slug: `draft-${item.id}`,
      category: item.category,
      publishedAt: item.publishedAt,
      updatedAt: item.publishedAt,
      status: 'draft', indexable: false, currencies: item.currencies,
      translations: null, sources: item.sources,
      quality: { publicationReady: false, errors: ['translations are required'] }
    }))
  };
  const state = {
    schemaVersion: 1, updatedAt: '2026-09-20T09:00:00Z',
    processed: {
      [technical.id]: { status: 'draft', draftId: drafts.drafts[0].id },
      [substantive.id]: { status: 'draft', draftId: drafts.drafts[1].id }
    }
  };
  const contentProvider = { createTranslations: async () => { providerCalls += 1; return null; } };
  const first = await prepareModeration({
    inbox: { candidates: [technical, substantive] }, stories: emptyStories, drafts, state, contentProvider, now
  });
  assert.equal(providerCalls, 0);
  assert.equal(first.report.summary.reconsideredDrafts, 2);
  assert.equal(first.report.summary.rejected, 1);
  assert.deepEqual(first.drafts.drafts.map(item => item.candidateId), [substantive.id]);
  assert.equal(first.state.processed[technical.id].status, 'rejected');
  assert.deepEqual(first.report.proposed[0].editorialTypes, []);

  const second = await prepareModeration({
    inbox: { candidates: [technical, substantive] }, stories: emptyStories,
    drafts: first.drafts, state: first.state, contentProvider, now: new Date('2026-09-29T18:00:00Z')
  });
  assert.equal(second.processedThisRun, false);
  assert.deepEqual(second.drafts, first.drafts);
  assert.deepEqual(second.state, first.state);
  assert.equal(providerCalls, 0);
});

test('first production moderation sample keeps four editorial candidates and filters three false positives', async () => {
  let providerCalls = 0;
  const make = ({ id, title, publishedAt, sourceId, name, url, currencies, description = '', extraSources = [] }) => classifyCandidate({
    id,
    originalTitle: title,
    description,
    originalUrl: url,
    publishedAt,
    currencies,
    status: 'pending', indexable: false, rejectionReason: null,
    sources: [{ sourceId, name, originalTitle: title, originalUrl: url, publishedAt, externalId: url }, ...extraSources],
    duplicates: []
  });
  const candidates = [
    make({
      id: 'ecb-operations', title: 'ECB amends monetary policy implementation guidelines as part of regular review',
      publishedAt: '2026-09-29T08:00:00Z', sourceId: 'ecb', name: 'European Central Bank', currencies: ['EUR'],
      url: 'https://www.ecb.europa.eu/press/pr/date/2026/html/operations.html',
      description: 'Technical changes cover collateral eligibility, rating methodology and haircut schedules.'
    }),
    make({
      id: 'ecb-survey', title: 'ECB Consumer Expectations Survey results – August 2026',
      publishedAt: '2026-09-18T08:00:00Z', sourceId: 'ecb', name: 'European Central Bank', currencies: ['EUR'],
      url: 'https://www.ecb.europa.eu/press/pr/date/2026/html/consumer-expectations.html'
    }),
    make({
      id: 'nbs-survey', title: 'Results of the Inflation Expectations Survey',
      publishedAt: '2026-09-17T11:52:54Z', sourceId: 'nbs-monetary-policy', name: 'National Bank of Serbia', currencies: ['RSD'],
      url: 'https://www.nbs.rs/en/scripts/showcontent/index.html?id=21729&konverzija=no'
    }),
    make({
      id: 'fed-projections', title: 'Federal Reserve Board and Federal Open Market Committee release economic projections from the September 15-16 FOMC meeting',
      publishedAt: '2026-09-16T18:00:00Z', sourceId: 'federal-reserve', name: 'Board of Governors of the Federal Reserve System', currencies: ['USD'],
      url: 'https://www.federalreserve.gov/newsevents/pressreleases/monetary20260916b.htm',
      extraSources: [{
        sourceId: 'federal-reserve', name: 'Board of Governors of the Federal Reserve System',
        originalTitle: 'FOMC economic projections tables and accessible materials',
        originalUrl: 'https://www.federalreserve.gov/monetarypolicy/fomcprojtabl20260916.htm',
        publishedAt: '2026-09-16T18:00:00Z', externalId: 'fomcprojtabl20260916', metadata: { role: 'data' }
      }]
    }),
    make({
      id: 'ecb-wages', title: 'ECB wage tracker at 2.7% in H1 2027, pointing to a modest uptick in negotiated wage growth',
      publishedAt: '2026-09-16T08:00:00Z', sourceId: 'ecb', name: 'European Central Bank', currencies: ['EUR'],
      url: 'https://www.ecb.europa.eu/press/pr/date/2026/html/wage-tracker.html'
    }),
    make({
      id: 'nbs-inflation', title: 'Inflation movements in August 2026',
      publishedAt: '2026-09-14T09:50:09Z', sourceId: 'nbs-monetary-policy', name: 'National Bank of Serbia', currencies: ['RSD'],
      url: 'https://www.nbs.rs/en/scripts/showcontent/index.html?id=21723&konverzija=no',
      description: 'Annual inflation stood at 2.2%, monthly prices rose 0.5%, and core inflation was 4.7%.'
    }),
    make({
      id: 'nbs-rate-repeat-sample', title: 'Key policy rate kept unchanged',
      publishedAt: '2026-09-10T12:19:25Z', sourceId: 'nbs-executive-board', name: 'National Bank of Serbia', currencies: ['RSD'],
      url: 'https://www.nbs.rs/en/scripts/showcontent/index.html?id=21715&konverzija=no',
      description: 'The NBS Executive Board kept the key policy rate at 5.75%.'
    })
  ];
  const result = await prepareModeration({
    inbox: { candidates }, stories: storiesData, now,
    contentProvider: { createTranslations: async () => { providerCalls += 1; return null; } }
  });
  assert.equal(providerCalls, 4);
  assert.deepEqual(result.report.proposed.map(item => item.title), [
    'ECB Consumer Expectations Survey results – August 2026',
    'Results of the Inflation Expectations Survey',
    'Federal Reserve Board and Federal Open Market Committee release economic projections from the September 15-16 FOMC meeting',
    'Inflation movements in August 2026'
  ]);
  assert.deepEqual(result.report.rejected.map(item => item.title), [
    'ECB amends monetary policy implementation guidelines as part of regular review',
    'ECB wage tracker at 2.7% in H1 2027, pointing to a modest uptick in negotiated wage growth'
  ]);
  assert.deepEqual(result.report.duplicates.map(item => item.title), ['Key policy rate kept unchanged']);
  assert.equal(result.report.proposed.find(item => item.title.startsWith('ECB Consumer Expectations')).category, 'Inflation');
  assert.deepEqual(result.report.proposed.find(item => item.title.includes('economic projections')).editorialTypes, ['projections']);
});

test('processed state makes repeated moderation runs idempotent', async () => {
  const first = await prepareModeration({ inbox: { candidates: [candidate()] }, stories: emptyStories, now });
  const second = await prepareModeration({
    inbox: { candidates: [candidate()] }, stories: emptyStories,
    drafts: first.drafts, state: first.state, now: new Date('2026-09-29T18:00:00Z')
  });
  assert.deepEqual(second.drafts, first.drafts);
  assert.deepEqual(second.state, first.state);
  assert.equal(second.processedThisRun, false);
  assert.equal(second.report.summary.proposed, 0);
});

test('an updated report keeps existing open drafts visible', async () => {
  const first = await prepareModeration({ inbox: { candidates: [candidate()] }, stories: emptyStories, now });
  const irrelevant = candidate({ id: 'candidate-002', originalTitle: 'Annual staff picnic schedule and office notices' });
  const second = await prepareModeration({
    inbox: { candidates: [candidate(), irrelevant] }, stories: emptyStories,
    drafts: first.drafts, state: first.state, now: new Date('2026-09-29T18:00:00Z')
  });
  assert.equal(second.report.summary.proposed, 0);
  assert.equal(second.report.summary.openDrafts, 1);
  assert.equal(second.report.proposed[0].id, first.drafts.drafts[0].id);
});

test('promotion refuses incomplete drafts and accepts reviewed trilingual copy', async () => {
  const incomplete = await prepareModeration({ inbox: { candidates: [candidate()] }, stories: emptyStories, now });
  const draftId = incomplete.drafts.drafts[0].id;
  assert.throws(() => promoteDraftData({ drafts: incomplete.drafts, stories: emptyStories, state: incomplete.state }, draftId), /cannot be promoted/);

  const translation = {
    headline: 'Central bank publishes a reviewed monetary policy decision',
    description: 'A factual and neutral description of the official central-bank decision for currency converter users.',
    summary: 'A reviewed summary explains the official decision without forecasts, copied excerpts, or investment advice.',
    whatHappened: 'The editor verified the decision against the linked official source and wrote an original explanation of the facts, timing, and policy context for readers.',
    whyItMatters: 'The editor explains the relationship to borrowing conditions and currency conversion context without predicting market direction or giving investment advice.'
  };
  const complete = await prepareModeration({
    inbox: { candidates: [candidate()] }, stories: emptyStories, now,
    contentProvider: { createTranslations: async () => ({ en: translation, sr: translation, ru: translation }) }
  });
  const promoted = promoteDraftData({ drafts: complete.drafts, stories: emptyStories, state: complete.state }, complete.drafts.drafts[0].id);
  assert.equal(promoted.story.status, 'published');
  assert.equal(promoted.story.indexable, true);
  assert.equal(promoted.drafts.drafts.length, 0);
  assert.equal(promoted.state.processed[candidate().id].status, 'published');
});

test('inbox merge does not churn timestamps when source material is unchanged', () => {
  const previousCandidate = { ...candidate(), firstSeenAt: '2026-09-29T12:00:00Z', lastSeenAt: '2026-09-29T12:00:00Z' };
  const previous = { schemaVersion: 1, updatedAt: '2026-09-29T12:00:00Z', candidates: [previousCandidate], sourceRuns: [] };
  const incoming = { candidates: [candidate()], sourceRuns: [{ sourceId: 'federal-reserve', ok: true, fetchedAt: '2026-09-29T18:00:00Z' }] };
  assert.equal(mergeInbox(previous, incoming, new Date('2026-09-29T18:00:00Z')), previous);
});

test('scheduled workflow targets a moderation PR and never pushes main', async () => {
  const workflow = await fs.readFile(new URL('../.github/workflows/update-news.yml', import.meta.url), 'utf8');
  assert.match(workflow, /pull-requests: write/);
  assert.match(workflow, /gh pr create/);
  assert.match(workflow, /--body-file news\/data\/moderation-report\.md/);
  assert.doesNotMatch(workflow, /push origin HEAD:main/);
  assert.doesNotMatch(workflow, /--force(?:-with-lease)?/);
  assert.doesNotMatch(workflow, /git fetch[^\n]+\|\| true/);
  assert.match(workflow, /! -name 'privacy-policy-phase1d\.test\.mjs'/);
  assert.match(workflow, /--test-name-pattern=.*integrity supersession/);
  assert.match(workflow, /HEAD:\$\{MODERATION_BRANCH\}/);
  assert.match(workflow, /if: steps\.moderation\.outputs\.open_drafts != '0'/);
  assert.doesNotMatch(workflow, /if: steps\.commit\.outputs\.changed/);
});
