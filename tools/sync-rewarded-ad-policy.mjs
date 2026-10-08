import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const androidRoot = path.resolve(process.env.ANDROID_SOURCE_ROOT || path.join(root, '..'));
const manifest = JSON.parse(await fs.readFile(path.join(root, 'site-locales.json'), 'utf8'));

const resourceFolders = {
  'es-ES': 'values-es-rES',
  'es-419': 'values-b+es+419',
  'pt-BR': 'values-pt-rBR',
  'pt-PT': 'values-pt-rPT',
  'zh-Hans': 'values-b+zh+Hans',
  'zh-Hant': 'values-b+zh+Hant'
};

function resourceFolder(locale) {
  return locale.androidLocale === 'en'
    ? 'values'
    : (resourceFolders[locale.androidLocale] ?? `values-${locale.androidLocale}`);
}

function decodeXml(value) {
  return value.replace(/<[^>]+>/g, '')
    .replaceAll('&lt;', '<').replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"').replaceAll('&apos;', "'")
    .replaceAll('&#39;', "'").replaceAll('&amp;', '&')
    .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
    .replace(/\\n/g, '\n').replace(/\\'/g, "'").replace(/\\"/g, '"').trim();
}

function htmlEscape(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function stringValue(xml, name, source) {
  const match = xml.match(new RegExp(`<string\\s+name="${name}"[^>]*>([\\s\\S]*?)<\\/string>`));
  if (!match) throw new Error(`${source}: missing ${name}`);
  return decodeXml(match[1]);
}

async function policyCopy(locale) {
  const folder = resourceFolder(locale);
  const directory = path.join(androidRoot, 'app', 'src', 'main', 'res', folder);
  const stringsPath = path.join(directory, 'strings.xml');
  const rewardedPath = locale.androidLocale === 'en'
    ? stringsPath
    : path.join(directory, 'rewarded_strings.xml');
  const [stringsXml, rewardedXml] = await Promise.all([
    fs.readFile(stringsPath, 'utf8'),
    fs.readFile(rewardedPath, 'utf8')
  ]);
  return {
    advertising: stringValue(rewardedXml, 'privacy_rewarded_scanner_addendum', rewardedPath),
    lastUpdated: stringValue(stringsXml, 'privacy_last_updated', stringsPath)
  };
}

function policyPath(locale) {
  return locale.privacyUrl === '/privacy-policy.html'
    ? path.join(root, 'privacy-policy.html')
    : path.join(root, ...locale.privacyUrl.replace(/^\//, '').split('/'));
}

function updatePolicy(html, copy, source) {
  const advertisingBlock = /(<h2 id="app-advertising-consent">[\s\S]*?<\/h2>\s*)<p>[\s\S]*?<\/p>/g;
  const matches = [...html.matchAll(advertisingBlock)];
  if (matches.length !== 1) throw new Error(`${source}: expected one app advertising section, found ${matches.length}`);
  const updated = html.replace(advertisingBlock, `$1<p>${htmlEscape(copy.advertising)}</p>`)
    .replace(/<p class="policy-meta">[\s\S]*?<\/p>/, `<p class="policy-meta">${htmlEscape(copy.lastUpdated)}</p>`);
  if (!updated.includes(`<p class="policy-meta">${htmlEscape(copy.lastUpdated)}</p>`)) {
    throw new Error(`${source}: policy date was not updated`);
  }
  return updated;
}

let changed = 0;
for (const locale of manifest.locales) {
  const file = policyPath(locale);
  const [html, copy] = await Promise.all([fs.readFile(file, 'utf8'), policyCopy(locale)]);
  const updated = updatePolicy(html, copy, file);
  if (updated !== html) {
    await fs.writeFile(file, updated);
    changed += 1;
  }
}

const english = manifest.locales.find(locale => locale.androidLocale === 'en');
if (!english) throw new Error('English locale is missing from site-locales.json');
const templatePath = path.join(root, 'tools', 'templates', 'privacy-policy.html');
const [template, englishCopy] = await Promise.all([
  fs.readFile(templatePath, 'utf8'),
  policyCopy(english)
]);
const updatedTemplate = updatePolicy(template, englishCopy, templatePath);
if (updatedTemplate !== template) {
  await fs.writeFile(templatePath, updatedTemplate);
  changed += 1;
}

console.log(`Synchronized rewarded-ad disclosure from Android resources in ${changed} file(s).`);
