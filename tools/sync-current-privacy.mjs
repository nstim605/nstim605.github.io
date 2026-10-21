import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
export const currentPolicyDate = '2026-10-21';
export const policyAnchors = [
  'app-identity', 'exchange-rates', 'on-device-recognition', 'app-advertising-consent',
  'android-analytics', 'payments-scanner-unlimited', 'local-app-data', 'contact'
];
const articlePattern = /<article class="policy-card">[\s\S]*?<\/article>/g;
const datePattern = /<p class="policy-meta">[^<]*<\/p>/g;

export function validatePolicyCopy(copy, locale) {
  if (!copy || typeof copy !== 'object' || Array.isArray(copy)) {
    throw new Error(`${locale}: policy must be an object`);
  }
  const keys = ['date', 'app', 'analyticsLink', 'webHeading', 'web'].sort();
  if (JSON.stringify(Object.keys(copy).sort()) !== JSON.stringify(keys)
      || copy.date !== currentPolicyDate || !Array.isArray(copy.app) || copy.app.length !== 8
      || !Array.isArray(copy.web) || copy.web.length !== 2) {
    throw new Error(`${locale}: incomplete or unexpected current policy schema`);
  }
  for (const value of [...copy.app, copy.analyticsLink, copy.webHeading, ...copy.web]) {
    if (typeof value !== 'string' || !value.trim() || value !== value.trim()
        || /[\uFFFD\u0000]/.test(value)) {
      throw new Error(`${locale}: empty, untrimmed or invalid policy text`);
    }
  }
  return copy;
}

export const htmlEscape = value => String(value).replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;').replaceAll('>', '&gt;');

export function appParagraphs(copy) {
  const paragraphs = [...copy.app];
  paragraphs[4] += ` ${copy.analyticsLink}`;
  return paragraphs;
}

export function renderPolicyArticle(copy) {
  validatePolicyCopy(copy, 'render');
  return '<article class="policy-card">\n      <!-- PRIVACY_1_612_START -->\n'
    + appParagraphs(copy).map((paragraph, i) =>
      `      <p id="${policyAnchors[i]}">${htmlEscape(paragraph)}</p>`).join('\n\n')
    + `\n\n      <h2 id="website-analytics">${htmlEscape(copy.webHeading)}</h2>\n`
    + copy.web.map((paragraph, i) =>
      `      <p${i === 1 ? ' id="website-advertising"' : ''}>${htmlEscape(paragraph)}</p>`).join('\n\n')
    + '\n      <!-- PRIVACY_1_612_END -->\n    </article>';
}

export function updatePolicyDocument(before, copy, file = 'policy') {
  if ([...before.matchAll(articlePattern)].length !== 1
      || [...before.matchAll(datePattern)].length !== 1) {
    throw new Error(`${file}: expected exactly one policy article and date`);
  }
  const newline = before.includes('\r\n') ? '\r\n' : '\n';
  return before.replace(articlePattern, () => renderPolicyArticle(copy).replaceAll('\n', newline))
    .replace(datePattern, () => `<p class="policy-meta">${copy.date}</p>`);
}

export function sourceStrings(html) {
  const withoutScripts = html.replace(/<script[\s\S]*?<\/script>/g, '');
  const values = new Set();
  for (const [, value] of withoutScripts.matchAll(/>([^<>]+)</g)) {
    const text = value.trim();
    if (/[\p{L}\p{N}]/u.test(text) && text !== '2026' && !/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      values.add(text);
    }
  }
  for (const [, value] of withoutScripts.matchAll(/\b(?:aria-label|title|alt|data-label-light|data-label-dark)="([^"]+)"/g)) {
    if (value) values.add(value);
  }
  for (const [, value] of withoutScripts.matchAll(/<meta\s+(?:name|property)="(?:description|og:title|og:description|og:image:alt|twitter:title|twitter:description)"\s+content="([^"]+)"/g)) {
    values.add(value);
  }
  return [...values];
}

export function updateInventory(inventory, template) {
  // Preserve source/home/links/generatedAt and any future fields verbatim in value.
  return { ...inventory, privacyPolicy: sourceStrings(template) };
}

function scopedPolicyPath(privacyUrl) {
  if (!/^\/(?:[a-z][a-z0-9-]*\/)?privacy-policy\.html$/.test(privacyUrl)) {
    throw new Error(`Unexpected policy URL: ${privacyUrl}`);
  }
  const file = path.resolve(root, privacyUrl.slice(1));
  if (!file.startsWith(root + path.sep)) throw new Error('Policy path escaped website root');
  return file;
}

