import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { htmlEscape as currentHtmlEscape, renderPolicyArticle } from '../tools/sync-current-privacy.mjs';

const root = path.resolve(import.meta.dirname, '..');
const manifest = JSON.parse(await fs.readFile(path.join(root, 'site-locales.json'), 'utf8'));
const copy = JSON.parse(await fs.readFile(
  path.join(root, 'tools', 'privacy-policy-scanner-unlimited.json'), 'utf8'
));
const execFileAsync = promisify(execFile);
const preScannerDisclosureCommit = '7ae1541e2265162bc2da83ac3a19eaf4cd50eec5';
const currentCopy = async locale => JSON.parse(await fs.readFile(path.join(root, 'tools',
  'privacy-1.612', `${locale.webLocale}.json`), 'utf8'));

function policyPath(locale) {
  return locale.privacyUrl === '/privacy-policy.html'
    ? path.join(root, 'privacy-policy.html')
    : path.join(root, ...locale.privacyUrl.replace(/^\//, '').split('/'));
}

function htmlEscape(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

test('Scanner Unlimited copy covers exactly all 44 production locales', () => {
  assert.equal(manifest.locales.length, 44);
  assert.deepEqual(Object.keys(copy).sort(), manifest.locales.map(locale => locale.webLocale).sort());
});

test('all 44 policies contain current subscription and legacy-restore disclosures and date', async () => {
  for (const locale of manifest.locales) {
    const html = await fs.readFile(policyPath(locale), 'utf8');
    const localized = await currentCopy(locale);
    assert.equal((html.match(/<!-- PRIVACY_1_612_START -->/g) ?? []).length, 1,
      `${locale.webLocale}: start marker`);
    assert.equal((html.match(/<!-- PRIVACY_1_612_END -->/g) ?? []).length, 1,
      `${locale.webLocale}: end marker`);
    assert.equal((html.match(/id="payments-scanner-unlimited"/g) ?? []).length, 1,
      `${locale.webLocale}: section anchor`);
    assert.match(html, /<p class="policy-meta">2026-10-21<\/p>/, `${locale.webLocale}: date`);
    assert.ok(html.includes(`<p id="payments-scanner-unlimited">${currentHtmlEscape(localized.app[5])}</p>`),
      `${locale.webLocale}: localized data handling`);
    assert.ok(html.includes('Scanner Unlimited'), `${locale.webLocale}: legacy product`);
    assert.ok(html.includes('BALCO Plus'), `${locale.webLocale}: current subscription`);
    assert.ok(!html.includes('\uFFFD'), `${locale.webLocale}: valid UTF-8 text`);
  }
  const english = await fs.readFile(path.join(root, 'privacy-policy.html'), 'utf8');
  assert.match(english, /monthly and yearly auto-renewing plans/);
  assert.match(english, /Existing Scanner Unlimited ownership can be restored/);
  assert.match(english, /grants 20 BALCO Points \(BP\) only after the SDK confirms the reward/);
  assert.match(english, /Verified BALCO Plus removes ads/);
  assert.match(english, /Pending acknowledgment tokens are stored privately until processed/);
  assert.match(english, /Clearing app data or uninstalling does not cancel a store subscription/);
  assert.doesNotMatch(english, /10 bonus scans|Purchase data[^<]*does not send it[^<]*Firebase Analytics/);
});

test('legacy payment denial is removed structurally from every policy', async () => {
  for (const locale of manifest.locales) {
    const file = policyPath(locale);
    const html = await fs.readFile(file, 'utf8');
    const relative = path.relative(root, file).replaceAll('\\', '/');
    const { stdout: baseline } = await execFileAsync('git', [
      'show', `${preScannerDisclosureCommit}:${relative}`
    ], {
      cwd: root, encoding: 'utf8'
    });
    const fullPolicy = (baseline.match(/<h2(?:\s|>)/g) ?? []).length > 12;
    if (fullPolicy) {
      const legacy = baseline.match(/<h2(?:\s[^>]*)?>[^<]*<\/h2>\s*<p>([^<]*)<\/p>(?=\s*<h2 id="contact">)/);
      assert.ok(legacy, `${locale.webLocale}: baseline payment block`);
      assert.ok(!html.includes(legacy[1]), `${locale.webLocale}: legacy denial`);
    } else {
      const phaseIndex = baseline.indexOf('<!-- PHASE1D_POLICY_START -->');
      const paragraphs = [...baseline.slice(0, phaseIndex).matchAll(/<p>([^<]*)<\/p>/g)];
      const legacyParagraph = paragraphs.at(-2)?.[1] ?? '';
      if (locale.webLocale === 'th') {
        assert.ok(!html.includes('แอปไม่ประมวลผลการชำระเงิน'), `${locale.webLocale}: legacy denial`);
      } else {
        const match = legacyParagraph.match(/^([\s\S]*[.!?。！？۔।])\s*([^.!?。！？۔।]+[.!?。！？۔।])$/u);
        assert.ok(match, `${locale.webLocale}: baseline payment sentence`);
        assert.ok(!html.includes(match[2]), `${locale.webLocale}: legacy denial`);
      }
    }
  }
});

test('English template and production inventory use the current disclosure', async () => {
  const [template, inventoryText] = await Promise.all([
    fs.readFile(path.join(root, 'tools', 'templates', 'privacy-policy.html'), 'utf8'),
    fs.readFile(path.join(root, 'tools', 'production-strings.json'), 'utf8')
  ]);
  const inventory = JSON.parse(inventoryText);
  const english = await currentCopy({ webLocale: 'en' });
  assert.ok(template.replaceAll('\r\n', '\n').includes(renderPolicyArticle(english)));
  assert.ok(inventory.privacyPolicy.includes(currentHtmlEscape(english.app[5])));
  assert.ok(inventory.privacyPolicy.includes(currentHtmlEscape(english.app[3])));
  assert.ok(!inventoryText.includes('The current version does not process payments'));
});
