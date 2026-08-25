import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

import {
  createAnalyticsInitializationController,
  createBasicConsentModeController,
  deniedWebsiteConsent,
  grantedWebsiteAnalyticsConsent
} from '../analytics-core.mjs';

function commandList(windowLike) {
  return (windowLike.dataLayer ?? []).map((entry) => Array.from(entry));
}

function assertAdvertisingDenied(settings) {
  assert.equal(settings.ad_storage, 'denied');
  assert.equal(settings.ad_user_data, 'denied');
  assert.equal(settings.ad_personalization, 'denied');
}

test('production UNKNOWN starts with all four consent types denied', () => {
  const windowLike = {};
  const consent = createBasicConsentModeController({ qaExcluded: false, windowLike });
  consent.initializeDefault();
  assert.deepEqual(consent.getState(), deniedWebsiteConsent);
  assert.deepEqual(commandList(windowLike), [['consent', 'default', deniedWebsiteConsent]]);
});

test('production Allow grants Analytics only and queues it after the denied default', () => {
  const windowLike = {};
  const consent = createBasicConsentModeController({ qaExcluded: false, windowLike });
  consent.initializeDefault();
  consent.grantAnalytics();
  assert.deepEqual(consent.getState(), grantedWebsiteAnalyticsConsent);
  assertAdvertisingDenied(consent.getState());
  assert.deepEqual(commandList(windowLike), [
    ['consent', 'default', deniedWebsiteConsent],
    ['consent', 'update', grantedWebsiteAnalyticsConsent]
  ]);
});

test('consent is granted before Firebase dependency loading and activation', async () => {
  const order = [];
  const windowLike = { dataLayer: [] };
  const consent = createBasicConsentModeController({ qaExcluded: false, windowLike });
  consent.initializeDefault();
  consent.grantAnalytics();
  order.push(...commandList(windowLike).map((command) => `${command[0]}:${command[1]}:${command[2].analytics_storage}`));
  const runtime = createAnalyticsInitializationController({
    qaExcluded: false,
    loadDependencies: async () => { order.push('firebase:import'); return {}; },
    activate: async () => {
      order.push('firebase:initializeApp');
      assert.equal(consent.getState().analytics_storage, 'granted');
      order.push('firebase:getAnalytics');
      order.push('event:page_view');
      order.push('collection:enable');
      return {};
    },
    deactivate: () => {}
  });
  await runtime.enable();
  assert.deepEqual(order, [
    'consent:default:denied',
    'consent:update:granted',
    'firebase:import',
    'firebase:initializeApp',
    'firebase:getAnalytics',
    'event:page_view',
    'collection:enable'
  ]);
});

test('production Reject keeps all consent denied and never creates an update', () => {
  const windowLike = {};
  const consent = createBasicConsentModeController({ qaExcluded: false, windowLike });
  consent.initializeDefault();
  consent.denyAnalytics();
  assert.deepEqual(consent.getState(), deniedWebsiteConsent);
  assertAdvertisingDenied(consent.getState());
  assert.deepEqual(commandList(windowLike), [['consent', 'default', deniedWebsiteConsent]]);
});

test('GRANTED to DENIED updates immediately and keeps advertising denied', () => {
  const windowLike = {};
  const consent = createBasicConsentModeController({ qaExcluded: false, windowLike });
  consent.initializeDefault();
  consent.grantAnalytics();
  consent.denyAnalytics();
  assert.deepEqual(consent.getState(), deniedWebsiteConsent);
  assertAdvertisingDenied(consent.getState());
  assert.deepEqual(commandList(windowLike).at(-1), ['consent', 'update', deniedWebsiteConsent]);
});

test('DENIED to GRANTED establishes consent before Analytics activation without backfill', async () => {
  const order = [];
  const windowLike = {};
  const consent = createBasicConsentModeController({ qaExcluded: false, windowLike });
  consent.initializeDefault();
  consent.denyAnalytics();
  assert.equal(order.length, 0);
  consent.grantAnalytics();
  order.push(`consent:${consent.getState().analytics_storage}`);
  const runtime = createAnalyticsInitializationController({
    qaExcluded: false,
    loadDependencies: async () => { order.push('firebase:import'); return {}; },
    activate: async () => { order.push('page_view:automatic'); return {}; },
    deactivate: () => {}
  });
  await runtime.enable();
  assert.deepEqual(order, ['consent:granted', 'firebase:import', 'page_view:automatic']);
});

test('repeated initialization, grant and deny do not duplicate consent commands', () => {
  const windowLike = {};
  const consent = createBasicConsentModeController({ qaExcluded: false, windowLike });
  consent.initializeDefault();
  consent.initializeDefault();
  consent.grantAnalytics();
  consent.grantAnalytics();
  consent.denyAnalytics();
  consent.denyAnalytics();
  assert.deepEqual(commandList(windowLike), [
    ['consent', 'default', deniedWebsiteConsent],
    ['consent', 'update', grantedWebsiteAnalyticsConsent],
    ['consent', 'update', deniedWebsiteConsent]
  ]);
});

test('QA/local mode creates no dataLayer and queues no consent commands', () => {
  const windowLike = {};
  const consent = createBasicConsentModeController({ qaExcluded: true, windowLike });
  assert.equal(consent.initializeDefault(), false);
  assert.equal(consent.grantAnalytics(), false);
  assert.equal(consent.denyAnalytics(), false);
  assert.equal(consent.getState(), null);
  assert.equal(Object.hasOwn(windowLike, 'dataLayer'), false);
});

test('all 88 localized pages use exactly one shared Analytics module', async () => {
  const root = path.resolve(import.meta.dirname, '..');
  const manifest = JSON.parse(await fs.readFile(path.join(root, 'site-locales.json'), 'utf8'));
  const urls = manifest.locales.flatMap((locale) => [locale.url, locale.privacyUrl]);
  assert.equal(urls.length, 88);
  for (const url of urls) {
    const pathname = new URL(url, 'https://balkanconverter.com').pathname;
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '').replace(/\/$/, '/index.html');
    const html = await fs.readFile(path.join(root, relative), 'utf8');
    const analyticsScripts = html.match(/<script type="module" src="(?:\.\.\/)?analytics\.js"><\/script>/g) ?? [];
    assert.equal(analyticsScripts.length, 1, relative);
  }
});

test('website Analytics source keeps consent ordering and never grants advertising consent', async () => {
  const root = path.resolve(import.meta.dirname, '..');
  const source = await fs.readFile(path.join(root, 'analytics.js'), 'utf8');
  assert.ok(source.indexOf('consentMode.grantAnalytics();') < source.indexOf('return analyticsRuntime.enable();'));
  assert.ok(source.indexOf('consentMode.initializeDefault();') < source.indexOf("import('https://www.gstatic.com/firebasejs/"));
  assert.doesNotMatch(source, /ad_(?:storage|user_data|personalization)\s*:\s*['"]granted['"]/);
});
