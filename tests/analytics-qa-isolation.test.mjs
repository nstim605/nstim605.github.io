import test from 'node:test';
import assert from 'node:assert/strict';

import {
  analyticsConsentStorageKey,
  applyAnalyticsConsentChoice,
  createAnalyticsInitializationController,
  createGooglePlayTrackingController,
  googlePlayLinkLocation,
  initializeAnalyticsConsent,
  isAnalyticsQaEnvironment,
  productionConsentKey,
  qaConsentKey,
  readAnalyticsConsent,
  runWhenDocumentReady
} from '../analytics-core.mjs';

class MemoryStorage {
  constructor(entries = {}) {
    this.values = new Map(Object.entries(entries));
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, value);
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

class FakeLink {
  constructor(href, location = 'hero') {
    this.href = href;
    this.location = location;
    this.listeners = [];
    this.navigationCount = 0;
  }

  addEventListener(type, listener) {
    assert.equal(type, 'click');
    this.listeners.push(listener);
  }

  click() {
    const event = {
      defaultPrevented: false,
      preventDefault() {
        this.defaultPrevented = true;
      }
    };
    this.listeners.forEach((listener) => listener(event));
    if (!event.defaultPrevented) this.navigationCount += 1;
  }
}

function locationLike(url) {
  return new URL(url);
}

function trackingHarness({ qaExcluded = false, active = true } = {}) {
  const link = new FakeLink('https://play.google.com/store/apps/details?id=io.github.nstim605.balkanconverter');
  const events = [];
  const documentLike = { querySelectorAll: () => [link] };
  const controller = createGooglePlayTrackingController({
    documentLike,
    googlePlayUrl: 'play.google.com/store/apps/details',
    qaExcluded,
    isAnalyticsActive: () => active,
    logEvent: (name, parameters) => events.push({ name, parameters }),
    linkLocation: (candidate) => candidate.location
  });
  return { controller, events, link };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function initializationHarness({
  qaExcluded = false,
  loadDependencies,
  activate,
  deactivate
} = {}) {
  let loadCalls = 0;
  let activateCalls = 0;
  let deactivateCalls = 0;
  const defaultHandle = {};
  const controller = createAnalyticsInitializationController({
    qaExcluded,
    loadDependencies: async () => {
      loadCalls += 1;
      return loadDependencies ? loadDependencies() : {};
    },
    activate: async (dependencies, existingHandle) => {
      activateCalls += 1;
      return activate ? activate(dependencies, existingHandle) : (existingHandle ?? defaultHandle);
    },
    deactivate: (handle) => {
      deactivateCalls += 1;
      if (deactivate) deactivate(handle);
    }
  });
  return {
    controller,
    counts: () => ({ activateCalls, deactivateCalls, loadCalls })
  };
}

test('localhost is an Analytics QA environment', () => {
  assert.equal(isAnalyticsQaEnvironment(locationLike('http://localhost:8080/')), true);
});

test('127.0.0.1 is an Analytics QA environment', () => {
  assert.equal(isAnalyticsQaEnvironment(locationLike('http://127.0.0.1:8080/')), true);
});

test('production hostname with analytics_qa=1 is QA', () => {
  assert.equal(isAnalyticsQaEnvironment(locationLike('https://balkanconverter.com/?analytics_qa=1')), true);
});

test('analytics_qa=0 is not QA', () => {
  assert.equal(isAnalyticsQaEnvironment(locationLike('https://balkanconverter.com/?analytics_qa=0')), false);
});

test('analytics_qa=true is not QA', () => {
  assert.equal(isAnalyticsQaEnvironment(locationLike('https://balkanconverter.com/?analytics_qa=true')), false);
});

test('similarly named query parameter is not QA', () => {
  assert.equal(isAnalyticsQaEnvironment(locationLike('https://balkanconverter.com/?analytics_qa_test=1')), false);
});

test('QA marker combined with UTM remains QA', () => {
  const location = locationLike('https://balkanconverter.com/?utm_source=accept_test&utm_medium=qa&analytics_qa=1');
  assert.equal(isAnalyticsQaEnvironment(location), true);
  assert.equal(location.searchParams.get('utm_source'), 'accept_test');
  assert.equal(location.searchParams.get('utm_medium'), 'qa');
});

test('normal production URL is not QA', () => {
  assert.equal(isAnalyticsQaEnvironment(locationLike('https://balkanconverter.com/')), false);
});

test('QA mode never invokes the Firebase loader', async () => {
  let loads = 0;
  await initializeAnalyticsConsent({
    consent: 'granted',
    qaExcluded: true,
    enableAnalytics: () => { loads += 1; },
    showConsentBanner: () => {}
  });
  assert.equal(loads, 0);
});

test('QA accept persists only QA consent and never invokes the loader', async () => {
  const storage = new MemoryStorage({ [productionConsentKey]: 'denied' });
  let loads = 0;
  await applyAnalyticsConsentChoice({
    choice: 'granted', qaExcluded: true, storage,
    enableAnalytics: () => { loads += 1; }, disableAnalytics: () => {}
  });
  assert.equal(loads, 0);
  assert.equal(storage.getItem(qaConsentKey), 'granted');
  assert.equal(storage.getItem(productionConsentKey), 'denied');
});

test('QA reject persists only QA consent and never invokes the loader', async () => {
  const storage = new MemoryStorage({ [productionConsentKey]: 'granted' });
  let loads = 0;
  await applyAnalyticsConsentChoice({
    choice: 'denied', qaExcluded: true, storage,
    enableAnalytics: () => { loads += 1; }, disableAnalytics: () => {}
  });
  assert.equal(loads, 0);
  assert.equal(storage.getItem(qaConsentKey), 'denied');
  assert.equal(storage.getItem(productionConsentKey), 'granted');
});

test('QA mode selects a separate key and does not modify production consent storage', () => {
  assert.equal(analyticsConsentStorageKey(true), qaConsentKey);
  assert.equal(analyticsConsentStorageKey(false), productionConsentKey);
});

test('normal production granted consent invokes the loader', async () => {
  let loads = 0;
  await initializeAnalyticsConsent({
    consent: 'granted', qaExcluded: false,
    enableAnalytics: () => { loads += 1; }, showConsentBanner: () => {}
  });
  assert.equal(loads, 1);
});

test('normal production denied consent does not invoke the loader', async () => {
  let loads = 0;
  let banners = 0;
  await initializeAnalyticsConsent({
    consent: 'denied', qaExcluded: false,
    enableAnalytics: () => { loads += 1; }, showConsentBanner: () => { banners += 1; }
  });
  assert.equal(loads, 0);
  assert.equal(banners, 0);
});

test('normal production unknown consent does not load before acceptance', async () => {
  let loads = 0;
  let banners = 0;
  await initializeAnalyticsConsent({
    consent: null, qaExcluded: false,
    enableAnalytics: () => { loads += 1; }, showConsentBanner: () => { banners += 1; }
  });
  assert.equal(loads, 0);
  assert.equal(banners, 1);
});

test('normal granted Google Play click logs exactly once', () => {
  const { controller, events, link } = trackingHarness();
  controller.attach();
  link.click();
  assert.deepEqual(events, [{
    name: 'google_play_click',
    parameters: { link_url: link.href, link_location: 'hero' }
  }]);
});

test('QA Google Play click logs zero times', () => {
  const { controller, events, link } = trackingHarness({ qaExcluded: true });
  controller.attach();
  link.click();
  assert.equal(events.length, 0);
});

test('denied or unknown Google Play click logs zero times', () => {
  const { controller, events, link } = trackingHarness({ active: false });
  controller.attach();
  link.click();
  assert.equal(events.length, 0);
});

test('Google Play click always follows the original link', () => {
  for (const options of [{}, { qaExcluded: true }, { active: false }]) {
    const { controller, link } = trackingHarness(options);
    controller.attach();
    link.click();
    assert.equal(link.navigationCount, 1);
  }
});

test('repeated tracking initialization does not duplicate event handlers', () => {
  const { controller, events, link } = trackingHarness();
  controller.attach();
  controller.attach();
  link.click();
  assert.equal(link.listeners.length, 1);
  assert.equal(events.length, 1);
});

test('non-exact QA values remain normal production traffic', () => {
  for (const suffix of ['analytics_qa=yes', 'analytics_qa=', 'analytics_qa_test=1']) {
    assert.equal(isAnalyticsQaEnvironment(locationLike(`https://balkanconverter.com/?${suffix}`)), false);
  }
});

test('QA exclusion is immutable for the page-load policy', async () => {
  const qaExcludedAtStartup = isAnalyticsQaEnvironment(
    locationLike('https://balkanconverter.com/?analytics_qa=1')
  );
  let loads = 0;
  await initializeAnalyticsConsent({
    consent: 'granted', qaExcluded: qaExcludedAtStartup,
    enableAnalytics: () => { loads += 1; }, showConsentBanner: () => {}
  });
  assert.equal(loads, 0);
});

for (const [name, url] of [
  ['localhost without a port', 'http://localhost/'],
  ['localhost with a port', 'http://localhost:8080/'],
  ['127.0.0.1 without a port', 'http://127.0.0.1/'],
  ['127.0.0.1 with a port', 'http://127.0.0.1:8080/'],
  ['IPv6 loopback', 'http://[::1]/'],
  ['marker after UTM', 'https://balkanconverter.com/?utm_source=test&analytics_qa=1'],
  ['marker before UTM', 'https://balkanconverter.com/?analytics_qa=1&utm_medium=qa'],
  ['second duplicate value is exact', 'https://balkanconverter.com/?analytics_qa=0&analytics_qa=1'],
  ['first duplicate value is exact', 'https://balkanconverter.com/?analytics_qa=1&analytics_qa=0'],
  ['encoded exact value', 'https://balkanconverter.com/?analytics_qa=%31']
]) {
  test(`QA truth table accepts ${name}`, () => {
    assert.equal(isAnalyticsQaEnvironment(locationLike(url)), true);
  });
}

for (const [name, url] of [
  ['production hostname', 'https://balkanconverter.com/'],
  ['www production hostname', 'https://www.balkanconverter.com/'],
  ['localhost subdomain', 'https://localhost.example.com/'],
  ['IPv4-looking subdomain', 'https://127.0.0.1.example.com/'],
  ['zero', 'https://balkanconverter.com/?analytics_qa=0'],
  ['boolean true', 'https://balkanconverter.com/?analytics_qa=true'],
  ['yes', 'https://balkanconverter.com/?analytics_qa=yes'],
  ['empty value', 'https://balkanconverter.com/?analytics_qa='],
  ['leading zero', 'https://balkanconverter.com/?analytics_qa=01'],
  ['decimal value', 'https://balkanconverter.com/?analytics_qa=1.0'],
  ['mixed-case parameter', 'https://balkanconverter.com/?Analytics_qa=1'],
  ['upper-case parameter', 'https://balkanconverter.com/?ANALYTICS_QA=1'],
  ['similarly named parameter', 'https://balkanconverter.com/?analytics_qa_test=1'],
  ['value embedded in another parameter', 'https://balkanconverter.com/?foo=analytics_qa=1'],
  ['fragment marker', 'https://balkanconverter.com/#analytics_qa=1'],
  ['path marker', 'https://balkanconverter.com/analytics_qa=1/']
]) {
  test(`QA truth table rejects ${name}`, () => {
    assert.equal(isAnalyticsQaEnvironment(locationLike(url)), false);
  });
}

test('referrer containing the marker does not activate QA', () => {
  assert.equal(isAnalyticsQaEnvironment({
    hostname: 'balkanconverter.com',
    search: '',
    referrer: 'https://example.com/?analytics_qa=1'
  }), false);
});

test('adding the marker after a normal startup does not retroactively change the decision', () => {
  const location = locationLike('https://balkanconverter.com/');
  const qaExcludedAtStartup = isAnalyticsQaEnvironment(location);
  location.search = '?analytics_qa=1';
  assert.equal(qaExcludedAtStartup, false);
  assert.equal(isAnalyticsQaEnvironment(location), true);
});

test('production and QA consent keys remain isolated for production granted', async () => {
  const storage = new MemoryStorage({ [productionConsentKey]: 'granted' });
  await applyAnalyticsConsentChoice({
    choice: 'denied', qaExcluded: true, storage,
    enableAnalytics: () => assert.fail('QA must not load Analytics'), disableAnalytics: () => {}
  });
  assert.equal(storage.getItem(productionConsentKey), 'granted');
  assert.equal(storage.getItem(qaConsentKey), 'denied');
});

test('production and QA consent keys remain isolated for production denied', async () => {
  const storage = new MemoryStorage({ [productionConsentKey]: 'denied' });
  await applyAnalyticsConsentChoice({
    choice: 'granted', qaExcluded: true, storage,
    enableAnalytics: () => assert.fail('QA must not load Analytics'), disableAnalytics: () => {}
  });
  assert.equal(storage.getItem(productionConsentKey), 'denied');
  assert.equal(storage.getItem(qaConsentKey), 'granted');
});

test('normal production ignores both granted and denied QA state', () => {
  for (const qaChoice of ['granted', 'denied']) {
    const storage = new MemoryStorage({ [qaConsentKey]: qaChoice });
    assert.equal(readAnalyticsConsent(storage, analyticsConsentStorageKey(false)), null);
  }
});

test('both absent consent keys remain independently absent', () => {
  const storage = new MemoryStorage();
  assert.equal(readAnalyticsConsent(storage, analyticsConsentStorageKey(false)), null);
  assert.equal(readAnalyticsConsent(storage, analyticsConsentStorageKey(true)), null);
});

test('clearing QA consent does not clear production consent', () => {
  const storage = new MemoryStorage({ [productionConsentKey]: 'granted', [qaConsentKey]: 'denied' });
  storage.removeItem(qaConsentKey);
  assert.equal(storage.getItem(qaConsentKey), null);
  assert.equal(storage.getItem(productionConsentKey), 'granted');
});

test('QA revocation does not call the Firebase loader', async () => {
  const storage = new MemoryStorage({ [productionConsentKey]: 'granted', [qaConsentKey]: 'granted' });
  let loads = 0;
  await applyAnalyticsConsentChoice({
    choice: 'denied', qaExcluded: true, storage,
    enableAnalytics: () => { loads += 1; }, disableAnalytics: () => {}
  });
  assert.equal(loads, 0);
  assert.equal(storage.getItem(productionConsentKey), 'granted');
});

test('document-ready helper waits when the script executes before DOMContentLoaded', () => {
  let callback;
  let calls = 0;
  const documentLike = {
    readyState: 'loading',
    addEventListener(type, listener, options) {
      assert.equal(type, 'DOMContentLoaded');
      assert.deepEqual(options, { once: true });
      callback = listener;
    }
  };
  runWhenDocumentReady(documentLike, () => { calls += 1; });
  assert.equal(calls, 0);
  callback();
  assert.equal(calls, 1);
});

test('document-ready helper runs immediately after DOMContentLoaded', () => {
  let calls = 0;
  runWhenDocumentReady({ readyState: 'interactive' }, () => { calls += 1; });
  assert.equal(calls, 1);
});

test('QA initialization controller permanently refuses every loader attempt', async () => {
  const harness = initializationHarness({ qaExcluded: true });
  assert.equal(await harness.controller.enable(), false);
  assert.equal(await harness.controller.enable(), false);
  harness.controller.disable();
  assert.deepEqual(harness.counts(), { activateCalls: 0, deactivateCalls: 0, loadCalls: 0 });
});

test('production initialization called twice loads and activates exactly once', async () => {
  const dependency = deferred();
  const harness = initializationHarness({ loadDependencies: () => dependency.promise });
  const first = harness.controller.enable();
  const second = harness.controller.enable();
  assert.equal(harness.counts().loadCalls, 1);
  dependency.resolve({});
  assert.deepEqual(await Promise.all([first, second]), [true, true]);
  assert.deepEqual(harness.counts(), { activateCalls: 1, deactivateCalls: 0, loadCalls: 1 });
});

test('production revocation while dependencies are pending prevents late activation', async () => {
  const dependency = deferred();
  const harness = initializationHarness({ loadDependencies: () => dependency.promise });
  const pending = harness.controller.enable();
  harness.controller.disable();
  dependency.resolve({});
  assert.equal(await pending, false);
  assert.equal(harness.controller.isActive(), false);
  assert.deepEqual(harness.counts(), { activateCalls: 0, deactivateCalls: 0, loadCalls: 1 });
});

test('production regrant while dependencies are pending activates only the final granted state', async () => {
  const dependency = deferred();
  const harness = initializationHarness({ loadDependencies: () => dependency.promise });
  const first = harness.controller.enable();
  harness.controller.disable();
  const regranted = harness.controller.enable();
  dependency.resolve({});
  assert.equal(await first, false);
  assert.equal(await regranted, true);
  assert.equal(harness.controller.isActive(), true);
  assert.deepEqual(harness.counts(), { activateCalls: 1, deactivateCalls: 0, loadCalls: 1 });
});

test('revocation while activation is pending deactivates the late handle', async () => {
  const activation = deferred();
  const harness = initializationHarness({ activate: () => activation.promise });
  const pending = harness.controller.enable();
  await Promise.resolve();
  harness.controller.disable();
  activation.resolve({});
  assert.equal(await pending, false);
  assert.equal(harness.controller.isActive(), false);
  assert.deepEqual(harness.counts(), { activateCalls: 1, deactivateCalls: 1, loadCalls: 1 });
});

test('page disposal during initialization prevents late activation', async () => {
  const dependency = deferred();
  const harness = initializationHarness({ loadDependencies: () => dependency.promise });
  const pending = harness.controller.enable();
  harness.controller.dispose();
  dependency.resolve({});
  assert.equal(await pending, false);
  assert.equal(await harness.controller.enable(), false);
  assert.equal(harness.controller.isActive(), false);
});

test('Firebase dependency rejection resolves safely without unhandled error', async () => {
  const harness = initializationHarness({ loadDependencies: () => Promise.reject(new Error('blocked')) });
  assert.equal(await harness.controller.enable(), false);
  assert.equal(harness.controller.isActive(), false);
  assert.deepEqual(harness.counts(), { activateCalls: 0, deactivateCalls: 0, loadCalls: 1 });
});

test('Firebase activation rejection resolves safely without unhandled error', async () => {
  const harness = initializationHarness({ activate: () => Promise.reject(new Error('getAnalytics failed')) });
  assert.equal(await harness.controller.enable(), false);
  assert.equal(harness.controller.isActive(), false);
  assert.deepEqual(harness.counts(), { activateCalls: 1, deactivateCalls: 0, loadCalls: 1 });
});

test('production disable after activation prevents subsequent click events', async () => {
  const harness = initializationHarness();
  const link = new FakeLink('https://play.google.com/store/apps/details?id=io.github.nstim605.balkanconverter');
  const events = [];
  const tracking = createGooglePlayTrackingController({
    documentLike: { querySelectorAll: () => [link] },
    googlePlayUrl: 'play.google.com/store/apps/details',
    qaExcluded: false,
    isAnalyticsActive: harness.controller.isActive,
    logEvent: (...event) => events.push(event),
    linkLocation: () => 'hero'
  });
  tracking.attach();
  link.click();
  assert.equal(events.length, 0);
  await harness.controller.enable();
  link.click();
  assert.equal(events.length, 1);
  harness.controller.disable();
  link.click();
  assert.equal(events.length, 1);
});

test('a genuine second click produces a genuine second event', () => {
  const { controller, events, link } = trackingHarness();
  controller.attach();
  link.click();
  link.click();
  assert.equal(events.length, 2);
  assert.equal(link.navigationCount, 2);
});

test('all current link_location values are produced by the production helper', () => {
  const expected = new Map([
    ['.site-header', 'header'],
    ['.hero-actions', 'hero'],
    ['.cta-section', 'download_cta'],
    ['.site-footer', 'footer']
  ]);
  for (const [selector, value] of expected) {
    assert.equal(googlePlayLinkLocation({ closest: (candidate) => candidate === selector ? {} : null }), value);
  }
  assert.equal(googlePlayLinkLocation({ closest: () => null }), 'content');
});

test('multiple CTA elements each emit one event with their own location', () => {
  const locations = ['header', 'hero', 'download_cta', 'footer', 'content'];
  const links = locations.map((location) => new FakeLink(`https://play.google.com/store/apps/details?id=app&from=${location}`, location));
  const events = [];
  const controller = createGooglePlayTrackingController({
    documentLike: { querySelectorAll: () => links },
    googlePlayUrl: 'play.google.com/store/apps/details', qaExcluded: false,
    isAnalyticsActive: () => true,
    logEvent: (name, parameters) => events.push({ name, parameters }),
    linkLocation: (link) => link.location
  });
  controller.attach();
  links.forEach((link) => link.click());
  assert.deepEqual(events.map((event) => event.parameters.link_location), locations);
  assert.ok(links.every((link) => link.navigationCount === 1));
});

test('reopening consent and repeated tracking attachment do not duplicate listeners', () => {
  const { controller, events, link } = trackingHarness();
  for (let index = 0; index < 4; index += 1) controller.attach();
  link.click();
  assert.equal(link.listeners.length, 1);
  assert.equal(events.length, 1);
});

test('existing new-tab link behavior is not changed', () => {
  const { controller, link } = trackingHarness();
  link.target = '_blank';
  controller.attach();
  link.click();
  assert.equal(link.target, '_blank');
  assert.equal(link.navigationCount, 1);
});

test('UTM and referrer inputs are not mutated by QA detection', () => {
  const urls = [
    'https://balkanconverter.com/?utm_source=producthunt&utm_medium=referral',
    'https://balkanconverter.com/?utm_source=real_campaign&utm_medium=social&utm_campaign=launch&utm_content=cta&utm_term=currency',
    'https://balkanconverter.com/?utm_source=accept_test&utm_medium=qa',
    'https://balkanconverter.com/?utm_source=accept_test&utm_medium=qa&analytics_qa=1',
    'https://balkanconverter.com/?analytics_qa=1&utm_source=test&utm_medium=automation',
    'https://balkanconverter.com/?analytics_qa=0&utm_source=real_campaign'
  ];
  for (const url of urls) {
    const location = locationLike(url);
    const originalSearch = location.search;
    isAnalyticsQaEnvironment(location);
    assert.equal(location.search, originalSearch);
  }
  const location = { hostname: 'balkanconverter.com', search: '', referrer: 'https://source.example/path' };
  isAnalyticsQaEnvironment(location);
  assert.equal(location.referrer, 'https://source.example/path');
});

test('removing the marker or changing hash after QA startup cannot change the stored decision', () => {
  const location = locationLike('https://balkanconverter.com/?analytics_qa=1');
  const qaExcludedAtStartup = isAnalyticsQaEnvironment(location);
  location.search = '';
  location.hash = '#normal-looking-state';
  assert.equal(qaExcludedAtStartup, true);
  assert.equal(isAnalyticsQaEnvironment(location), false);
});

test('production denied then later granted initializes without historical backfill', async () => {
  const harness = initializationHarness();
  const events = [];
  harness.controller.disable();
  assert.equal(harness.controller.isActive(), false);
  assert.equal(events.length, 0);
  assert.equal(await harness.controller.enable(), true);
  assert.equal(harness.controller.isActive(), true);
  assert.equal(events.length, 0);
  assert.deepEqual(harness.counts(), { activateCalls: 1, deactivateCalls: 0, loadCalls: 1 });
});

test('Google Play clicks after QA Accept still log zero events and navigate', async () => {
  const storage = new MemoryStorage();
  let loads = 0;
  await applyAnalyticsConsentChoice({
    choice: 'granted', qaExcluded: true, storage,
    enableAnalytics: () => { loads += 1; }, disableAnalytics: () => {}
  });
  const { controller, events, link } = trackingHarness({ qaExcluded: true, active: true });
  controller.attach();
  link.click();
  assert.equal(loads, 0);
  assert.equal(events.length, 0);
  assert.equal(link.navigationCount, 1);
});

test('Google Play clicks after QA Reject still log zero events and navigate', async () => {
  const storage = new MemoryStorage();
  let loads = 0;
  await applyAnalyticsConsentChoice({
    choice: 'denied', qaExcluded: true, storage,
    enableAnalytics: () => { loads += 1; }, disableAnalytics: () => {}
  });
  const { controller, events, link } = trackingHarness({ qaExcluded: true, active: true });
  controller.attach();
  link.click();
  assert.equal(loads, 0);
  assert.equal(events.length, 0);
  assert.equal(link.navigationCount, 1);
});
