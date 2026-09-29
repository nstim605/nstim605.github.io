import crypto from 'node:crypto';

export const SUPPORTED_NEWS_LOCALES = Object.freeze(['en', 'sr', 'ru']);
export const NEWS_STATUSES = Object.freeze(['pending', 'published', 'rejected', 'duplicate']);
export const NEWS_CATEGORIES = Object.freeze([
  'Currency',
  'Central Banks',
  'Inflation',
  'Interest Rates',
  'Economy',
  'Forex',
  'Commodities'
]);

const cyrillicMap = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ђ: 'dj', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'i', ј: 'j', к: 'k', л: 'l', љ: 'lj', м: 'm', н: 'n', њ: 'nj', о: 'o',
  п: 'p', р: 'r', с: 's', т: 't', ћ: 'c', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch',
  џ: 'dz', ш: 'sh', щ: 'shch', ы: 'y', э: 'e', ю: 'yu', я: 'ya', ъ: '', ь: ''
};

const currencyRules = [
  ['EUR', /\b(?:EUR|euro|euros|eurozone|euro area|European Central Bank|ECB|Evropska centralna banka)\b|(?:ЕЦБ|евро)/iu],
  ['USD', /\b(?:USD|US dollar|U\.S\. dollar|dollars?|Federal Reserve|FOMC|Fed)\b|(?:американск(?:ий|ого|ом) доллар|доллар(?:ы|ов|ах)?|америчк(?:и|ог|ом) долар)/iu],
  ['RSD', /\b(?:RSD|Serbian dinar|dinars?|Narodna banka Srbije|National Bank of Serbia|NBS)\b|(?:Народна банка Србије|НБС|српск(?:и|ог|ом) динар|динар(?:ы|ов|ах)?)/iu],
  ['GBP', /\b(?:GBP|pound sterling|British pound|Bank of England|BoE)\b/iu],
  ['CHF', /\b(?:CHF|Swiss franc|Swiss National Bank|SNB)\b/iu],
  ['JPY', /\b(?:JPY|Japanese yen|Bank of Japan|BoJ)\b/iu],
  ['CAD', /\b(?:CAD|Canadian dollar|Bank of Canada|BoC)\b/iu],
  ['AUD', /\b(?:AUD|Australian dollar|Reserve Bank of Australia|RBA)\b/iu],
  ['CNY', /\b(?:CNY|renminbi|Chinese yuan|People'?s Bank of China|PBOC)\b/iu]
];

const categoryRules = [
  ['Interest Rates', /\b(?:interest rates?|policy rates?|reference rates?|basis points?|kamatn\w* stop\w*|referentn\w* stop\w*)\b|(?:процентн\w* ставк\w*|ключев\w* ставк\w*)/iu],
  ['Inflation', /\b(?:inflation|consumer prices?|CPI|inflacij\w*|инфляц\w*)\b/iu],
  ['Central Banks', /\b(?:central bank|Federal Reserve|FOMC|ECB|NBS|Bank of England|Bank of Japan)\b/iu],
  ['Commodities', /\b(?:oil|gold|gas|commodity|commodities)\b/iu],
  ['Forex', /\b(?:foreign exchange|forex|FX market)\b/iu],
  ['Economy', /\b(?:economy|economic growth|GDP|employment|unemployment|privred\w*|экономик\w*)\b/iu]
];

const stopWords = new Set([
  'a', 'an', 'and', 'at', 'by', 'for', 'from', 'in', 'its', 'of', 'on', 'the', 'to', 'with',
  'press', 'release', 'statement', 'announces', 'issues', 'update', 'updated'
]);

export function normalizeWhitespace(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

export function stripMarkup(value = '') {
  return normalizeWhitespace(String(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'"));
}

export function slugify(value) {
  const transliterated = [...normalizeWhitespace(value).toLowerCase()]
    .map(character => cyrillicMap[character] ?? character)
    .join('');
  return transliterated
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
}

export function detectCurrencies(...values) {
  const text = values.flat().filter(Boolean).join(' ');
  return currencyRules.filter(([, pattern]) => pattern.test(text)).map(([code]) => code);
}

export function detectCategory(...values) {
  const text = values.flat().filter(Boolean).join(' ');
  return categoryRules.find(([, pattern]) => pattern.test(text))?.[0] ?? 'Currency';
}

function titleTokens(value) {
  return new Set(normalizeWhitespace(value).toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(' ')
    .filter(token => token.length > 1 && !stopWords.has(token)));
}

export function titleSimilarity(left, right) {
  const a = titleTokens(left);
  const b = titleTokens(right);
  if (a.size === 0 || b.size === 0) return 0;
  const intersection = [...a].filter(token => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  return intersection / union;
}

function dateDistanceHours(left, right) {
  const a = Date.parse(left);
  const b = Date.parse(right);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return Number.POSITIVE_INFINITY;
  return Math.abs(a - b) / 3_600_000;
}

export function isSameEvent(left, right, { similarityThreshold = 0.55, windowHours = 48 } = {}) {
  const leftSources = left.sources ?? [left.source].filter(Boolean);
  const rightSources = right.sources ?? [right.source].filter(Boolean);
  const leftUrls = new Set(leftSources.map(source => source?.originalUrl).filter(Boolean));
  const rightUrls = new Set(rightSources.map(source => source?.originalUrl).filter(Boolean));
  if ([...leftUrls].some(url => rightUrls.has(url))) return true;

  const leftIds = new Set(leftSources.map(source => `${source?.sourceId}:${source?.externalId}`).filter(value => !value.endsWith(':undefined')));
  const rightIds = new Set(rightSources.map(source => `${source?.sourceId}:${source?.externalId}`).filter(value => !value.endsWith(':undefined')));
  if ([...leftIds].some(id => rightIds.has(id))) return true;

  if (dateDistanceHours(left.publishedAt, right.publishedAt) > windowHours) return false;
  const leftCurrencies = new Set(left.currencies ?? []);
  const sharesCurrency = (right.currencies ?? []).some(code => leftCurrencies.has(code));
  if (!sharesCurrency) return false;
  return titleSimilarity(left.originalTitle ?? left.title, right.originalTitle ?? right.title) >= similarityThreshold;
}

export function deduplicateStories(items, options) {
  const groups = [];
  for (const item of items) {
    const existing = groups.find(group => isSameEvent(group, item, options));
    if (!existing) {
      groups.push({
        ...item,
        sources: [...(item.sources ?? [item.source].filter(Boolean))],
        duplicateIds: [],
        duplicates: []
      });
      continue;
    }
    const incomingSources = item.sources ?? [item.source].filter(Boolean);
    for (const source of incomingSources) {
      if (!existing.sources.some(current => current.originalUrl === source.originalUrl)) existing.sources.push(source);
    }
    existing.currencies = [...new Set([...(existing.currencies ?? []), ...(item.currencies ?? [])])];
    existing.duplicateIds.push(item.id);
    existing.duplicates.push({ id: item.id, status: 'duplicate', indexable: false, sources: incomingSources });
  }
  return groups;
}

export function stableCandidateId(sourceId, externalId, originalUrl) {
  return crypto.createHash('sha256').update(`${sourceId}\n${externalId ?? ''}\n${originalUrl}`).digest('hex').slice(0, 24);
}

export function validateStoryQuality(story) {
  const errors = [];
  if (!story?.id || !/^[a-z0-9][a-z0-9-]+$/.test(story.id)) errors.push('id must be a stable lowercase identifier');
  if (!story?.slug || slugify(story.slug) !== story.slug) errors.push('slug must be URL-safe');
  if (!NEWS_CATEGORIES.includes(story?.category)) errors.push('category is not supported');
  if (!Number.isFinite(Date.parse(story?.publishedAt))) errors.push('publishedAt must be a valid date');
  if (!Number.isFinite(Date.parse(story?.updatedAt))) errors.push('updatedAt must be a valid date');
  if (!Array.isArray(story?.currencies) || story.currencies.length === 0) errors.push('at least one related currency is required');
  if (!Array.isArray(story?.sources) || story.sources.length === 0) errors.push('at least one source is required');
  for (const source of story?.sources ?? []) {
    if (!source.name || !source.originalTitle || !source.externalId) errors.push('source name, title, and external ID are required');
    try {
      if (new URL(source.originalUrl).protocol !== 'https:') errors.push('source URL must use HTTPS');
    } catch {
      errors.push('source URL must be valid');
    }
  }
  for (const locale of SUPPORTED_NEWS_LOCALES) {
    const translation = story?.translations?.[locale];
    if (!translation) {
      errors.push(`${locale} translation is required`);
      continue;
    }
    if (normalizeWhitespace(translation.headline).length < 24) errors.push(`${locale} headline is too short`);
    if (normalizeWhitespace(translation.description).length < 50) errors.push(`${locale} description is too short`);
    if (normalizeWhitespace(translation.summary).length < 60) errors.push(`${locale} summary is too short`);
    if (normalizeWhitespace(translation.whatHappened).length < 100) errors.push(`${locale} whatHappened is too short`);
    if (normalizeWhitespace(translation.whyItMatters).length < 100) errors.push(`${locale} whyItMatters is too short`);
  }
  if (story?.status !== 'published') errors.push('only published stories may be rendered');
  if (story?.indexable !== true) errors.push('published stories must explicitly opt in to indexing');
  return { ok: errors.length === 0, errors };
}

function firstTag(xml, names) {
  for (const name of names) {
    const match = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'));
    if (match) return stripMarkup(match[1]);
  }
  return '';
}

export function parseRssOrAtom(xml) {
  if (typeof xml !== 'string' || !/<(?:rss|feed|rdf:RDF)\b/i.test(xml)) throw new TypeError('Source did not return RSS or Atom XML');
  const blocks = [...xml.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map(match => match[2]);
  return blocks.map(block => {
    const atomLink = block.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*\/?\s*>/i)?.[1] ?? '';
    return {
      title: firstTag(block, ['title']),
      url: firstTag(block, ['link']) || stripMarkup(atomLink),
      publishedAt: firstTag(block, ['pubDate', 'published', 'updated', 'dc:date']),
      externalId: firstTag(block, ['guid', 'id']),
      description: firstTag(block, ['description', 'summary', 'content:encoded', 'content'])
    };
  }).filter(item => item.title && item.url);
}

export async function fetchWithRetry(url, {
  fetchImpl = globalThis.fetch,
  timeoutMs = 10_000,
  retries = 2,
  retryDelayMs = 250
} = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('A fetch implementation is required');
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(url, {
        headers: { Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9' },
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < retries) await new Promise(resolve => setTimeout(resolve, retryDelayMs * (attempt + 1)));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error(`Unable to fetch ${url}: ${lastError?.message ?? 'unknown error'}`, { cause: lastError });
}