export async function planPolicyUpdates() {
  const manifest = JSON.parse(await fs.readFile(path.join(root, 'site-locales.json'), 'utf8'));
  const locales = manifest.locales.map(locale => locale.webLocale);
  if (locales.length !== 44 || new Set(locales).size !== 44 || !locales.includes('en')) {
    throw new Error('Expected exactly 44 unique website locales including English');
  }
  const sourceDirectory = path.join(root, 'tools', 'privacy-1.612');
  const files = (await fs.readdir(sourceDirectory)).filter(file => file.endsWith('.json'));
  if (JSON.stringify(files.sort()) !== JSON.stringify(locales.map(locale => `${locale}.json`).sort())) {
    throw new Error('Current privacy sources must cover exactly the 44 website locales');
  }
  const copies = new Map();
  for (const locale of locales) {
    const copy = JSON.parse(await fs.readFile(path.join(sourceDirectory, `${locale}.json`), 'utf8'));
    copies.set(locale, validatePolicyCopy(copy, locale));
  }
  const updates = [];
  for (const locale of manifest.locales) {
    const file = scopedPolicyPath(locale.privacyUrl);
    const before = await fs.readFile(file, 'utf8');
    updates.push({ file, before, after: updatePolicyDocument(before, copies.get(locale.webLocale), file) });
  }
  const templateFile = path.join(root, 'tools', 'templates', 'privacy-policy.html');
  const templateBefore = await fs.readFile(templateFile, 'utf8');
  const templateAfter = updatePolicyDocument(templateBefore, copies.get('en'), templateFile);
  updates.push({ file: templateFile, before: templateBefore, after: templateAfter });
  const inventoryFile = path.join(root, 'tools', 'production-strings.json');
  const inventoryBefore = await fs.readFile(inventoryFile, 'utf8');
  const inventoryNewline = inventoryBefore.includes('\r\n') ? '\r\n' : '\n';
  const inventoryAfter = (JSON.stringify(updateInventory(JSON.parse(inventoryBefore), templateAfter), null, 2) + '\n')
    .replaceAll('\n', inventoryNewline);
  updates.push({ file: inventoryFile, before: inventoryBefore, after: inventoryAfter });
  // Every input and output is validated before --apply can write any file.
  return updates.filter(update => update.before !== update.after);
}

function patchForUpdate({ file, before, after }) {
  const oldLines = before.replaceAll('\r\n', '\n').trimEnd().split('\n');
  const newLines = after.replaceAll('\r\n', '\n').trimEnd().split('\n');
  let first = 0;
  while (first < oldLines.length && oldLines[first] === newLines[first]) first++;
  let oldEnd = oldLines.length;
  let newEnd = newLines.length;
  while (oldEnd > first && newEnd > first && oldLines[oldEnd - 1] === newLines[newEnd - 1]) {
    oldEnd--; newEnd--;
  }
  return `*** Update File: ${file.replaceAll('\\', '/')}\n@@\n`
    + oldLines.slice(Math.max(0, first - 2), first).map(line => ` ${line}`).join('\n') + '\n'
    + oldLines.slice(first, oldEnd).map(line => `-${line}`).join('\n') + '\n'
    + newLines.slice(first, newEnd).map(line => `+${line}`).join('\n') + '\n'
    + oldLines.slice(oldEnd, oldEnd + 2).map(line => ` ${line}`).join('\n') + '\n';
}

export async function main(args = process.argv.slice(2)) {
  if (args.length > 1 || args.some(arg => !['--check', '--apply', '--patch'].includes(arg))) {
    throw new Error('Usage: node tools/sync-current-privacy.mjs [--check|--patch|--apply]');
  }
  const updates = await planPolicyUpdates();
  if (args[0] === '--patch') {
    process.stdout.write(updates.length ? '*** Begin Patch\n' + updates.map(patchForUpdate).join('') + '*** End Patch\n' : 'UNCHANGED\n');
    return 0;
  }
  if (args[0] === '--apply') {
    // Refuse a concurrent edit rather than overwriting it with a stale plan.
    for (const { file, before } of updates) {
      if (await fs.readFile(file, 'utf8') !== before) throw new Error(`Concurrent change: ${file}`);
    }
    for (const { file, after } of updates) await fs.writeFile(file, after, 'utf8');
    console.log(`Synchronized ${updates.length} privacy-only file(s); other pages and inventory fields preserved.`);
    return 0;
  }
  for (const { file } of updates) console.log(`OUTDATED ${path.relative(root, file)}`);
  console.log(`Current privacy check: ${updates.length ? 'FAIL' : 'PASS'} (${updates.length} pending file(s)).`);
  return updates.length ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = await main();
}
