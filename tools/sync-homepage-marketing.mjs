import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const fields = ['heroTitle', 'heroDescription', 'accessNote', 'accessLink', 'featureSummary',
  'scannerDescription', 'travelDescription', 'storeScope', 'shoppingTitle', 'shoppingSubtitle',
  'cartTitle', 'cartParagraphs', 'accessTitle', 'accessSummary', 'detailsTitle', 'details'];
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[c]);

export function validateCopy(catalog, locales) {
  const expected = locales.map(locale => locale.webLocale).sort();
  if (JSON.stringify(Object.keys(catalog).sort()) !== JSON.stringify(expected)) {
    throw new Error('Homepage marketing copy must cover exactly the complete site locale inventory');
  }
  for (const locale of expected) {
    const copy = catalog[locale];
    if (JSON.stringify(Object.keys(copy).sort()) !== JSON.stringify([...fields].sort())) {
      throw new Error(`${locale}: incomplete or unexpected copy fields`);
    }
    const strings = fields.filter(key => !['cartParagraphs', 'details'].includes(key));
    if (strings.some(key => typeof copy[key] !== 'string' || !copy[key].trim())) {
      throw new Error(`${locale}: empty translated field`);
    }
    if (!Array.isArray(copy.cartParagraphs) || copy.cartParagraphs.length !== 2 ||
        copy.cartParagraphs.some(value => typeof value !== 'string' || !value.trim()) ||
        !Array.isArray(copy.details) || copy.details.length !== 4 ||
        copy.details.some(value => !value.label?.trim() || !value.text?.trim())) {
      throw new Error(`${locale}: incomplete cart or access details`);
    }
    const mentionsGooglePlay = value => /Google[ -]Play/.test(value);
    if (!mentionsGooglePlay(copy.storeScope) || !mentionsGooglePlay(copy.accessSummary) ||
        !mentionsGooglePlay(copy.details[3].text)) {
      throw new Error(`${locale}: missing Google Play scope or subscription management`);
    }
    const requiredNumbers = [['5', '2'], ['10', '24', '5', '1'], ['20', '1', '60']];
    requiredNumbers.forEach((numbers, index) => {
      const actual = copy.details[index].text.match(/\d+/g) ?? [];
      // Word order varies by language; e.g. Japanese also writes "1 day" and "1 scan".
      if (numbers.some(number => !actual.includes(number)) ||
          actual.some(number => !numbers.includes(number) && number !== '1')) {
        throw new Error(`${locale}: changed allowance or BP amounts in detail ${index}`);
      }
      const costs = index === 0 ? ['2'] : index === 1 ? ['1'] : ['20', '1', '60'];
      if (costs.some(cost => !new RegExp(`\\b${cost}\\s*BP\\b`).test(copy.details[index].text))) {
        throw new Error(`${locale}: missing verified BP cost or reward in detail ${index}`);
      }
    });
    for (const key of ['heroTitle', 'heroDescription', 'cartTitle', 'accessSummary']) {
      if (locale !== 'en' && copy[key] === catalog.en[key]) {
        throw new Error(`${locale}: untranslated ${key}`);
      }
    }
  }
}

function replaceOnce(html, pattern, replacement, label) {
  const matches = [...html.matchAll(new RegExp(pattern.source, 'g'))];
  if (matches.length !== 1) throw new Error(`${label}: expected one target, found ${matches.length}`);
  return html.replace(pattern, replacement);
}

