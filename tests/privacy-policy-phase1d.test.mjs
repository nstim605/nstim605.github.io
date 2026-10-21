import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { removeAdSenseIntegration } from '../tools/adsense-integration.mjs';
import { promisify } from 'node:util';
import { appParagraphs, htmlEscape as currentHtmlEscape, policyAnchors, renderPolicyArticle,
  validatePolicyCopy } from '../tools/sync-current-privacy.mjs';

const root = path.resolve(import.meta.dirname, '..');
const androidRoot = path.resolve(process.env.ANDROID_SOURCE_ROOT || path.join(root, '..'));
const execFileAsync = promisify(execFile);
const manifest = JSON.parse(await fs.readFile(path.join(root, 'site-locales.json'), 'utf8'));
const baseCopy = JSON.parse(await fs.readFile(path.join(root, 'tools', 'privacy-policy-phase1d.json'), 'utf8'));
const supplement = JSON.parse(await fs.readFile(path.join(root, 'tools', 'privacy-policy-phase1d-supplement.json'), 'utf8'));
const copy = Object.fromEntries(Object.keys(baseCopy).map(locale => [locale, { ...baseCopy[locale], ...supplement[locale] }]));
const rtlLocales = new Set(['ar', 'he', 'fa', 'ur']);
const resourceFolders = {
  'es-ES': 'values-es-rES', 'es-419': 'values-b+es+419', 'pt-BR': 'values-pt-rBR',
  'pt-PT': 'values-pt-rPT', 'zh-Hans': 'values-b+zh+Hans', 'zh-Hant': 'values-b+zh+Hant'
};
const fields = [
  'analyticsHeading', 'analyticsConsent', 'analyticsData', 'analyticsWithdrawal',
  'advertisingHeading', 'advertisingSummary', 'localHeading', 'localSummary',
  'websiteQaHeading', 'websiteQaSummary', 'securityHeading', 'securitySummary'
];
// Keep historical Phase 1D source/manifest checks, but validate live outputs against
// the complete current policy rather than requiring superseded disclosure sentences.
async function currentCopy(locale) {
  return validatePolicyCopy(JSON.parse(await fs.readFile(path.join(root, 'tools',
    'privacy-1.612', `${locale.webLocale}.json`), 'utf8')), locale.webLocale);
}
const mojibake = /(?:\uFFFD|â€™|â€œ|â€\x9d|ðŸ)/u;
const legacyGooglePlayBadge = 'https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png';
const localGooglePlayBadge = '/assets/google-play-badge-en.png';

