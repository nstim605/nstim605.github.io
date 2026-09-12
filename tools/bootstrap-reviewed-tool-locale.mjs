import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const locale = process.argv[process.argv.indexOf('--locale') + 1];
if (!locale) throw new Error('Use --locale <locale>');

const payload = JSON.parse(await fs.readFile(path.join(root, 'tools', 'tool-copy.json'), 'utf8'));
const source = payload.locales?.[locale];
if (!source) throw new Error(`Unknown locale: ${locale}`);

const output = path.join(root, 'tools', `tool-copy-reviewed-${locale}.json`);
try {
  await fs.access(output);
  throw new Error(`Refusing to overwrite existing reviewed catalog: ${path.relative(root, output)}`);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

const sorted = Object.fromEntries(Object.entries(source).sort(([left], [right]) => left.localeCompare(right, 'en')));
await fs.writeFile(output, `${JSON.stringify(sorted, null, 2)}\n`);
console.log(`Created review starting point for ${locale}: ${Object.keys(sorted).length} messages.`);
