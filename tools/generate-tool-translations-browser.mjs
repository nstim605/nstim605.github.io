import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.NODE_PATH ?? '', 'playwright'));

const root = path.resolve(import.meta.dirname, '..');
const targets = {
  sr: 'sr', bs: 'bs', hr: 'hr', sq: 'sq', mk: 'mk', bg: 'bg', ro: 'ro', hu: 'hu', pl: 'pl', cs: 'cs', sk: 'sk', sl: 'sl',
  de: 'de', fr: 'fr', it: 'it', 'es-ES': 'es', 'es-419': 'es', 'pt-BR': 'pt', 'pt-PT': 'pt', nl: 'nl', da: 'da', sv: 'sv', nb: 'no', fi: 'fi', is: 'is', el: 'el', tr: 'tr', ru: 'ru', uk: 'uk', ar: 'ar', he: 'he', fa: 'fa', ur: 'ur', hi: 'hi', bn: 'bn', id: 'id', ms: 'ms', th: 'th', vi: 'vi', 'zh-Hans': 'zh', 'zh-Hant': 'zh_HANT', ja: 'ja', ko: 'ko'
};
const protectedPattern = /Balkan Currency Converter|Balkan Converter|Google Play|Firebase Analytics|Frankfurter|DCC|Dynamic Currency Conversion|Android|\{[A-Za-z][A-Za-z0-9]*\}|https?:\/\/\S+/g;
const start = index => `{7${String(index).padStart(5, '0')}}`;
const end = index => `{8${String(index).padStart(5, '0')}}`;

function protect(value) {
  const tokens = [];
  return {
    safe: value.replace(protectedPattern, match => {
      tokens.push(match);
      return `{9${String(tokens.length - 1).padStart(5, '0')}}`;
    }),
    tokens
  };
}

function restore(value, tokens) {
  let output = value;
  tokens.forEach((token, index) => {
    const marker = new RegExp(`\\{\\s*9${String(index).padStart(5, '0')}\\s*\\}`);
    if (!marker.test(output)) throw new Error(`lost protected token ${index}`);
    output = output.replace(marker, token);
  });
  return output;
}

function chunks(values, limit = Number(process.env.CHUNK_LIMIT || 4500)) {
  const output = [];
  let current = [];
  let length = 0;
  for (const value of values) {
    const cost = value.length + 48;
    if (current.length && length + cost > limit) {
      output.push(current); current = []; length = 0;
    }
    current.push(value); length += cost;
  }
  if (current.length) output.push(current);
  return output;
}

const pageState = new WeakMap();

async function translateText(page, text, target) {
  if (process.env.TRANSLATION_BACKEND === 'lingva') {
    const host = process.env.LINGVA_HOST || 'https://lingva.lunar.icu';
    const url = `${host}/api/v1/en/${encodeURIComponent(target)}/${encodeURIComponent(text)}`;
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    if (!response?.ok()) throw new Error(`Lingva returned HTTP ${response?.status() ?? 'unknown'} for ${target}`);
    const payload = JSON.parse(await page.locator('body').innerText());
    if (!payload.translation) throw new Error(`Lingva returned no translation for ${target}`);
    return payload.translation.trim();
  }
  let state = pageState.get(page);
  if (!state || state.target !== target) {
    const url = `https://translate.google.com/?sl=en&tl=${encodeURIComponent(target)}&text=Ready&op=translate`;
    let ready = false;
    for (let attempt = 0; attempt < 3 && !ready; attempt += 1) {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      try {
        await page.locator('.ryNqvb').first().waitFor({ state: 'visible', timeout: 20000 });
        ready = true;
      } catch {
        if (attempt === 2) throw new Error(`Translation UI did not initialize for ${target}`);
      }
    }
    state = { target, output: (await page.locator('.ryNqvb').allTextContents()).join('') };
    pageState.set(page, state);
  }
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const previous = state.output;
      await page.locator('textarea').first().fill(text);
      await page.waitForFunction(oldValue => {
        const value = [...document.querySelectorAll('.ryNqvb')].map(node => node.textContent ?? '').join('').trim();
        return Boolean(value && value !== oldValue);
      }, previous, { timeout: 10000 });
      const parts = await page.locator('.ryNqvb').allTextContents();
      const value = parts.join('').trim();
      if (value) {
        state.output = value;
        return value;
      }
    } catch (error) {
      if (attempt === 2) throw error;
      await page.locator('textarea').first().fill('Reset');
      await page.waitForTimeout(500);
    }
  }
  throw new Error(`No translation returned for ${target}`);
}

