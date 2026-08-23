export const productionConsentKey = 'balkan-analytics-consent';
export const qaConsentKey = 'balkan-analytics-consent-qa';

export function isAnalyticsQaEnvironment(locationLike) {
  const hostname = String(locationLike?.hostname ?? '').toLowerCase();
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]') {
    return true;
  }

  const parameters = new URLSearchParams(String(locationLike?.search ?? ''));
  return parameters.getAll('analytics_qa').includes('1');
}

export function analyticsConsentStorageKey(qaExcluded) {
  return qaExcluded ? qaConsentKey : productionConsentKey;
}

export function googlePlayLinkLocation(link) {
  if (link.closest('.site-header')) return 'header';
  if (link.closest('.hero-actions')) return 'hero';
  if (link.closest('.cta-section')) return 'download_cta';
  if (link.closest('.site-footer')) return 'footer';
  return 'content';
}

export function readAnalyticsConsent(storage, key) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

export function writeAnalyticsConsent(storage, key, value) {
  try {
    storage.setItem(key, value);
  } catch {
    // The choice still applies to the current page when storage is unavailable.
  }
}

export async function initializeAnalyticsConsent({
  consent,
  qaExcluded,
  enableAnalytics,
  showConsentBanner
}) {
  if (consent === 'granted') {
    if (!qaExcluded) await enableAnalytics();
    return;
  }

  if (consent !== 'denied') showConsentBanner();
}

export async function applyAnalyticsConsentChoice({
  choice,
  qaExcluded,
  storage,
  enableAnalytics,
  disableAnalytics
}) {
  writeAnalyticsConsent(storage, analyticsConsentStorageKey(qaExcluded), choice);

  if (choice === 'granted') {
    if (!qaExcluded) await enableAnalytics();
    return;
  }

  disableAnalytics();
}

export function runWhenDocumentReady(documentLike, callback) {
  if (documentLike.readyState === 'loading') {
    documentLike.addEventListener('DOMContentLoaded', callback, { once: true });
    return;
  }

  callback();
}

export function createAnalyticsInitializationController({
  qaExcluded,
  loadDependencies,
  activate,
  deactivate
}) {
  let dependencies;
  let analyticsHandle;
  let initializationPromise;
  let consentGranted = false;
  let active = false;
  let disposed = false;
  let consentRevision = 0;

  function safelyDeactivate() {
    active = false;
    if (!analyticsHandle) return;

    try {
      deactivate(analyticsHandle);
    } catch {
      // Analytics failure must never break the site or create an unhandled rejection.
    }
  }

  async function enable() {
    if (qaExcluded || disposed) return false;

    if (!consentGranted) {
      consentGranted = true;
      consentRevision += 1;
    }
    const expectedRevision = consentRevision;

    if (active) return true;
    if (initializationPromise) {
      return initializationPromise.then(() => {
        if (qaExcluded || disposed || !consentGranted || active) return active;
        return enable();
      });
    }

    initializationPromise = (async () => {
      try {
        if (!dependencies) dependencies = await loadDependencies();
        if (!dependencies || disposed || !consentGranted || expectedRevision !== consentRevision) return false;

        analyticsHandle = await activate(dependencies, analyticsHandle);
        if (!analyticsHandle) return false;

        if (disposed || !consentGranted || expectedRevision !== consentRevision) {
          safelyDeactivate();
          return false;
        }

        active = true;
        return true;
      } catch {
        active = false;
        return false;
      } finally {
        initializationPromise = undefined;
      }
    })();

    return initializationPromise;
  }

  function disable() {
    if (consentGranted) {
      consentGranted = false;
      consentRevision += 1;
    }
    safelyDeactivate();
  }

  function dispose() {
    disposed = true;
    disable();
  }

  return {
    disable,
    dispose,
    enable,
    isActive: () => active,
    isConsentGranted: () => consentGranted
  };
}

export function createGooglePlayTrackingController({
  documentLike,
  googlePlayUrl,
  qaExcluded,
  isAnalyticsActive,
  logEvent,
  linkLocation
}) {
  let attached = false;

  return {
    attach() {
      if (attached || qaExcluded) return;

      documentLike.querySelectorAll(`a[href*="${googlePlayUrl}"]`).forEach((link) => {
        link.addEventListener('click', () => {
          if (qaExcluded || !isAnalyticsActive()) return;

          logEvent('google_play_click', {
            link_url: link.href,
            link_location: linkLocation(link)
          });
        });
      });

      attached = true;
    }
  };
}
