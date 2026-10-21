import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { appParagraphs, currentPolicyDate, htmlEscape, planPolicyUpdates, renderPolicyArticle,
  sourceStrings, updateInventory, updatePolicyDocument, validatePolicyCopy } from '../tools/sync-current-privacy.mjs';

const root = path.resolve(import.meta.dirname, '..');
const manifest = JSON.parse(await fs.readFile(path.join(root, 'site-locales.json'), 'utf8'));
const readCopy = async locale => JSON.parse(await fs.readFile(path.join(root, 'tools',
  'privacy-1.612', `${locale}.json`), 'utf8'));
const execFileAsync = promisify(execFile);

test('current privacy sources cover all 44 locales with complete translated paragraphs', async () => {
  const files = (await fs.readdir(path.join(root, 'tools', 'privacy-1.612'))).filter(name => name.endsWith('.json'));
  assert.deepEqual(files.sort(), manifest.locales.map(locale => `${locale.webLocale}.json`).sort());
  const english = await readCopy('en');
  // Sentence punctuation differs between languages and is not part of these URLs.
  const urls = copy => [...[...copy.app, ...copy.web].join('\n').matchAll(/https:\/\/[A-Za-z0-9./_-]+/g)]
    .map(match => match[0].replace(/\.+$/, '')).sort();
  for (const locale of manifest.locales) {
    const copy = validatePolicyCopy(await readCopy(locale.webLocale), locale.webLocale);
    assert.equal(copy.date, currentPolicyDate);
    assert.deepEqual(urls(copy), urls(english), `${locale.webLocale}: unchanged provider URLs`);
    for (const [index, paragraph] of [...copy.app, copy.analyticsLink, ...copy.web].entries()) {
      assert.ok(paragraph.length > 30, `${locale.webLocale}:${index}: full paragraph`);
      if (locale.webLocale !== 'en') {
        assert.notEqual(paragraph, [...english.app, english.analyticsLink, ...english.web][index],
          `${locale.webLocale}:${index}: English fallback`);
      }
    }
    const text = [...copy.app, copy.analyticsLink, ...copy.web].join('\n');
    for (const brand of ['TimPixelLab', 'Frankfurter', 'CoinGecko', 'Kraken', 'Google ML Kit',
      'Google Mobile Ads', 'Google Analytics', 'Firebase', 'BALCO Plus', 'Scanner Unlimited',
      'AdMob', 'nstim605@gmail.com', 'HTTPS/TLS']) {
      assert.ok(text.includes(brand), `${locale.webLocale}: ${brand}`);
    }
  }
});

test('current privacy schema rejects missing, partial or unexpected copy', async () => {
  const english = await readCopy('en');
  for (const copy of [null, [], { ...english, app: english.app.slice(0, 7) },
    { ...english, web: english.web.slice(0, 1) }, { ...english, analyticsLink: '' },
    { ...english, date: '2026-10-11' }, { ...english, unexpected: true },
    { ...english, webHeading: '\uFFFD' }]) {
    assert.throws(() => validatePolicyCopy(copy, 'test'));
  }
});

test('policy rendering escapes text and places linked-service disclosure in analytics', async () => {
  const english = await readCopy('en');
  const copy = { ...english, webHeading: '<script>& unsafe' };
  const html = renderPolicyArticle(copy);
  assert.ok(html.includes('&lt;script&gt;&amp; unsafe'));
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes(`<p id="android-analytics">${htmlEscape(appParagraphs(copy)[4])}</p>`));
  assert.equal((html.match(/PRIVACY_1_612_START/g) ?? []).length, 1);
  assert.equal((html.match(/PRIVACY_1_612_END/g) ?? []).length, 1);
});

test('privacy-only generation preserves surrounding HTML and is idempotent', async () => {
  const english = await readCopy('en');
  const before = '<header>KEEP</header>\n<p class="policy-meta">old</p>\n'
    + '<article class="policy-card">old disclosure</article>\n<footer>KEEP</footer>';
  const after = updatePolicyDocument(before, english);
  assert.equal(after, '<header>KEEP</header>\n<p class="policy-meta">2026-10-21</p>\n'
    + renderPolicyArticle(english) + '\n<footer>KEEP</footer>');
  assert.equal(updatePolicyDocument(after, english), after);
  assert.throws(() => updatePolicyDocument('<article class="policy-card">old</article>', english));
  assert.throws(() => updatePolicyDocument(before + '<article class="policy-card">duplicate</article>', english));
});

test('privacy inventory replacement preserves every non-policy field', async () => {
  const english = await readCopy('en');
  const inventory = { source: ['keep'], generatedAt: 'unchanged', home: ['home'],
    privacyPolicy: ['old'], links: ['links'], extra: { keep: true } };
  const next = updateInventory(inventory, renderPolicyArticle(english));
  const { privacyPolicy: _old, ...before } = inventory;
  const { privacyPolicy: _new, ...after } = next;
  assert.deepEqual(after, before);
  assert.deepEqual(next.privacyPolicy, sourceStrings(renderPolicyArticle(english)));
  assert.deepEqual(inventory.privacyPolicy, ['old']);
});

test('all current policy outputs, template and inventory are synchronized', async () => {
  const updates = await planPolicyUpdates();
  assert.deepEqual(updates.map(update => path.relative(root, update.file)), []);
});

test('retired scanner policy command fails safely instead of restoring obsolete claims', async () => {
  await assert.rejects(execFileAsync(process.execPath, ['tools/sync-scanner-unlimited-policy.mjs'],
    { cwd: root }), error => /Legacy Scanner Unlimited policy generator is retired/.test(error.stderr));
});
