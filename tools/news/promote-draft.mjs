import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validateStoryQuality } from './core.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const draftsPath = path.join(root, 'news', 'data', 'drafts.json');
const storiesPath = path.join(root, 'news', 'data', 'stories.json');
const statePath = path.join(root, 'news', 'data', 'moderation-state.json');
export function promoteDraftData({ drafts, stories, state }, draftId) {
  const nextDrafts = structuredClone(drafts);
  const nextStories = structuredClone(stories);
  const nextState = structuredClone(state);
  const index = nextDrafts.drafts.findIndex(draft => draft.id === draftId);
  if (index < 0) throw new Error(`Unknown draft: ${draftId}`);

  const { candidateId, quality, ...draft } = nextDrafts.drafts[index];
  const story = { ...draft, status: 'published', indexable: true };
  const result = validateStoryQuality(story);
  if (!result.ok) throw new Error(`Draft cannot be promoted:\n${result.errors.map(error => `- ${error}`).join('\n')}`);
  if (nextStories.stories.some(current => current.id === story.id || current.slug === story.slug)) throw new Error('A published story already uses this ID or slug');

  nextStories.stories.push(story);
  nextDrafts.drafts.splice(index, 1);
  if (candidateId && nextState.processed?.[candidateId]) nextState.processed[candidateId].status = 'published';
  return { drafts: nextDrafts, stories: nextStories, state: nextState, story };
}

async function main() {
  const draftId = process.argv[2];
  if (!draftId) throw new Error('Usage: node tools/news/promote-draft.mjs <draft-id>');
  const [drafts, stories, state] = await Promise.all([
    fs.readFile(draftsPath, 'utf8').then(text => JSON.parse(text)),
    fs.readFile(storiesPath, 'utf8').then(text => JSON.parse(text)),
    fs.readFile(statePath, 'utf8').then(text => JSON.parse(text))
  ]);
  const promoted = promoteDraftData({ drafts, stories, state }, draftId);
  await Promise.all([
    fs.writeFile(storiesPath, `${JSON.stringify(promoted.stories, null, 2)}\n`, 'utf8'),
    fs.writeFile(draftsPath, `${JSON.stringify(promoted.drafts, null, 2)}\n`, 'utf8'),
    fs.writeFile(statePath, `${JSON.stringify(promoted.state, null, 2)}\n`, 'utf8')
  ]);
  console.log(`Promoted ${draftId}. Run the generator and full test suite before review.`);
}

const invokedDirectly = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (invokedDirectly) await main();
