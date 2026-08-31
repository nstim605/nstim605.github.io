import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

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

test('publication manifest has exactly 107 current, scoped entries', async () => {
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
  const acceptedSupersessions = new Map();
  for (const entry of supersession.supersessions) {
    const key = `${entry.repository}:${entry.file}`;
    assert.equal(acceptedSupersessions.has(key), false, `duplicate supersession:${key}`);
    assert.match(entry.historicalSha256, /^[a-f0-9]{64}$/);
    assert.match(entry.acceptedSha256, /^[a-f0-9]{64}$/);
    assert.notEqual(entry.historicalSha256, entry.acceptedSha256);
    assert.ok(entry.reason.length >= 20, `missing supersession reason:${key}`);
    if (entry.acceptedCommit) {
      assert.match(entry.acceptedCommit, /^[a-f0-9]{40}$/);
      const repositoryRoot = entry.repository === 'Android' ? androidRoot : root;
      const { stdout } = await execFileAsync('git', [
        '-c', `safe.directory=${repositoryRoot.replaceAll('\\', '/')}`,
        'show', `${entry.acceptedCommit}:${entry.file}`
      ], { cwd: repositoryRoot, encoding: 'buffer', maxBuffer: 10 * 1024 * 1024 });
      assert.equal(crypto.createHash('sha256').update(stdout).digest('hex'),
        entry.acceptedSha256, `accepted commit content:${key}`);
    } else {
      assert.ok(entry.acceptedTask.length >= 20, `missing accepted task:${key}`);
    }
    acceptedSupersessions.set(key, entry);
  }
  // Website-only visual work may supersede generator/test bytes without changing
  // the historical policy publication manifest or any legal-copy output.
  // Pin both the previously accepted digest and the new digest; unknown changes
  // still fail, and the original accepted commit is authenticated above.
  const visualSupersessions = JSON.parse(await fs.readFile(path.join(root,
    'tools', 'visual-refresh-integrity.json'), 'utf8'));
  assert.equal(visualSupersessions.schemaVersion, 1);
  assert.deepEqual(visualSupersessions.files.map(entry => entry.file).sort(),
    ['tests/privacy-policy-phase1d.test.mjs', 'tools/localize-site.mjs', 'tools/production-strings.json']);
  for (const entry of visualSupersessions.files) {
    const key = `Website:${entry.file}`;
    const originalRow = markdown.split(/\r?\n/)
      .find(line => line.startsWith(`|Website|${entry.file}|`));
    assert.ok(originalRow, `missing historical visual entry:${key}`);
    const historicalSha256 = originalRow.slice(1, -1).split('|')[5];
    const previous = acceptedSupersessions.get(key) ?? {
      historicalSha256, acceptedSha256: historicalSha256
    };
    assert.ok(previous, `missing previous acceptance:${key}`);
    assert.equal(entry.previousAcceptedSha256, previous.acceptedSha256,
      `previous visual acceptance:${key}`);
    assert.match(entry.acceptedSha256, /^[a-f0-9]{64}$/);
    assert.notEqual(entry.acceptedSha256, previous.acceptedSha256);
    assert.ok(entry.reason.length >= 20, `missing visual change reason:${key}`);
    acceptedSupersessions.set(key, { ...previous, acceptedSha256: entry.acceptedSha256 });
  }
  const rows = markdown.split(/\r?\n/)
    .filter(line => line.startsWith('|Android|') || line.startsWith('|Website|'))
    .map(line => line.slice(1, -1).split('|'));
  assert.equal(rows.length, 107);
  const policyUrls = [];
  const androidLocales = [];
  const usedSupersessions = new Set();
  // These seven preserved pages were already published by this fixed commit,
  // but its final bytes were not captured by the earlier publication manifest.
  // Check the immutable published blob, never HEAD or a newly generated policy.
  const publishedPolicyCommit = '45c953fb8a116c114e1072f8d280e4c7ab9d2fab';
  const preservedPolicyFiles = new Set(['privacy-policy.html', ...
    ['sr', 'bs', 'hr', 'sq', 'mk', 'bg'].map(locale => `${locale}/privacy-policy.html`)]);
  // Production 1.5 (11) additionally capitalized the standalone Russian title
  // and updated the tracked operational audit document. Keep these pinned to the
  // production source commit; do not accept arbitrary current Android changes.
  const productionSourceCommit = '84ab517f24732f833d2c6b57629a840795cc6cd1';
  const productionEvidenceFiles = new Set(['app/src/main/res/values-ru/strings.xml',
    'docs/PRIVACY_DATA_SAFETY.md']);
  const standaloneTitles = JSON.parse(await fs.readFile(path.join(root,
    'tools/privacy-title-copy.json'), 'utf8'));
  const titleBaselineCommit = '0406901fcb071f465366c1b5518888dbb7f4389a';
  for (const row of rows) {
    assert.equal(row.length, 10, `manifest columns:${row[1]}`);
    const [repository, file, sourceOrGenerated, locale, publicUrl, expectedSha] = row;
    assert.match(sourceOrGenerated, /source|generated|generator|template|validation|draft/i);
    const repositoryRoot = repository === 'Android' ? androidRoot : root;
    const absolute = path.join(repositoryRoot, ...file.split('/'));
    const bytes = await fs.readFile(absolute);
    // This manifest pins Git text blobs. Windows core.autocrlf may change only
    // checkout line endings; compare canonical LF without rewriting any files.
    const manifestContent = repository === 'Website' || productionEvidenceFiles.has(file)
      ? Buffer.from(bytes.toString('utf8').replaceAll('\r\n', '\n'), 'utf8')
      : bytes;
    const digest = crypto.createHash('sha256').update(manifestContent).digest('hex');
    const pinnedCommit = repository === 'Website' && preservedPolicyFiles.has(file)
      ? publishedPolicyCommit
      : repository === 'Android' && productionEvidenceFiles.has(file) ? productionSourceCommit : null;
    if (pinnedCommit) {
      const { stdout } = await execFileAsync('git', [
        '-c', `safe.directory=${repositoryRoot.replaceAll('\\', '/')}`,
        'show', `${pinnedCommit}:${file}`
      ], { cwd: repositoryRoot, encoding: 'buffer', maxBuffer: 10 * 1024 * 1024 });
      const publishedDigest = crypto.createHash('sha256').update(stdout).digest('hex');
      if (publishedDigest !== expectedSha) acceptedSupersessions.set(`${repository}:${file}`, {
        historicalSha256: expectedSha, acceptedSha256: publishedDigest
      });
    }
    const titleCopy = Object.entries(standaloneTitles).find(([locale]) =>
      file === locale.toLowerCase() + '/privacy-policy.html')?.[1];
    if (repository === 'Website' && titleCopy) {
      // Authenticate the old policy, then allow only the five standalone initial
      // letters. The complete legal body, date, URLs and other bytes stay pinned.
      const { stdout: original } = await execFileAsync('git', [
        '-c', `safe.directory=${root.replaceAll('\\', '/')}`,
        'show', `${titleBaselineCommit}:${file}`
      ], { cwd: root, encoding: 'buffer' });
      const previous = acceptedSupersessions.get(`Website:${file}`);
      assert.equal(crypto.createHash('sha256').update(original).digest('hex'),
        previous?.acceptedSha256 ?? expectedSha, `original standalone-title policy:${file}`);
      const { before, title } = titleCopy;
      assert.equal(title, before[0].toLocaleUpperCase(locale) + before.slice(1));
      let approved = original.toString('utf8');
      for (const slot of [
        `<title>${before} — Balkan Currency Converter</title>`,
        `<meta name="description" content="${before}">`,
        `<meta property="og:title" content="${before} — Balkan Currency Converter">`,
        `<h1>${before}</h1>`, `<nav aria-label="${before}">`
      ]) {
        assert.equal(approved.split(slot).length - 1, 1, `exact standalone slot:${file}`);
        approved = approved.replace(slot, slot.replace(before, title));
      }
      assert.equal(manifestContent.toString('utf8'), approved, `only standalone titles:${file}`);
      acceptedSupersessions.set(`Website:${file}`, {
        historicalSha256: expectedSha, acceptedSha256: digest
      });
    }
    assertAcceptedManifestDigest({
      repository, file, expectedSha, actualSha: digest,
      acceptedSupersessions, usedSupersessions
    });
    if (sourceOrGenerated.includes('policy page')) policyUrls.push(publicUrl);
    if (sourceOrGenerated === 'localized policy source') androidLocales.push(locale);
    assert.ok(!/(?:index\.html|assets\/|screenshot|marketing)/i.test(file), `unrelated manifest file:${file}`);
  }
  assert.deepEqual([...usedSupersessions].sort(), [...acceptedSupersessions.keys()].sort(),
    'supersession entries must correspond exactly to current manifest mismatches');
  assert.equal(policyUrls.length, 44);
  assert.equal(new Set(policyUrls).size, 44);
  assert.equal(androidLocales.length, 44);
  assert.equal(new Set(androidLocales).size, 44);
  for (const locale of manifest.locales) {
    assert.ok(policyUrls.includes(`https://balkanconverter.com${locale.privacyUrl}`),
      `manifest URL:${locale.webLocale}`);
  }
});
