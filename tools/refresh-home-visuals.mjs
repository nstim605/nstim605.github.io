/** Backwards-compatible entry point for the current homepage release sync. */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { syncHomepages, updateHomepage } from './sync-v1603-homepage.mjs';

export { updateHomepage as refreshVisuals };

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await syncHomepages();
}
