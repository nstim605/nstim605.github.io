import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const androidRoot = path.resolve(root, '..');
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
const mojibake = /(?:\uFFFD|â€™|â€œ|â€\x9d|ðŸ)/u;

function htmlEscape(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function policyFile(locale) {
  return locale.privacyUrl === '/privacy-policy.html'
    ? path.join(root, 'privacy-policy.html')
    : path.join(root, locale.privacyUrl.replace(/^\//, '').replaceAll('/', path.sep));
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
    .replaceAll('&amp;', '&').replace(/\\n/g, '\n').replace(/\\'/g, "'").trim();
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

test('all Android in-app policies contain the localized Phase 1D disclosures', async () => {
  for (const locale of manifest.locales) {
    const { xml, body } = await androidPolicy(locale);
    const localized = copy[locale.webLocale];
    for (const field of ['analyticsConsent', 'analyticsData', 'analyticsWithdrawal', 'advertisingSummary', 'localSummary', 'websiteQaSummary', 'securitySummary']) {
      const expected = localized[field].replaceAll('&', '&amp;').replaceAll("'", "\\'");
      assert.ok(xml.includes(expected), `${locale.androidLocale}:${field}`);
    }
    assert.match(xml, /<string name="privacy_last_updated">[^<]+<\/string>/);
    assert.ok(body.split(/\n\n+/)[1]?.length > 30, `${locale.androidLocale}:Frankfurter disclosure`);
    assert.doesNotMatch(xml, mojibake, `${locale.androidLocale}:mojibake`);
  }
});

test('all 44 website policies contain one localized, structured Phase 1D disclosure', async () => {
  for (const locale of manifest.locales) {
    const html = await fs.readFile(policyFile(locale), 'utf8');
    const { body } = await androidPolicy(locale);
    const localized = copy[locale.webLocale];
    assert.equal((html.match(/PHASE1D_POLICY_START/g) ?? []).length, 1, `${locale.webLocale}:start marker`);
    assert.equal((html.match(/PHASE1D_POLICY_END/g) ?? []).length, 1, `${locale.webLocale}:end marker`);
    for (const field of fields) assert.ok(html.includes(htmlEscape(localized[field])), `${locale.webLocale}:${field}`);
    assert.ok(html.includes('id="android-analytics"'), `${locale.webLocale}:android analytics anchor`);
    assert.ok(html.includes('id="app-advertising-consent"'), `${locale.webLocale}:advertising anchor`);
    assert.ok(html.includes('id="local-app-data"'), `${locale.webLocale}:local data anchor`);
    assert.ok(html.includes('id="website-qa-isolation"'), `${locale.webLocale}:QA isolation anchor`);
    assert.ok(html.includes('id="security"'), `${locale.webLocale}:security anchor`);
    assert.ok(html.includes('id="website-analytics"'), `${locale.webLocale}:website analytics anchor`);
    assert.ok(html.includes('id="contact"'), `${locale.webLocale}:contact`);
    assert.ok(html.includes('AdMob') || html.includes('Google Mobile Ads'), `${locale.webLocale}:AdMob`);
    assert.ok(html.includes('Google Analytics') && html.includes('Firebase'), `${locale.webLocale}:Google/Firebase`);
    const frankfurterParagraph = body.split(/\n\n+/)[1];
    if (!['en', 'sr', 'bs', 'hr', 'sq', 'mk', 'bg'].includes(locale.webLocale)) {
      assert.ok(html.includes(htmlEscape(frankfurterParagraph)), `${locale.webLocale}:generated Frankfurter source`);
    } else {
      assert.match(html, /Frankfurter|Франкфуртер/u, `${locale.webLocale}:preserved Frankfurter disclosure`);
    }
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
    'Google Analytics for Firebase is used in the Android app only if you explicitly opt in.',
    'The Android app contains one AdMob banner.',
    'Reviewed network transfers use HTTPS/TLS.'
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
  for (const value of ['currency codes', 'date range', 'do not include an entered amount',
    'Saved Set name', 'history', 'locale', 'user-entered text']) {
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

test('publication manifest has exactly 107 current, scoped entries', async () => {
  const manifestFile = path.join(androidRoot, 'artifacts', 'validation',
    'phase1d-privacy-publication-manifest.md');
  const markdown = await fs.readFile(manifestFile, 'utf8');
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
    const repositoryRoot = repository === 'Android' ? androidRoot : root;
    const absolute = path.join(repositoryRoot, ...file.split('/'));
    const digest = crypto.createHash('sha256').update(await fs.readFile(absolute)).digest('hex');
    assert.equal(digest, expectedSha, `manifest SHA:${repository}:${file}`);
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
