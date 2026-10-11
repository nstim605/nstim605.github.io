import fs from 'node:fs/promises';
import path from 'node:path';
import { createRunTimestamp, writeGeneratedJson } from './generated-json.mjs';

const root = path.resolve(import.meta.dirname, '..');
const androidRoot = path.resolve(process.env.ANDROID_SOURCE_ROOT || path.join(root, '..'));
const manifest = JSON.parse(await fs.readFile(path.join(root, 'site-locales.json'), 'utf8'));
const handlingCopy = JSON.parse(await fs.readFile(
  path.join(root, 'tools', 'privacy-policy-scanner-unlimited.json'), 'utf8'
));
const policyDate = '2026-10-11';
const markerPattern = /\s*<!-- SCANNER_UNLIMITED_POLICY_START -->[\s\S]*?<!-- SCANNER_UNLIMITED_POLICY_END -->\s*/g;

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

async function localizedCopy(locale) {
  const directory = path.join(androidRoot, 'app', 'src', 'main', 'res', resourceFolder(locale));
  const source = path.join(directory, 'strings.xml');
  const rewardedSource = locale.androidLocale === 'en'
    ? source
    : path.join(directory, 'rewarded_strings.xml');
  const [xml, rewardedXml] = await Promise.all([
    fs.readFile(source, 'utf8'),
    fs.readFile(rewardedSource, 'utf8')
  ]);
  const handling = handlingCopy[locale.webLocale];
  if (!handling) throw new Error(`${locale.webLocale}: missing Scanner Unlimited policy copy`);
  return {
    heading: locale.webLocale === 'en'
      ? 'Payments and Scanner Unlimited'
      : `${stringValue(rewardedXml, 'scanner_unlimited_option_title', rewardedSource)} — Google Play`,
    handling,
    freeLimit: locale.webLocale === 'en'
      ? 'Without Unlimited, 5 successful scanner uses are available per local calendar day. A voluntarily viewed rewarded ad adds 10 bonus scans only after the ad SDK confirms the reward. With verified Unlimited, rewarded top-ups are not needed.'
      : stringValue(xml, 'scanner_free_limit_message', source),
    effect: stringValue(xml, 'scanner_unlimited_disclosure', source)
  };
}

