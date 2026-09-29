import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { appendFile } from 'node:fs/promises';
import {
  isSameEvent,
  slugify,
  validateCandidateQuality,
  validateStoryQuality
} from './core.mjs';
import { defaultContentProvider } from './content-provider.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dataDirectory = path.join(root, 'news', 'data');
const defaultPaths = Object.freeze({
  inbox: path.join(dataDirectory, 'inbox.json'),
  stories: path.join(dataDirectory, 'stories.json'),
  drafts: path.join(dataDirectory, 'drafts.json'),
  state: path.join(dataDirectory, 'moderation-state.json'),
  reportJson: path.join(dataDirectory, 'moderation-report.json'),
  reportMarkdown: path.join(dataDirectory, 'moderation-report.md')
});

function markdownText(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/[\\|`]/g, '\\$&')
    .replace(/[\r\n]+/g, ' ')
    .trim();
}

function stableDraft(candidate, translations) {
  const date = new Date(candidate.publishedAt).toISOString().slice(0, 10);
  const suffix = candidate.id.slice(0, 8);
  const titleSlug = slugify(candidate.originalTitle).slice(0, 76) || 'financial-news';
  const draft = {
    id: `official-${date}-${suffix}`,
    candidateId: candidate.id,
    slug: `${titleSlug}-${suffix}`,
    category: candidate.category,
    publishedAt: candidate.publishedAt,
    updatedAt: candidate.publishedAt,
    status: 'draft',
    indexable: false,
    currencies: candidate.currencies,
    editorialTypes: candidate.editorialTypes ?? [],
    translations: translations ?? null,
    sources: candidate.sources
  };
  const publicationQuality = validateStoryQuality({ ...draft, status: 'published', indexable: true });
  return {
    ...draft,
    quality: {
      publicationReady: publicationQuality.ok,
      errors: publicationQuality.errors
    }
  };
}

function reportMarkdown(report) {
  const proposed = report.proposed.map(item => {
    const sources = item.sources.map(source => `[${markdownText(source.name)}](${source.url})${source.role === 'data' ? ' (data)' : ''}`).join(', ');
    const editorialTypes = item.editorialTypes.length ? item.editorialTypes.map(markdownText).join(', ') : 'event';
    return `| ${markdownText(item.title)} | ${item.currencies.join(', ')} | ${markdownText(item.category)} | ${editorialTypes} | ${sources} | ${item.publishedAt.slice(0, 10)} | ${item.candidateQuality ? 'pass' : 'fail'} | ${item.publicationReady ? 'ready' : 'editorial work required'} |`;
  });
  const rejected = report.rejected.slice(0, 20).map(item => `- **${markdownText(item.title)}** — ${item.reasons.map(markdownText).join('; ')}`);
  const duplicates = report.duplicates.slice(0, 20).map(item => `- **${markdownText(item.title)}** — ${markdownText(item.reason)}`);
  const rejectedRemainder = report.rejected.length - rejected.length;
  const duplicateRemainder = report.duplicates.length - duplicates.length;
  return `# Financial News moderation report

Generated from official machine-readable sources at ${report.generatedAt}.

## Run summary

- Candidates inspected: ${report.summary.candidatesInspected}
- Existing open drafts re-evaluated: ${report.summary.reconsideredDrafts}
- New moderation drafts: ${report.summary.proposed}
- Open moderation drafts: ${report.summary.openDrafts}
- Publication-ready open drafts: ${report.summary.publicationReady}
- Rejected by the candidate quality gate: ${report.summary.rejected}
- Duplicates: ${report.summary.duplicates}
- Content provider: ${markdownText(report.contentProvider)}

Merging this PR must never publish an incomplete draft. A draft becomes public only after an editor supplies complete EN/SR/RU copy, runs the promotion command, and the publication quality gate passes.

## Open moderation drafts

${proposed.length ? `| Story | Currencies | Category | Editorial type | Sources | Original date | Candidate gate | Publication gate |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n${proposed.join('\n')}` : 'No open drafts.'}

## Rejected candidates

${rejected.length ? `${rejected.join('\n')}${rejectedRemainder ? `\n- …and ${rejectedRemainder} more (see the JSON report for details).` : ''}` : 'None.'}

## Duplicates

${duplicates.length ? `${duplicates.join('\n')}${duplicateRemainder ? `\n- …and ${duplicateRemainder} more (see the JSON report for details).` : ''}` : 'None.'}

## Reviewer checklist

- Open every official source link in \`news/data/drafts.json\` and verify the facts.
- Treat surveys, expectations, projections, forecasts and forward-looking indicators as attributed source material, never as observed facts or guaranteed outcomes.
- Write original, neutral EN/SR/RU copy; do not paste source excerpts or add forecasts/advice.
- Run \`node tools/news/promote-draft.mjs <draft-id>\` for each approved draft.
- Run \`node tools/news/generate-news.mjs\` and \`node --test tests/*.test.mjs\`.
- Confirm that only promoted stories add public pages and sitemap entries.
`;
}

export async function prepareModeration({
  inbox,
  stories,
  drafts = { schemaVersion: 1, drafts: [] },
  state = { schemaVersion: 1, updatedAt: null, processed: {} },
  contentProvider = defaultContentProvider,
  now = new Date()
}) {
  const nextDrafts = structuredClone(drafts);
  const nextState = structuredClone(state);
  nextDrafts.schemaVersion = 1;
  nextDrafts.drafts ??= [];
  nextState.schemaVersion = 1;
  nextState.processed ??= {};
  const report = {
    schemaVersion: 1,
    generatedAt: now.toISOString(),
    contentProvider: contentProvider.constructor?.name ?? 'custom provider',
    summary: { candidatesInspected: 0, reconsideredDrafts: 0, proposed: 0, openDrafts: 0, publicationReady: 0, rejected: 0, duplicates: 0 },
    proposed: [], rejected: [], duplicates: []
  };
  const candidates = [...(inbox.candidates ?? [])].sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt));
  const candidatesById = new Map(candidates.map(candidate => [candidate.id, candidate]));
  const publishedStories = stories.stories ?? [];
  let draftsReconciled = false;
  const retainedDrafts = [];

  for (const currentDraft of nextDrafts.drafts) {
    const candidate = candidatesById.get(currentDraft.candidateId);
    if (!candidate) {
      retainedDrafts.push(currentDraft);
      continue;
    }
    report.summary.reconsideredDrafts += 1;
    const processedAt = now.toISOString();
    const duplicateOf = publishedStories.find(story => isSameEvent(story, candidate));
    if (duplicateOf) {
      const reason = `same event as ${duplicateOf.id}`;
      nextState.processed[candidate.id] = { status: 'duplicate', canonicalStoryId: duplicateOf.id, reason, processedAt };
      report.summary.duplicates += 1;
      report.duplicates.push({ id: candidate.id, title: candidate.originalTitle, reason, reconsideredDraft: true });
      draftsReconciled = true;
      continue;
    }
    const candidateQuality = validateCandidateQuality(candidate, { now });
    if (!candidateQuality.ok) {
      nextState.processed[candidate.id] = { status: 'rejected', reasons: candidateQuality.errors, processedAt };
      report.summary.rejected += 1;
      report.rejected.push({ id: candidate.id, title: candidate.originalTitle, reasons: candidateQuality.errors, reconsideredDraft: true });
      draftsReconciled = true;
      continue;
    }

    const refreshedDraft = {
      ...currentDraft,
      category: candidate.category,
      currencies: candidate.currencies,
      editorialTypes: candidate.editorialTypes ?? [],
      sources: candidate.sources
    };
    const publicationQuality = validateStoryQuality({ ...refreshedDraft, status: 'published', indexable: true });
    refreshedDraft.quality = { publicationReady: publicationQuality.ok, errors: publicationQuality.errors };
    if (JSON.stringify(refreshedDraft) !== JSON.stringify(currentDraft)) draftsReconciled = true;
    retainedDrafts.push(refreshedDraft);
  }
  nextDrafts.drafts = retainedDrafts;
  const knownStories = [...publishedStories, ...nextDrafts.drafts];

  for (const candidate of candidates) {
    if (nextState.processed[candidate.id]) continue;
    report.summary.candidatesInspected += 1;
    const processedAt = now.toISOString();
    const nestedDuplicates = candidate.duplicates ?? [];
    for (const duplicate of nestedDuplicates) {
      if (!nextState.processed[duplicate.id]) {
        nextState.processed[duplicate.id] = { status: 'duplicate', canonicalCandidateId: candidate.id, processedAt };
        report.summary.duplicates += 1;
        report.duplicates.push({ id: duplicate.id, title: candidate.originalTitle, reason: `collapsed into candidate ${candidate.id}` });
      }
    }

    if (candidate.status === 'rejected') {
      const reasons = [candidate.rejectionReason || 'source normalization rejected this candidate'];
      nextState.processed[candidate.id] = { status: 'rejected', reasons, processedAt };
      report.summary.rejected += 1;
      report.rejected.push({ id: candidate.id, title: candidate.originalTitle, reasons });
      continue;
    }

    const duplicateOf = knownStories.find(story => isSameEvent(story, candidate));
    if (duplicateOf) {
      const reason = `same event as ${duplicateOf.id}`;
      nextState.processed[candidate.id] = { status: 'duplicate', canonicalStoryId: duplicateOf.id, reason, processedAt };
      report.summary.duplicates += 1;
      report.duplicates.push({ id: candidate.id, title: candidate.originalTitle, reason });
      continue;
    }

    const candidateQuality = validateCandidateQuality(candidate, { now });
    if (!candidateQuality.ok) {
      nextState.processed[candidate.id] = { status: 'rejected', reasons: candidateQuality.errors, processedAt };
      report.summary.rejected += 1;
      report.rejected.push({ id: candidate.id, title: candidate.originalTitle, reasons: candidateQuality.errors });
      continue;
    }

    const translations = await contentProvider.createTranslations(candidate);
    const draft = stableDraft(candidate, translations);
    nextDrafts.drafts.push(draft);
    knownStories.push(draft);
    nextState.processed[candidate.id] = { status: 'draft', draftId: draft.id, slug: draft.slug, processedAt };
    report.summary.proposed += 1;
  }

  report.proposed = nextDrafts.drafts.map(draft => ({
    id: draft.id,
    title: draft.sources?.[0]?.originalTitle ?? draft.id,
    currencies: draft.currencies,
    category: draft.category,
    editorialTypes: draft.editorialTypes ?? [],
    publishedAt: draft.publishedAt,
    sources: (draft.sources ?? []).map(source => ({ name: source.name, url: source.originalUrl, role: source.metadata?.role ?? 'primary' })),
    candidateQuality: true,
    publicationReady: draft.quality?.publicationReady === true,
    publicationErrors: draft.quality?.errors ?? []
  }));
  report.summary.openDrafts = report.proposed.length;
  report.summary.publicationReady = report.proposed.filter(draft => draft.publicationReady).length;

  const processedThisRun = draftsReconciled || report.summary.candidatesInspected > 0 || report.summary.duplicates > 0;
  if (processedThisRun) nextState.updatedAt = now.toISOString();
  return { drafts: nextDrafts, state: nextState, report, processedThisRun };
}

