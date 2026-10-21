import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { currentPolicyDate, validatePolicyCopy } from '../tools/sync-current-privacy.mjs';

const root = path.resolve(import.meta.dirname, '..');
const manifest = JSON.parse(await fs.readFile(path.join(root, 'site-locales.json'), 'utf8'));
const legacy = JSON.parse(await fs.readFile(path.join(root, 'tools', 'privacy-policy-phase1d.json'), 'utf8'));

function htmlEscape(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function policyFile(locale) {
  return locale.privacyUrl === '/privacy-policy.html'
    ? path.join(root, 'privacy-policy.html')
    : path.join(root, ...locale.privacyUrl.replace(/^\//, '').split('/'));
}

async function expected(locale) {
  // Cross-checking the Android body is covered by privacy-policy-phase1d.test.mjs.
  // This website-only suite uses the same complete current policy source.
  const copy = validatePolicyCopy(JSON.parse(await fs.readFile(path.join(root, 'tools',
    'privacy-1.612', `${locale.webLocale}.json`), 'utf8')), locale.webLocale);
  return { advertising: copy.app[3], lastUpdated: copy.date };
}

test('all 44 public policies use the current localized rewarded-ad disclosure and date', async () => {
  assert.equal(manifest.locales.length, 44);
  for (const locale of manifest.locales) {
    const [html, copy] = await Promise.all([fs.readFile(policyFile(locale), 'utf8'), expected(locale)]);
    assert.equal((html.match(/id="app-advertising-consent"/g) ?? []).length, 1,
      `${locale.webLocale}: advertising section`);
    assert.ok(html.includes(`<p id="app-advertising-consent">${htmlEscape(copy.advertising)}</p>`),
      `${locale.webLocale}: rewarded-ad disclosure`);
    assert.ok(html.includes(`<p class="policy-meta">${currentPolicyDate}</p>`),
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
  assert.ok(html.includes(`<p id="app-advertising-consent">${htmlEscape(copy.advertising)}</p>`));
  assert.ok(html.includes(`<p class="policy-meta">${currentPolicyDate}</p>`));
  assert.ok(!html.includes('The app uses no interstitial, rewarded or other full-screen ads.'));
});