export function updateHomepageMarketing(html, copy, locale) {
  const eol = html.includes('\r\n') ? '\r\n' : '\n';
  const text = value => {
    const escaped = escapeHtml(value);
    return locale.dir === 'rtl'
      ? escaped.replace(/Google Play|BALCO Points|BALCO Plus|(?:\d+\s+)?\bBP\b/g, match => `<bdi dir="ltr">${match}</bdi>`)
      : escaped;
  };
  let result = replaceOnce(html, /<h1 id="hero-title">[\s\S]*?<\/h1>/,
    () => `<h1 id="hero-title">${text(copy.heroTitle)}</h1>`, 'hero title');
  result = replaceOnce(result, /<p class="hero-lede">[\s\S]*?<\/p>/,
    () => `<p class="hero-lede">${text(copy.heroDescription)}</p>`, 'hero description');
  result = result.replace(/\r?\n[ \t]*<p class="access-note">[\s\S]*?<\/p>/, '');
  result = replaceOnce(result, /(<ul class="quick-points"[\s\S]*?<\/ul>)/,
    (_, list) => `${list}${eol}        <p class="access-note">${text(copy.accessNote)} <a class="text-link" href="#google-play-access">${text(copy.accessLink)}</a>.</p>`, 'access note');
  result = replaceOnce(result, /<section class="section shell" id="features"[\s\S]*?<\/section>/,
    section => {
      let updated = replaceOnce(section, /(<div class="section-heading">[\s\S]*?<\/div>\s*)<p>[\s\S]*?<\/p>/,
        (_, heading) => `${heading}<p>${text(copy.featureSummary)}</p>`, 'feature summary');
      for (const [icon, description] of [['scanner', copy.scannerDescription], ['travel', copy.travelDescription]]) {
        updated = replaceOnce(updated, new RegExp(`(<article class="feature-card">\\s*<span class="feature-mark" data-feature-icon="${icon}"[\\s\\S]*?<h3>[\\s\\S]*?<\\/h3>\\s*)<p>[\\s\\S]*?<\\/p>`),
          (_, card) => `${card}<p>${text(description)}</p>`, `${icon} description`);
      }
      return updated;
    }, 'features section');
  const section = [
    '    <section class="section shell shopping-section" id="shopping" aria-labelledby="shopping-title">',
    '      <div class="section-heading">',
    '        <div>',
    `          <p class="eyebrow">${text(copy.storeScope)}</p>`,
    `          <h2 id="shopping-title">${text(copy.shoppingTitle)}</h2>`,
    '        </div>',
    `        <p>${text(copy.shoppingSubtitle)}</p>`,
    '      </div>',
    '      <div class="shopping-grid">',
    '        <article class="shopping-card" aria-labelledby="cart-title">',
    `          <h3 id="cart-title">${text(copy.cartTitle)}</h3>`,
    ...copy.cartParagraphs.map(value => `          <p>${text(value)}</p>`),
    '        </article>',
    '        <article class="shopping-card" id="google-play-access" aria-labelledby="access-title">',
    `          <h3 id="access-title">${text(copy.accessTitle)}</h3>`,
    `          <p>${text(copy.accessSummary)}</p>`,
    '          <details class="access-details">',
    `            <summary>${text(copy.detailsTitle)}</summary>`,
    ...copy.details.map(detail => `            <p><strong>${text(detail.label)}:</strong> ${text(detail.text)}</p>`),
    '          </details>',
    '        </article>',
    '      </div>',
    '    </section>',
    ''
  ].join(eol);
  result = result.replace(/[ \t]*<section class="section shell shopping-section"[\s\S]*?<\/section>\r?\n\r?\n/, '');
  result = replaceOnce(result, /    <section class="section screenshots-section"/,
    () => `${section}${eol}    <section class="section screenshots-section"`, 'shopping section');
  result = replaceOnce(result, /(<link rel="stylesheet" href="(?:\.\.\/)?styles\.css)\?[^"\s]+/,
    (_, stylesheet) => `${stylesheet}?v=20261107-locales`, 'stylesheet');
  return result;
}

export async function syncHomepages({ check = false } = {}) {
  const { locales } = JSON.parse(await fs.readFile(path.join(root, 'site-locales.json'), 'utf8'));
  const catalog = JSON.parse(await fs.readFile(path.join(root, 'tools/homepage-marketing-copy.json'), 'utf8'));
  validateCopy(catalog, locales);
  const updates = [];
  for (const locale of locales) {
    const file = path.join(root, locale.url === '/' ? 'index.html' : `${locale.url.slice(1)}index.html`);
    const before = await fs.readFile(file, 'utf8');
    const after = updateHomepageMarketing(before, catalog[locale.webLocale], locale);
    if (before !== after) updates.push({ file, after });
  }
  if (check && updates.length) throw new Error(`${updates.length}/${locales.length} homepages are missing the current complete marketing copy`);
  if (!check) for (const { file, after } of updates) await fs.writeFile(file, after, 'utf8');
  console.log(`${locales.length}/${locales.length} locales validated; ${check ? 'all generated pages current' : `${updates.length} homepages updated`}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await syncHomepages({ check: process.argv.includes('--check') });
}
