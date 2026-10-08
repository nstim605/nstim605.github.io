import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const androidRoot = path.resolve(process.env.ANDROID_SOURCE_ROOT || path.join(root, '..'));
const manifest = JSON.parse(await fs.readFile(path.join(root, 'site-locales.json'), 'utf8'));
const legacy = JSON.parse(await fs.readFile(path.join(root, 'tools', 'privacy-policy-phase1d.json'), 'utf8'));
const resourceFolders = {
  'es-ES': 'values-es-rES', 'es-419': 'values-b+es+419', 'pt-BR': 'values-pt-rBR',
  'pt-PT': 'values-pt-rPT', 'zh-Hans': 'values-b+zh+Hans', 'zh-Hant': 'values-b+zh+Hant'
};

function folder(locale) {
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

function value(xml, name) {
  const match = xml.match(new RegExp(`<string\\s+name="${name}"[^>]*>([\\s\\S]*?)<\\/string>`));
  assert.ok(match, name);
  return decodeXml(match[1]);
}

function policyFile(locale) {
  return locale.privacyUrl === '/privacy-policy.html'
    ? path.join(root, 'privacy-policy.html')
    : path.join(root, ...locale.privacyUrl.replace(/^\//, '').split('/'));
}

async function expected(locale) {
  const directory = path.join(androidRoot, 'app', 'src', 'main', 'res', folder(locale));
  const strings = await fs.readFile(path.join(directory, 'strings.xml'), 'utf8');
  const rewarded = locale.androidLocale === 'en'
    ? strings
    : await fs.readFile(path.join(directory, 'rewarded_strings.xml'), 'utf8');
  return {
    advertising: value(rewarded, 'privacy_rewarded_scanner_addendum'),
    lastUpdated: value(strings, 'privacy_last_updated')
  };
}

test('all 44 public policies use the Android rewarded-ad disclosure and current date', async () => {
  assert.equal(manifest.locales.length, 44);
  for (const locale of manifest.locales) {
    const [html, copy] = await Promise.all([fs.readFile(policyFile(locale), 'utf8'), expected(locale)]);
    assert.equal((html.match(/id="app-advertising-consent"/g) ?? []).length, 1,
      `${locale.webLocale}: advertising section`);
    assert.ok(html.includes(`<p>${htmlEscape(copy.advertising)}</p>`),
      `${locale.webLocale}: rewarded-ad disclosure`);
    assert.ok(html.includes(`<p class="policy-meta">${htmlEscape(copy.lastUpdated)}</p>`),
      `${locale.webLocale}: policy date`);
    assert.ok(!html.includes(htmlEscape(legacy[locale.webLocale].advertisingSummary)),
      `${locale.webLocale}: obsolete no-rewarded-ad claim`);
  }
});

test('the English policy template uses the same authoritative disclosure', async () => {
  const locale = manifest.locales.find(item => item.androidLocale === 'en');
  const [html, copy] = await Promise.all([
    fs.readFile(path.join(root, 'tools', 'templates', 'privacy-policy.html'), 'utf8'),
    expected(locale)
  ]);
  assert.ok(html.includes(`<p>${htmlEscape(copy.advertising)}</p>`));
  assert.ok(html.includes(`<p class="policy-meta">${htmlEscape(copy.lastUpdated)}</p>`));
  assert.ok(!html.includes('The app uses no interstitial, rewarded or other full-screen ads.'));
});
