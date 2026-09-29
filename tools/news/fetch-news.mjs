import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { classifyCandidate, deduplicateStories } from './core.mjs';
import { automatedNewsSources } from './sources.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const inboxPath = path.join(root, 'news', 'data', 'inbox.json');

export async function collectNewsCandidates({
  sources = automatedNewsSources,
  fetchOptions = {},
  now = new Date()
} = {}) {
  const settled = await Promise.allSettled(sources.map(async source => {
    const items = await source.fetch(fetchOptions);
    const normalized = [];
    const itemErrors = [];
    for (const item of items) {
      try {
        const candidate = source.normalize(item);
        normalized.push(candidate);
      } catch (error) {
        itemErrors.push(error.message);
      }
    }
    return { source, normalized, itemErrors };
  }));

  const candidates = [];
  const sourceRuns = settled.map((result, index) => {
    const source = sources[index];
    if (result.status === 'rejected') {
      return { sourceId: source.id, ok: false, fetchedAt: now.toISOString(), error: result.reason?.message ?? String(result.reason) };
    }
    candidates.push(...result.value.normalized);
    return {
      sourceId: source.id,
      ok: true,
      fetchedAt: now.toISOString(),
      accepted: result.value.normalized.length,
      malformedItems: result.value.itemErrors.length,
      errors: result.value.itemErrors.slice(0, 10)
    };
  });

  return { candidates: deduplicateStories(candidates).map(classifyCandidate), sourceRuns };
}

function comparableCandidate(candidate) {
  const { firstSeenAt, lastSeenAt, ...stable } = candidate;
  return stable;
}

export function mergeInbox(previous, incoming, now) {
  const byId = new Map((previous.candidates ?? []).map(candidate => [candidate.id, candidate]));
  let changed = false;
  for (const candidate of incoming.candidates) {
    const existing = byId.get(candidate.id);
    if (!existing) {
      changed = true;
      byId.set(candidate.id, { ...candidate, firstSeenAt: now.toISOString(), lastSeenAt: now.toISOString() });
      continue;
    }
    if (JSON.stringify(comparableCandidate(existing)) !== JSON.stringify(comparableCandidate(candidate))) {
      changed = true;
      byId.set(candidate.id, { ...existing, ...candidate, firstSeenAt: existing.firstSeenAt, lastSeenAt: now.toISOString() });
    }
  }
  const candidates = [...byId.values()]
    .sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt))
    .slice(0, 200);
  if (!changed && JSON.stringify(candidates) === JSON.stringify(previous.candidates ?? [])) return previous;
  return { schemaVersion: 1, updatedAt: now.toISOString(), candidates, sourceRuns: incoming.sourceRuns };
}

export async function updateInbox(options = {}) {
  const now = options.now ?? new Date();
  let previous = { schemaVersion: 1, updatedAt: null, candidates: [], sourceRuns: [] };
  try { previous = JSON.parse(await fs.readFile(inboxPath, 'utf8')); } catch {}
  const incoming = await collectNewsCandidates({ ...options, now });
  if (incoming.sourceRuns.every(run => !run.ok)) {
    throw new AggregateError(incoming.sourceRuns.map(run => new Error(`${run.sourceId}: ${run.error}`)), 'All news sources failed; the existing inbox and published pages were left unchanged');
  }
  const next = mergeInbox(previous, incoming, now);
  if (JSON.stringify(next) !== JSON.stringify(previous)) {
    await fs.writeFile(inboxPath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  }
  return next;
}

const invokedDirectly = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (invokedDirectly) {
  const result = await updateInbox();
  const succeeded = result.sourceRuns.filter(run => run.ok).length;
  const failed = result.sourceRuns.length - succeeded;
  console.log(`News inbox updated with ${result.candidates.length} cached candidates (${succeeded} sources succeeded, ${failed} failed).`);
}