function htmlEscape(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function policyFile(locale) {
  return locale.privacyUrl === '/privacy-policy.html'
    ? path.join(root, 'privacy-policy.html')
    : path.join(root, locale.privacyUrl.replace(/^\//, '').replaceAll('/', path.sep));
}

function assertAcceptedManifestDigest({
  repository,
  file,
  expectedSha,
  actualSha,
  acceptedSupersessions,
  usedSupersessions
}) {
  if (actualSha === expectedSha) return;
  const key = `${repository}:${file}`;
  const accepted = acceptedSupersessions.get(key);
  assert.ok(accepted, `unexplained manifest SHA:${key}`);
  assert.equal(accepted.historicalSha256, expectedSha, `historical SHA:${key}`);
  assert.equal(accepted.acceptedSha256, actualSha, `superseded SHA:${key}`);
  usedSupersessions.add(key);
}

function resourceFile(locale) {
  const folder = locale.androidLocale === 'en'
    ? 'values'
    : (resourceFolders[locale.androidLocale] ?? `values-${locale.androidLocale}`);
  return path.join(androidRoot, 'app', 'src', 'main', 'res', folder, 'strings.xml');
}

function decodeXml(value) {
  return value.replace(/<[^>]+>/g, '').replaceAll('&lt;', '<').replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"').replaceAll('&apos;', "'").replaceAll('&#39;', "'")
    .replaceAll('&amp;', '&').replace(/\\n/g, '\n').replace(/\\'/g, "'").replace(/\\"/g, '"').trim();
}

async function androidPolicy(locale) {
  const xml = await fs.readFile(resourceFile(locale), 'utf8');
  const match = xml.match(/<string name="privacy_policy_body">([\s\S]*?)<\/string>/);
  assert.ok(match, `${locale.androidLocale}:privacy_policy_body`);
  return { xml, body: decodeXml(match[1]) };
}

test('Phase 1D copy covers exactly all 44 production locales', () => {
  assert.equal(manifest.locales.length, 44);
  assert.deepEqual(Object.keys(supplement).sort(), manifest.locales.map(locale => locale.webLocale).sort());
  assert.deepEqual(Object.keys(copy).sort(), manifest.locales.map(locale => locale.webLocale).sort());
  for (const [locale, localized] of Object.entries(copy)) {
    for (const field of fields) {
      assert.equal(typeof localized[field], 'string', `${locale}:${field}`);
      assert.equal(localized[field], localized[field].trim(), `${locale}:${field}:trim`);
      const minimumLength = field.endsWith('Heading') ? 1 : 12;
      assert.ok(localized[field].length > minimumLength, `${locale}:${field}:length`);
      assert.doesNotMatch(localized[field], mojibake, `${locale}:${field}:mojibake`);
      if (locale !== 'en') assert.notEqual(localized[field], copy.en[field], `${locale}:${field}:English fallback`);
    }
  }
});

test('all Android in-app policies contain the complete current localized disclosures', async () => {
  for (const locale of manifest.locales) {
    const { xml, body } = await androidPolicy(locale);
    const localized = await currentCopy(locale);
    assert.equal(body, appParagraphs(localized).join('\n\n'), `${locale.androidLocale}:complete policy`);
    assert.ok(xml.includes(`<string name="privacy_last_updated">${localized.date}</string>`),
      `${locale.androidLocale}:current date`);
    assert.ok(body.split(/\n\n+/)[1]?.length > 30, `${locale.androidLocale}:Frankfurter disclosure`);
    assert.doesNotMatch(xml, mojibake, `${locale.androidLocale}:mojibake`);
  }
});

test('all 44 website policies contain one complete current localized disclosure', async () => {
  for (const locale of manifest.locales) {
    const html = await fs.readFile(policyFile(locale), 'utf8');
    const { body } = await androidPolicy(locale);
    const localized = await currentCopy(locale);
    assert.equal((html.match(/PRIVACY_1_612_START/g) ?? []).length, 1, `${locale.webLocale}:start marker`);
    assert.equal((html.match(/PRIVACY_1_612_END/g) ?? []).length, 1, `${locale.webLocale}:end marker`);
    assert.ok(html.replaceAll('\r\n', '\n').includes(renderPolicyArticle(localized)), `${locale.webLocale}:complete article`);
    for (const anchor of policyAnchors) {
      assert.equal((html.match(new RegExp(`id="${anchor}"`, 'g')) ?? []).length, 1,
        `${locale.webLocale}:${anchor}`);
    }
    assert.ok(html.includes('id="website-analytics"'), `${locale.webLocale}:website analytics anchor`);
    assert.ok(html.includes('id="website-advertising"'), `${locale.webLocale}:website advertising anchor`);
    assert.ok(html.includes('AdMob') || html.includes('Google Mobile Ads'), `${locale.webLocale}:AdMob`);
    assert.ok(html.includes('Google Analytics') && html.includes('Firebase'), `${locale.webLocale}:Google/Firebase`);
    const frankfurterParagraph = body.split(/\n\n+/)[1];
    assert.ok(html.includes(currentHtmlEscape(frankfurterParagraph)), `${locale.webLocale}:same Frankfurter source`);
    assert.doesNotMatch(html, mojibake, `${locale.webLocale}:mojibake`);
    assert.match(html, new RegExp(`<html lang="${locale.hreflang}"${rtlLocales.has(locale.webLocale) ? ' dir="rtl"' : ''}>`));
  }
});

test('real policy outputs preserve contact and reject English fallback', async () => {
  const appScreens = await fs.readFile(path.join(androidRoot, 'app', 'src', 'main', 'java',
    'io', 'github', 'nstim605', 'balkanconverter', 'AppScreens.kt'), 'utf8');
  assert.match(appScreens, /DEVELOPER_EMAIL = "nstim605@gmail\.com"/);
  const english = await androidPolicy(manifest.locales.find(locale => locale.webLocale === 'en'));
  const englishSentinels = [
    'Google Analytics for Firebase stays off until you opt in to Usage analytics;',
    'Google Mobile Ads provides a banner and optional rewarded ads.',
    'Reviewed network transfers use HTTPS/TLS, not end-to-end encryption.'
  ];
  for (const locale of manifest.locales) {
    const { body } = await androidPolicy(locale);
    const html = await fs.readFile(policyFile(locale), 'utf8');
    assert.ok(html.includes('id="contact"'), `${locale.webLocale}:contact destination`);
    if (locale.webLocale !== 'en') {
      assert.notEqual(body, english.body, `${locale.androidLocale}:Android English fallback`);
      for (const sentinel of englishSentinels) {
        assert.ok(!html.includes(sentinel), `${locale.webLocale}:website English fallback`);
      }
    }
  }
});

test('English Frankfurter disclosure matches actual request boundaries', async () => {
  const locale = manifest.locales.find(item => item.webLocale === 'en');
  const { body } = await androidPolicy(locale);
  const html = await fs.readFile(policyFile(locale), 'utf8');
  for (const value of ['Exchange-rate requests go to Frankfurter', 'CoinGecko or Kraken over HTTPS',
    'IP address', 'requested currencies, coin identifiers or dates',
    'but not entered conversion amounts, saved-set names, history or search text',
    'Rates and catalogs are cached for offline use']) {
    assert.ok(body.includes(value), `Android English Frankfurter:${value}`);
    assert.ok(html.includes(value), `Website English Frankfurter:${value}`);
  }
});

test('Phase 1D policy copy avoids prohibited English claims', () => {
  const all = Object.values(copy).flatMap(localized => fields.map(field => localized[field])).join('\n').toLowerCase();
  for (const prohibited of [
    'we collect no data', 'the app is anonymous', 'all data is deleted immediately',
    'all ads are non-personalized', 'independent security review'
  ]) assert.ok(!all.includes(prohibited), prohibited);
});

test('real generated outputs avoid prohibited claims', async () => {
  const prohibited = [
    /we collect no data/i,
    /analytics (?:is|are) anonymous/i,
    /all (?:previously transmitted )?data is deleted/i,
    /all ads are non-personalized/i,
    /independent security review (?:was|has been) completed/i
  ];
  for (const locale of manifest.locales) {
    const { body } = await androidPolicy(locale);
    const html = await fs.readFile(policyFile(locale), 'utf8');
    for (const pattern of prohibited) {
      assert.doesNotMatch(body, pattern, `${locale.androidLocale}:${pattern}`);
      assert.doesNotMatch(html, pattern, `${locale.webLocale}:${pattern}`);
    }
  }
});

test('integrity supersession rejects unexplained or future file mutations', () => {
  const key = 'Website:tools/localize-site.mjs';
  const acceptedSupersessions = new Map([[key, {
    historicalSha256: 'a'.repeat(64),
    acceptedSha256: 'b'.repeat(64)
  }]]);
  const usedSupersessions = new Set();
  assert.throws(() => assertAcceptedManifestDigest({
    repository: 'Website', file: 'tools/localize-site.mjs',
    expectedSha: 'a'.repeat(64), actualSha: 'c'.repeat(64),
    acceptedSupersessions, usedSupersessions
  }), /superseded SHA/);
  assert.throws(() => assertAcceptedManifestDigest({
    repository: 'Website', file: 'tools/unexplained.mjs',
    expectedSha: 'a'.repeat(64), actualSha: 'b'.repeat(64),
    acceptedSupersessions, usedSupersessions
  }), /unexplained manifest SHA/);
  assert.equal(usedSupersessions.size, 0);
});

test('historical publication manifest remains immutable and scoped', async () => {
  const manifestFile = path.join(androidRoot, 'artifacts', 'validation',
    'phase1d-privacy-publication-manifest.md');
  const markdown = await fs.readFile(manifestFile, 'utf8');
  const supersessionFile = path.join(androidRoot, 'artifacts', 'validation',
    'phase1d-post-generator-supersession.json');
  const supersession = JSON.parse(await fs.readFile(supersessionFile, 'utf8'));
  assert.equal(supersession.schemaVersion, 1);
  assert.equal(supersession.historicalManifest.path,
    'artifacts/validation/phase1d-privacy-publication-manifest.md');
  assert.equal(crypto.createHash('sha256').update(markdown).digest('hex'),
    supersession.historicalManifest.sha256, 'historical manifest was mutated');
  const rows = markdown.split(/\r?\n/)
    .filter(line => line.startsWith('|Android|') || line.startsWith('|Website|'))
    .map(line => line.slice(1, -1).split('|'));
  assert.equal(rows.length, 107);
  const policyUrls = [];
  const androidLocales = [];
  for (const row of rows) {
    assert.equal(row.length, 10, `manifest columns:${row[1]}`);
    const [repository, file, sourceOrGenerated, locale, publicUrl, expectedSha] = row;
    assert.match(sourceOrGenerated, /source|generated|generator|template|validation|draft/i);
    assert.match(expectedSha, /^[a-f0-9]{64}$/, `historical SHA:${file}`);
    if (sourceOrGenerated.includes('policy page')) policyUrls.push(publicUrl);
    if (sourceOrGenerated === 'localized policy source') androidLocales.push(locale);
    assert.ok(!/(?:index\.html|assets\/|screenshot|marketing)/i.test(file), `unrelated manifest file:${file}`);
  }
  assert.equal(policyUrls.length, 44);
  assert.equal(new Set(policyUrls).size, 44);
  assert.equal(androidLocales.length, 44);
  assert.equal(new Set(androidLocales).size, 44);
  for (const locale of manifest.locales) {
    assert.ok(policyUrls.includes(`https://balkanconverter.com${locale.privacyUrl}`),
      `manifest URL:${locale.webLocale}`);
  }
});
