import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {
  adsenseClient,
  adsensePublisher,
  adsenseScriptUrl,
  applyAdSenseIntegration
} from '../tools/adsense-integration.mjs';

const root = path.resolve(import.meta.dirname, '..');

function fileForUrl(url) {
  const pathname = new URL(url, 'https://balkanconverter.com').pathname;
  return pathname === '/'
    ? path.join(root, 'index.html')
    : path.join(root, pathname.replace(/^\//, '').replace(/\/$/, '/index.html'));
}

test('all 440 sitemap pages have one correct AdSense script and protected main content', async () => {
  const manifest = JSON.parse(await fs.readFile(path.join(root, 'site-locales.json'), 'utf8'));
  const urls = manifest.locales.flatMap(locale => [locale.url, locale.privacyUrl, ...Object.values(locale.toolUrls)]);
  assert.equal(urls.length, 440);

  for (const url of urls) {
    const file = fileForUrl(url);
    const relative = path.relative(root, file);
    const html = await fs.readFile(file, 'utf8');
    const scripts = html.match(/<script\b[^>]*\bsrc="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=[^"]+"[^>]*><\/script>/g) ?? [];
    assert.equal(scripts.length, 1, relative);
    assert.ok(scripts[0].includes(`src="${adsenseScriptUrl}"`), relative);
    assert.match(scripts[0], /\basync\b/);
    assert.match(scripts[0], /crossorigin="anonymous"/);

    const mains = html.match(/<main\b[^>]*>/g) ?? [];
    assert.equal(mains.length, 1, relative);
    assert.match(mains[0], /google-side-rail-overlap="false"/, relative);
  }
});

test('all localized privacy pages contain one shared AdSense disclosure', async () => {
  const manifest = JSON.parse(await fs.readFile(path.join(root, 'site-locales.json'), 'utf8'));
  for (const locale of manifest.locales) {
    const html = await fs.readFile(fileForUrl(locale.privacyUrl), 'utf8');
    assert.equal((html.match(/ADSENSE_DISCLOSURE_START/g) ?? []).length, 1, locale.webLocale);
    assert.equal((html.match(/id="website-advertising"/g) ?? []).length, 1, locale.webLocale);
    assert.match(html, /Google AdSense/);
    assert.match(html, /personalized or non-personalized ads/);
  }
});

test('ads.txt is distinct from app-ads.txt and uses the verified publisher account', async () => {
  const expected = `google.com, ${adsensePublisher}, DIRECT, f08c47fec0942fa0`;
  assert.equal((await fs.readFile(path.join(root, 'ads.txt'), 'utf8')).trim(), expected);
  assert.equal((await fs.readFile(path.join(root, 'app-ads.txt'), 'utf8')).trim(), expected);
  assert.notEqual(path.join(root, 'ads.txt'), path.join(root, 'app-ads.txt'));
});

test('integration is idempotent and rejects a conflicting publisher client', () => {
  const fixture = '<!doctype html><html><head></head><body><main id="main"></main></body></html>';
  const once = applyAdSenseIntegration(fixture);
  assert.equal(applyAdSenseIntegration(once), once);
  assert.throws(
    () => applyAdSenseIntegration(once.replace(adsenseClient, 'ca-pub-0000000000000000')),
    /different client/
  );
});

test('custom Analytics prompt defers to Google CMP without removing manual settings', async () => {
  const source = await fs.readFile(path.join(root, 'analytics.js'), 'utf8');
  assert.match(source, /advertisingCmpPresent/);
  assert.match(source, /automaticPromptAllowed: !advertisingCmpPresent/);
  assert.match(source, /querySelectorAll\('\.analytics-consent-settings'\)/);
  assert.doesNotMatch(source, /googlefc\.showRevocationMessage/);
});