async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

export async function prepareModerationFiles({ paths = defaultPaths, contentProvider = defaultContentProvider, now = new Date(), githubOutput } = {}) {
  const [inbox, stories, drafts, state] = await Promise.all([
    readJson(paths.inbox, { schemaVersion: 1, candidates: [] }),
    readJson(paths.stories, { schemaVersion: 1, stories: [] }),
    readJson(paths.drafts, { schemaVersion: 1, drafts: [] }),
    readJson(paths.state, { schemaVersion: 1, updatedAt: null, processed: {} })
  ]);
  const result = await prepareModeration({ inbox, stories, drafts, state, contentProvider, now });
  if (result.processedThisRun) {
    await Promise.all([
      fs.writeFile(paths.drafts, `${JSON.stringify(result.drafts, null, 2)}\n`, 'utf8'),
      fs.writeFile(paths.state, `${JSON.stringify(result.state, null, 2)}\n`, 'utf8'),
      fs.writeFile(paths.reportJson, `${JSON.stringify(result.report, null, 2)}\n`, 'utf8'),
      fs.writeFile(paths.reportMarkdown, reportMarkdown(result.report), 'utf8')
    ]);
  }
  if (githubOutput) {
    await appendFile(
      githubOutput,
      `new_drafts=${result.report.summary.proposed}\nprocessed=${result.report.summary.candidatesInspected}\nopen_drafts=${result.report.summary.openDrafts}\n`,
      'utf8'
    );
  }
  return result;
}

const invokedDirectly = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (invokedDirectly) {
  const result = await prepareModerationFiles({ githubOutput: process.env.GITHUB_OUTPUT });
  console.log(`Moderation prepared: ${result.report.summary.proposed} drafts, ${result.report.summary.rejected} rejected, ${result.report.summary.duplicates} duplicates.`);
}
