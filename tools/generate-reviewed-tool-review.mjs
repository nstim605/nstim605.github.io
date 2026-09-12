import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const manifest = JSON.parse(await fs.readFile(path.join(root, 'tools', 'reviewed-tool-locales.json'), 'utf8'));
const requestedLocale = process.argv[process.argv.indexOf('--locale') + 1];
const entry = manifest.locales.find(item => item.locale === requestedLocale);
if (!requestedLocale || !entry) throw new Error('Use --locale with an entry from tools/reviewed-tool-locales.json');

const tools = [
  'currency-converter', 'exchange-rate-markup-calculator', 'multi-currency-converter',
  'offline-currency-converter', 'exchange-rate-history', 'currency-converter-widget',
  'foreign-transaction-fee-calculator', 'travel-budget-calculator'
];
const status = process.argv.includes('--low-confidence') ? 'LOW CONFIDENCE' : 'LANGUAGE QA PASS — LOCAL';
const reviewFile = `${entry.language.toUpperCase().replaceAll(/[^A-Z]+/g, '_')}_TOOL_LOCALIZATION_REVIEW.md`;

function decode(value) {
  return value.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&nbsp;', ' ');
}

function mainLines(html) {
  const main = html.match(/<main\b[\s\S]*?<\/main>/)?.[0] ?? '';
  return decode(main.replace(/<span[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/span>/g, '')
    .replace(/<script\b[\s\S]*?<\/script>/g, '')
    .replace(/<\/(?:h1|h2|h3|p|label|button|dt|dd|figcaption|article|aside|section)>/g, '\n')
    .replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '').split(/\r?\n/)
    .map(line => line.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n'));
}

function dynamicMessages(html, visibleText) {
  const payload = html.match(/<script id="tool-i18n" type="application\/json">([\s\S]*?)<\/script>/)?.[1];
  if (!payload) return [];
  return [...new Set(Object.values(JSON.parse(payload)))].filter(value => value.trim() && !visibleText.includes(value))
    .sort((a, b) => a.localeCompare(b, entry.locale));
}

const sections = [];
for (const slug of tools) {
  const html = await fs.readFile(path.join(root, entry.route, slug, 'index.html'), 'utf8');
  const title = decode(html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '');
  const description = decode(html.match(/<meta name="description" content="([^"]*)">/)?.[1] ?? '');
  const visible = mainLines(html);
  const dynamic = dynamicMessages(html, visible);
  const h1 = decode(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1].replace(/<[^>]+>/g, '') ?? slug);
  sections.push(`## ${h1}\n\nURL: \`/${entry.route}/${slug}/\`\n\nTitle: ${title}\n\nMeta description: ${description}\n\n### Complete visible main content\n\n\`\`\`text\n${visible}\n\`\`\`\n\n### Additional dynamic messages\n\n${dynamic.length ? dynamic.map(value => `- ${value}`).join('\n') : '- None.'}`);
}

const document = `# ${entry.language} web tools — language and editorial review\n\nStatus: **${status}**\n\nLocale: \`${entry.locale}\`\nRoute: \`/${entry.route}/\`\n\nThis artifact contains the complete final visible copy and the additional runtime message catalog for all eight existing currency tools. English is the semantic source; no other locale is used as an intermediary.\n\n${sections.join('\n\n')}\n\n## Open language questions\n\n${status === 'LOW CONFIDENCE' ? 'See the batch report for the exact passages requiring additional review.' : 'None.'}\n`;
await fs.writeFile(path.join(root, reviewFile), document);
console.log(`Generated ${reviewFile}: ${status}`);
