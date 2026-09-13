export const adsenseClient = 'ca-pub-9378317401548512';
export const adsensePublisher = 'pub-9378317401548512';
export const adsenseScriptUrl = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`;

const disclosure = `      <!-- ADSENSE_DISCLOSURE_START -->
      <section lang="en" aria-labelledby="website-advertising">
        <h2 id="website-advertising">Website advertising (Google AdSense)</h2>
        <p>balkanconverter.com uses Google AdSense to display advertising. Google and its advertising partners may process technical request information, consent signals, ad interactions, approximate location derived from an IP address, and cookies or similar browser storage where permitted.</p>
        <p>For visitors in the EEA, the United Kingdom, and Switzerland, Google's certified consent platform presents advertising choices. Depending on the visitor's region and choices, Google may show personalized or non-personalized ads. A visitor can refuse consent or manage individual purposes without losing access to the calculators or other site content.</p>
        <p>Advertising consent is separate from the optional Firebase Analytics choice described below. Learn more in the <a href="https://policies.google.com/privacy">Google Privacy Policy</a> and <a href="https://policies.google.com/technologies/ads">Google advertising policies</a>.</p>
      </section>
      <!-- ADSENSE_DISCLOSURE_END -->`;

function ensureSingleAdSenseScript(html) {
  const matches = html.match(/<script\b[^>]*\bsrc="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=[^"]+"[^>]*><\/script>/g) ?? [];
  if (matches.length > 1) throw new Error(`Expected at most one AdSense script, found ${matches.length}`);
  if (matches.length === 1) {
    if (!matches[0].includes(`client=${adsenseClient}`)) throw new Error('Existing AdSense script uses a different client');
    return html;
  }

  const tag = `  <script async src="${adsenseScriptUrl}" crossorigin="anonymous"></script>`;
  if (!html.includes('</head>')) throw new Error('Cannot add AdSense script: missing </head>');
  return html.replace('</head>', `${tag}\n</head>`);
}

function protectMainContent(html) {
  const matches = [...html.matchAll(/<main\b[^>]*>/g)];
  if (matches.length !== 1) throw new Error(`Expected exactly one main content container, found ${matches.length}`);
  const main = matches[0][0];
  if (/\bgoogle-side-rail-overlap="false"/.test(main)) return html;
  return html.replace(main, main.replace('<main', '<main google-side-rail-overlap="false"'));
}

function ensurePrivacyDisclosure(html) {
  const existing = /[ \t]*<!-- ADSENSE_DISCLOSURE_START -->[\s\S]*?<!-- ADSENSE_DISCLOSURE_END -->\s*<h2 id="website-analytics">/;
  if (existing.test(html)) {
    return html.replace(existing, `${disclosure}\n\n      <h2 id="website-analytics">`);
  }
  if (!html.includes('<h2 id="website-analytics">')) {
    throw new Error('Cannot add website advertising disclosure: missing website analytics anchor');
  }
  return html.replace('      <h2 id="website-analytics">', `${disclosure}\n\n      <h2 id="website-analytics">`);
}

export function applyAdSenseIntegration(html, { privacyPolicy = false } = {}) {
  let output = ensureSingleAdSenseScript(html);
  output = protectMainContent(output);
  if (privacyPolicy) output = ensurePrivacyDisclosure(output);
  return output;
}

export function removeAdSenseIntegration(html) {
  const tag = `  <script async src="${adsenseScriptUrl}" crossorigin="anonymous"></script>\n`;
  return html
    .replace(tag, '')
    .replace(' google-side-rail-overlap="false"', '')
    .replace(/\n{1,2}      <!-- ADSENSE_DISCLOSURE_START -->[\s\S]*?<!-- ADSENSE_DISCLOSURE_END -->\n\n/, '\n\n');
}