function policyPath(locale) {
  return locale.privacyUrl === '/privacy-policy.html'
    ? path.join(root, 'privacy-policy.html')
    : path.join(root, ...locale.privacyUrl.replace(/^\//, '').split('/'));
}

function policySection(copy) {
  return `      <!-- SCANNER_UNLIMITED_POLICY_START -->
      <h2 id="payments-scanner-unlimited">${htmlEscape(copy.heading)}</h2>
      <p>${htmlEscape(copy.handling)}</p>
      <p>${htmlEscape(copy.freeLimit)} ${htmlEscape(copy.effect)}</p>
      <!-- SCANNER_UNLIMITED_POLICY_END -->`;
}

function stripCompactLegacySentence(html, source, locale) {
  const markerIndex = html.indexOf('<!-- PHASE1D_POLICY_START -->');
  if (markerIndex < 0) throw new Error(`${source}: compact policy is missing Phase 1D marker`);
  const prefix = html.slice(0, markerIndex);
  const paragraphs = [...prefix.matchAll(/<p>([^<]*)<\/p>/g)];
  if (paragraphs.length < 2) throw new Error(`${source}: compact policy has too few plain paragraphs`);
  const target = paragraphs.at(-2);
  const thaiLegacyTail = ' แอปไม่ประมวลผลการชำระเงิน';
  if (locale.webLocale === 'th' && target[1].endsWith(thaiLegacyTail)) {
    const replacement = `<p>${target[1].slice(0, -thaiLegacyTail.length)}</p>`;
    return html.slice(0, target.index) + replacement + html.slice(target.index + target[0].length);
  }
  const match = target[1].match(/^([\s\S]*[.!?。！？۔।])\s*([^.!?。！？۔।]+[.!?。！？۔।])$/u);
  if (!match) throw new Error(`${source}: could not isolate legacy payment sentence`);
  const replacement = `<p>${match[1]}</p>`;
  return html.slice(0, target.index) + replacement + html.slice(target.index + target[0].length);
}

function updatePolicy(html, copy, source, locale) {
  const hadCurrentSection = markerPattern.test(html);
  markerPattern.lastIndex = 0;
  let updated = html.replace(markerPattern, '\n');
  const fullPolicy = (updated.match(/<h2(?:\s|>)/g) ?? []).length > 12;

  if (!hadCurrentSection) {
    if (fullPolicy) {
      const legacyBlock = /\s*<h2(?:\s[^>]*)?>[^<]*<\/h2>\s*<p>[^<]*<\/p>(?=\s*<h2 id="contact">)/;
      if (!legacyBlock.test(updated)) throw new Error(`${source}: could not find legacy full payment block`);
      updated = updated.replace(legacyBlock, '\n');
    } else {
      updated = stripCompactLegacySentence(updated, source, locale);
    }
  }

  const insertion = fullPolicy ? /\s*(<h2 id="contact">)/ : /\s*(<!-- PHASE1D_POLICY_START -->)/;
  if (!insertion.test(updated)) throw new Error(`${source}: could not find Scanner Unlimited insertion point`);
  updated = updated.replace(insertion, `\n\n${policySection(copy)}\n\n      $1`)
    .replace(/<p class="policy-meta">[\s\S]*?<\/p>/, `<p class="policy-meta">${policyDate}</p>`);
  if (!updated.includes(`<p class="policy-meta">${policyDate}</p>`)) {
    throw new Error(`${source}: policy date was not updated`);
  }
  return updated;
}

function sourceStrings(html) {
  const withoutScripts = html.replace(/<script[\s\S]*?<\/script>/g, '');
  const values = new Set();
  withoutScripts.replace(/>([^<>]+)</g, (_, value) => {
    const text = value.trim();
    if (/[\p{L}\p{N}]/u.test(text) && text !== '2026' && !/^\d{4}-\d{2}-\d{2}$/.test(text)) values.add(text);
    return _;
  });
  withoutScripts.replace(/\b(?:aria-label|title|alt|data-label-light|data-label-dark)="([^"]+)"/g,
    (_, value) => { if (value) values.add(value); return _; });
  withoutScripts.replace(/<meta\s+(?:name|property)="(?:description|og:title|og:description|og:image:alt|twitter:title|twitter:description)"\s+content="([^"]+)"/g,
    (_, value) => { values.add(value); return _; });
  return [...values];
}

const expectedLocales = manifest.locales.map(locale => locale.webLocale).sort();
if (JSON.stringify(Object.keys(handlingCopy).sort()) !== JSON.stringify(expectedLocales)) {
  throw new Error('Scanner Unlimited copy must cover exactly the 44 production locales');
}

let changed = 0;
for (const locale of manifest.locales) {
  const file = policyPath(locale);
  const [html, copy] = await Promise.all([fs.readFile(file, 'utf8'), localizedCopy(locale)]);
  const updated = updatePolicy(html, copy, file, locale);
  if (updated !== html) {
    await fs.writeFile(file, updated, 'utf8');
    changed += 1;
  }
}

const templatePath = path.join(root, 'tools', 'templates', 'privacy-policy.html');
const [template, englishCopy] = await Promise.all([
  fs.readFile(templatePath, 'utf8'),
  localizedCopy(manifest.locales.find(locale => locale.webLocale === 'en'))
]);
const updatedTemplate = updatePolicy(
  template,
  englishCopy,
  templatePath,
  manifest.locales.find(locale => locale.webLocale === 'en')
);
if (updatedTemplate !== template) {
  await fs.writeFile(templatePath, updatedTemplate, 'utf8');
  changed += 1;
}

const inventoryPath = path.join(root, 'tools', 'production-strings.json');
const inventory = JSON.parse(await fs.readFile(inventoryPath, 'utf8'));
const inventoryResult = await writeGeneratedJson(inventoryPath, {
  source: inventory.source,
  home: inventory.home,
  privacyPolicy: sourceStrings(updatedTemplate)
}, { getRunTimestamp: createRunTimestamp(), generatedAtIndex: 1 });
if (inventoryResult.changed) changed += 1;

console.log(`Synchronized Scanner Unlimited disclosure and ${policyDate} date in ${changed} file(s).`);
