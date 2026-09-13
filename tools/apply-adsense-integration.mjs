import fs from 'node:fs/promises';
import path from 'node:path';

import { applyAdSenseIntegration } from './adsense-integration.mjs';

const root = path.resolve(import.meta.dirname, '..');
const manifest = JSON.parse(await fs.readFile(path.join(root, 'site-locales.json'), 'utf8'));
const toolSlugs = Object.keys(manifest.locales[0].toolUrls);
const targets = [
  { relative: 'index.html' },
  { relative: 'privacy-policy.html', privacyPolicy: true },
  { relative: 'tools/templates/index.html' },
  { relative: 'tools/templates/privacy-policy.html', privacyPolicy: true },
  ...toolSlugs.map(slug => ({ relative: `${slug}/index.html` }))
];

for (const target of targets) {
  const file = path.join(root, target.relative);
  const before = await fs.readFile(file, 'utf8');
  const after = applyAdSenseIntegration(before, { privacyPolicy: target.privacyPolicy === true });
  if (after !== before) await fs.writeFile(file, after);
}

console.log(`AdSense integration prepared in ${targets.length} English source/template pages.`);
