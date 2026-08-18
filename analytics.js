const firebaseConfig = {
  apiKey: 'AIzaSyCnJTlzhTVyoT3Nokfm9N3i2D-7LiWRwuM',
  authDomain: 'balkan-converter.firebaseapp.com',
  projectId: 'balkan-converter',
  messagingSenderId: '414511958205',
  appId: '1:414511958205:web:f64009d9f80c4ea7e30fd4',
  measurementId: 'G-0ESFSLH97R'
};

const consentKey = 'balkan-analytics-consent';
const googlePlayUrl = 'play.google.com/store/apps/details';
const grantedConsent = {
  analytics_storage: 'granted',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied'
};
const deniedConsent = {
  analytics_storage: 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied'
};

let analyticsInstance;
let analyticsSdk;
let analyticsEnabled = false;
let initializationPromise;
let trackingAttached = false;

function storedConsent() {
  try {
    return localStorage.getItem(consentKey);
  } catch {
    return null;
  }
}

function persistConsent(value) {
  try {
    localStorage.setItem(consentKey, value);
  } catch {
    // The choice applies to this page even when storage is unavailable.
  }
}

function queueConsentMode() {
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }

  gtag('consent', 'default', deniedConsent);
  gtag('consent', 'update', grantedConsent);
}

function linkLocation(link) {
  if (link.closest('.site-header')) return 'header';
  if (link.closest('.hero-actions')) return 'hero';
  if (link.closest('.cta-section')) return 'download_cta';
  if (link.closest('.site-footer')) return 'footer';
  return 'content';
}

function attachGooglePlayTracking() {
  if (trackingAttached) return;

  document.querySelectorAll(`a[href*="${googlePlayUrl}"]`).forEach((link) => {
    link.addEventListener('click', () => {
      if (!analyticsEnabled || !analyticsInstance) return;

      analyticsSdk.logEvent(analyticsInstance, 'google_play_click', {
        link_url: link.href,
        link_location: linkLocation(link)
      });
    });
  });

  trackingAttached = true;
}

async function enableAnalytics() {
  queueConsentMode();

  if (analyticsInstance) {
    analyticsSdk.setConsent(grantedConsent);
    analyticsSdk.setAnalyticsCollectionEnabled(analyticsInstance, true);
    analyticsEnabled = true;
    return;
  }

  if (initializationPromise) return initializationPromise;

  initializationPromise = (async () => {
    try {
      const [appSdk, loadedAnalyticsSdk] = await Promise.all([
        import('https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/12.16.0/firebase-analytics.js')
      ]);

      if (!(await loadedAnalyticsSdk.isSupported())) return;

      const app = appSdk.initializeApp(firebaseConfig);
      analyticsSdk = loadedAnalyticsSdk;
      analyticsInstance = analyticsSdk.getAnalytics(app);
      analyticsSdk.setConsent(grantedConsent);
      analyticsEnabled = true;
      attachGooglePlayTracking();
    } catch {
      analyticsEnabled = false;
    } finally {
      initializationPromise = undefined;
    }
  })();

  return initializationPromise;
}

function disableAnalytics() {
  analyticsEnabled = false;
  if (!analyticsInstance) return;

  analyticsSdk.setConsent(deniedConsent);
  analyticsSdk.setAnalyticsCollectionEnabled(analyticsInstance, false);
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
    persistConsent('granted');
    banner.remove();
    void enableAnalytics();
  });

  banner.querySelector('.analytics-consent-reject').addEventListener('click', () => {
    persistConsent('denied');
    disableAnalytics();
    banner.remove();
  });

  document.body.append(banner);
}

document.querySelectorAll('.analytics-consent-settings').forEach((button) => {
  button.addEventListener('click', showConsentBanner);
});

if (storedConsent() === 'granted') {
  void enableAnalytics();
} else if (storedConsent() !== 'denied') {
  showConsentBanner();
}
