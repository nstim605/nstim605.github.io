import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import { mergeInbox } from '../tools/news/fetch-news.mjs';
import { prepareModeration } from '../tools/news/prepare-moderation.mjs';
import { validateCandidateQuality } from '../tools/news/core.mjs';
import { promoteDraftData } from '../tools/news/promote-draft.mjs';

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
});
