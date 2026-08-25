import {
  analyticsConsentStorageKey,
  applyAnalyticsConsentChoice,
  createBasicConsentModeController,
  createAnalyticsInitializationController,
  createGooglePlayTrackingController,
  googlePlayLinkLocation,
  initializeAnalyticsConsent,
  isAnalyticsQaEnvironment,
  readAnalyticsConsent,
  runWhenDocumentReady
} from './analytics-core.mjs';

const analyticsQaEnvironment = isAnalyticsQaEnvironment(window.location);

const firebaseConfig = {
  apiKey: 'AIzaSyCnJTlzhTVyoT3Nokfm9N3i2D-7LiWRwuM',
  authDomain: 'balkan-converter.firebaseapp.com',
  projectId: 'balkan-converter',
  messagingSenderId: '414511958205',
  appId: '1:414511958205:web:f64009d9f80c4ea7e30fd4',
  measurementId: 'G-0ESFSLH97R'
};

const consentKey = analyticsConsentStorageKey(analyticsQaEnvironment);
const googlePlayUrl = 'play.google.com/store/apps/details';
const consentMode = createBasicConsentModeController({
  qaExcluded: analyticsQaEnvironment,
  windowLike: window
});

// Queue a denied default without loading Google or Firebase. QA/local pages do not
// create a dataLayer or queue any consent command.
consentMode.initializeDefault();

let analyticsInstance;
let analyticsSdk;

function storedConsent() {
  return readAnalyticsConsent(localStorage, consentKey);
}

let analyticsRuntime;
const googlePlayTracking = createGooglePlayTrackingController({
  documentLike: document,
  googlePlayUrl,
  qaExcluded: analyticsQaEnvironment,
  isAnalyticsActive: () => analyticsRuntime?.isActive() === true && Boolean(analyticsInstance),
  logEvent: (name, parameters) => analyticsSdk.logEvent(analyticsInstance, name, parameters),
  linkLocation: googlePlayLinkLocation
});

analyticsRuntime = createAnalyticsInitializationController({
  qaExcluded: analyticsQaEnvironment,
  loadDependencies: async () => {
    const [appSdk, loadedAnalyticsSdk] = await Promise.all([
        import('https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/12.16.0/firebase-analytics.js')
    ]);
    if (!(await loadedAnalyticsSdk.isSupported())) return null;
    return { appSdk, loadedAnalyticsSdk };
  },
  activate: ({ appSdk, loadedAnalyticsSdk }, existingInstance) => {
    if (!existingInstance) {
      const app = appSdk.initializeApp(firebaseConfig);
      analyticsSdk = loadedAnalyticsSdk;
      analyticsInstance = analyticsSdk.getAnalytics(app);
    }
    analyticsSdk.setAnalyticsCollectionEnabled(analyticsInstance, true);
    googlePlayTracking.attach();
    return analyticsInstance;
  },
  deactivate: () => {
    analyticsSdk.setAnalyticsCollectionEnabled(analyticsInstance, false);
  }
});

function enableAnalytics() {
  if (analyticsQaEnvironment) return Promise.resolve(false);
  // The granted update is queued before imports/getAnalytics, so Firebase's first
  // automatic measurement cannot race ahead of the explicit consent state.
  consentMode.grantAnalytics();
  return analyticsRuntime.enable();
}

function disableAnalytics() {
  consentMode.denyAnalytics();
  analyticsRuntime.disable();
}

function showConsentBanner() {
  if (document.querySelector('.analytics-consent-banner')) return;

  const banner = document.createElement('section');
  banner.className = 'analytics-consent-banner';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-labelledby', 'analytics-consent-title');
  banner.setAttribute('aria-describedby', 'analytics-consent-description');
  const localizedTemplate = document.querySelector('#analytics-consent-template');
  banner.innerHTML = localizedTemplate ? localizedTemplate.innerHTML : `
    <div class="analytics-consent-copy">
      <strong id="analytics-consent-title">Optional analytics</strong>
      <p id="analytics-consent-description">Help us understand site usage. Firebase Analytics stays off unless you accept. <a href="privacy-policy.html#website-analytics">Learn more</a>.</p>
    </div>
    <div class="analytics-consent-actions">
      <button class="analytics-consent-button analytics-consent-accept" type="button">Accept analytics</button>
      <button class="analytics-consent-button analytics-consent-reject" type="button">Reject analytics</button>
    </div>`;

  banner.querySelector('.analytics-consent-accept').addEventListener('click', () => {
    banner.remove();
    void applyAnalyticsConsentChoice({
      choice: 'granted',
      qaExcluded: analyticsQaEnvironment,
      storage: localStorage,
      enableAnalytics,
      disableAnalytics
    });
  });

  banner.querySelector('.analytics-consent-reject').addEventListener('click', () => {
    banner.remove();
    void applyAnalyticsConsentChoice({
      choice: 'denied',
      qaExcluded: analyticsQaEnvironment,
      storage: localStorage,
      enableAnalytics,
      disableAnalytics
    });
  });

  document.body.append(banner);
}

let bootstrapStarted = false;
function bootstrapAnalytics() {
  if (bootstrapStarted) return;
  bootstrapStarted = true;

  document.querySelectorAll('.analytics-consent-settings').forEach((button) => {
    button.addEventListener('click', showConsentBanner);
  });

  void initializeAnalyticsConsent({
    consent: storedConsent(),
    qaExcluded: analyticsQaEnvironment,
    enableAnalytics,
    showConsentBanner
  });
}

runWhenDocumentReady(document, bootstrapAnalytics);
window.addEventListener('pagehide', () => analyticsRuntime.dispose(), { once: true });
