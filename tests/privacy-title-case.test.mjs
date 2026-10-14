import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const manifest = JSON.parse(await fs.readFile(path.join(root, 'site-locales.json'), 'utf8'));
const changes = JSON.parse(await fs.readFile(path.join(root, 'tools/privacy-title-copy.json'), 'utf8'));
const read = file => fs.readFile(path.join(root, file), 'utf8').then(s => s.replaceAll('\r\n', '\n'));
const paths = locale => [locale.url.slice(1) + 'index.html', locale.privacyUrl.slice(1)];

function assertInitialCapital(text, locale, context) {
  const initial = text.match(/\p{L}/u)?.[0];
  assert.ok(initial, context);
  // Caseless scripts deliberately pass unchanged, not through transliteration.
  assert.equal(initial, initial.toLocaleUpperCase(locale), context + ': ' + text);
}

test('all 44 locales capitalize standalone privacy titles, links and metadata where case exists', async () => {
  assert.equal(manifest.locales.length, 44);
  for (const locale of manifest.locales) {
    const [home, policy] = await Promise.all(paths(locale).map(read));
    const labels = [
      ...policy.matchAll(/<h1>([^<]+)<\/h1>/g),
      ...policy.matchAll(/<title>([^<]+)<\/title>/g),
      ...policy.matchAll(/<meta (?:name="description"|property="og:title") content="([^"]+)"/g),
      ...home.matchAll(/<a href="privacy-policy.html">([^<]+)<\/a>/g)
    ].map(m => m[1]);
    assert.ok(labels.length >= 6, locale.webLocale + ': title and two links must exist');
    for (const text of labels) assertInitialCapital(text, locale.webLocale, locale.webLocale);
    for (const html of [home, policy]) {
      const footer = html.match(/<footer\b[\s\S]*?<\/footer>/)?.[0];
      assert.ok(footer, locale.webLocale);
      for (const [, label] of footer.matchAll(/<nav aria-label="([^"]+)"/g))
        assertInitialCapital(label, locale.webLocale, locale.webLocale + ': footer semantics');
    }
  }
});

test('seven corrected locales use exact standalone copy in all eight slots', async () => {
  assert.deepEqual(Object.keys(changes).sort(), ['es-419', 'es-ES', 'fr', 'it', 'pt-BR', 'pt-PT', 'ru']);
  assert.equal(changes.ru.title, 'Политика конфиденциальности');
  for (const locale of manifest.locales.filter(l => changes[l.webLocale])) {
    const { before, title } = changes[locale.webLocale];
    assert.equal(title.slice(1), before.slice(1), locale.webLocale + ': wording unchanged');
    const [home, policy] = await Promise.all(paths(locale).map(read));
    assert.equal(home.split(title).length - 1, 4, locale.webLocale + ': home slots');
    assert.equal(policy.split(title).length - 1, 7, locale.webLocale + ': policy slots');
    assert.ok(policy.includes('<h1>' + title + '</h1>'));
    assert.ok(home.includes('<nav aria-label="' + title + '">'));
    assert.ok(policy.includes('<nav aria-label="' + title + '">'));
  }
});

test('all 44 policy HTML files preserve content and metadata outside authorized policy and header updates', async () => {
  for (const locale of manifest.locales) {
    for (const file of [locale.privacyUrl.slice(1)]) {
      const original = execFileSync('git', ['-c', 'safe.directory=' + root.replaceAll('\\', '/'),
        'show', 'HEAD:' + file], { cwd: root, encoding: 'utf8' }).replaceAll('\r\n', '\n');
      const current = await read(file);
      assert.match(current, /src="\/assets\/google-play-badge-en\.png"/, file + ': local badge');
      assert.doesNotMatch(current, /en_badge_web_generic\.png/, file + ': legacy badge');
      const normalizeAuthorizedPolicyUpdate = html => html
        .replace(/<header class="site-header">[\s\S]*?<\/header>/,
          '<header class="site-header">AUTHORIZED_SITE_HEADER<\/header>')
        .replace(/<p class="policy-meta">[\s\S]*?<\/p>/, '<p class="policy-meta">POLICY_DATE<\/p>')
        .replace(/<article class="policy-card">[\s\S]*?<\/article>/,
          '<article class="policy-card">AUTHORIZED_POLICY_BODY<\/article>')
        .replace(/<a href="\/(?:[^"/]+\/)?links\/">[^<]+<\/a>\s*/g, '');
      assert.equal(normalizeAuthorizedPolicyUpdate(current), normalizeAuthorizedPolicyUpdate(original),
        file + ': content, metadata and links outside policy and header updates');
    }
  }
});

test('generator uses explicit standalone copy without case-transforming legal text', async () => {
  const generator = await read('tools/localize-site.mjs');
  assert.ok(generator.includes("'privacy-title-copy.json'"));
  assert.ok(generator.includes('privacyTitleCopy[locale.web]?.title ?? strings.privacy_policy'));
  assert.ok(generator.includes('localMap(strings, copy, privacyTitle, homepageLinkCopy[locale.web], linksCopy[locale.web])'));
  assert.ok(generator.includes("'Privacy': privacyTitle"));
  assert.ok(generator.includes("'Privacy Policy': privacyTitle"));
  assert.doesNotMatch(generator, /to(?:Locale)?UpperCase|text-transform|capitalize/);
  assert.ok(generator.includes('strings.privacy_policy_body.split'));
});