async function translateIndependent(page, source, target) {
  const parts = source.split(protectedPattern);
  const tokens = source.match(protectedPattern) ?? [];
  const output = [];
  for (let index = 0; index < parts.length; index += 1) {
    if (parts[index]) output.push(/[\p{L}]/u.test(parts[index]) ? await translateText(page, parts[index], target) : parts[index]);
    if (tokens[index]) output.push(tokens[index]);
  }
  return output.join('').trim();
}

async function translateChunk(page, values, target) {
  const protectedValues = values.map(protect);
  const payload = protectedValues.map(({ safe }, index) => `${start(index)}\n${safe}\n${end(index)}`).join('\n');
  const translated = await translateText(page, payload, target);
  if (process.env.DEBUG_TRANSLATION) {
    const markers = values.map((_, index) => ({
      index,
      start: translated.includes(start(index)),
      end: translated.includes(end(index))
    }));
    console.log(JSON.stringify({ target, translated: translated.slice(0, 1200), markers }, null, 2));
    throw new Error('debug translation capture complete');
  }
  const output = {};
  for (let index = 0; index < values.length; index += 1) {
    const pattern = new RegExp(`\\{\\s*7${String(index).padStart(5, '0')}\\s*\\}\\s*(.*?)\\s*\\{\\s*8${String(index).padStart(5, '0')}\\s*\\}`, 's');
    const match = translated.match(pattern);
    try {
      output[values[index]] = match ? restore(match[1].trim(), protectedValues[index].tokens) : await translateIndependent(page, values[index], target);
    } catch {
      output[values[index]] = await translateIndependent(page, values[index], target);
    }
  }
  return output;
}

const sourcePayload = JSON.parse(await fs.readFile(path.join(root, 'tools', 'tool-localization-source.json'), 'utf8'));
if (process.env.MAX_STRINGS) sourcePayload.strings = sourcePayload.strings.slice(0, Number(process.env.MAX_STRINGS));
const outputPath = process.env.OUTPUT_PATH || path.join(root, 'tools', 'tool-copy.json');
let output;
try { output = JSON.parse(await fs.readFile(outputPath, 'utf8')); } catch { output = { source: 'tools/tool-localization-source.json', locales: {} }; }
output.locales.en = Object.fromEntries(sourcePayload.strings.map(value => [value, value]));

const selectedTargets = process.env.TARGET_LOCALE
  ? Object.entries(targets).filter(([locale]) => locale === process.env.TARGET_LOCALE)
  : Object.entries(targets);
const pending = selectedTargets.filter(([locale]) => Object.keys(output.locales[locale] ?? {}).length !== sourcePayload.strings.length)
  .slice(0, process.env.MAX_LOCALES ? Number(process.env.MAX_LOCALES) : undefined);
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.BROWSER_EXECUTABLE || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
});
const context = await browser.newContext({ ignoreHTTPSErrors: false, locale: 'en-US' });
const pages = await Promise.all(Array.from({ length: Number(process.env.WORKERS || 4) }, () => context.newPage()));

async function worker(page, queue) {
  while (queue.length) {
    const [locale, target] = queue.shift();
    try {
      const translated = {};
      for (const group of chunks(sourcePayload.strings)) Object.assign(translated, await translateChunk(page, group, target));
      output.locales[locale] = translated;
      output.generatedAt = new Date().toISOString();
      await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
      console.log(`translated ${locale}: ${Object.keys(translated).length} strings`);
    } catch (error) {
      failures.push(`${locale}: ${error.message}`);
      console.error(`failed ${locale}: ${error.message}`);
    }
  }
}

const failures = [];
try {
  await Promise.all(pages.map(page => worker(page, pending)));
} finally {
  await browser.close();
}
if (failures.length) throw new Error(`Incomplete locales: ${failures.join(' | ')}`);
