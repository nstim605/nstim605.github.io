import crypto from 'node:crypto';

export const SUPPORTED_NEWS_LOCALES = Object.freeze(['en', 'sr', 'ru']);
export const NEWS_STATUSES = Object.freeze(['pending', 'draft', 'published', 'rejected', 'duplicate']);
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
  ['Inflation', /\b(?:inflation|consumer prices?|CPI|consumer expectations?|inflation expectations?|wage growth|inflacij\w*|инфлац\w*)\b/iu],
  ['Economy', /\b(?:economy|economic (?:growth|projections?)|GDP|employment|unemployment|privred\w*|экономик\w*)\b/iu],
  ['Central Banks', /\b(?:central bank|Federal Reserve|FOMC|ECB|NBS|Bank of England|Bank of Japan)\b/iu],
  ['Commodities', /\b(?:oil|gold|gas|commodity|commodities)\b/iu],
  ['Forex', /\b(?:foreign exchange|forex|FX market)\b/iu],
];

const issuerAliases = Object.freeze([
  ['ecb', /^(?:ecb|european-central-bank)$/],
  ['federal-reserve', /^(?:fed|federal-reserve|board-of-governors-of-the-federal-reserve-system|fomc)$/],
  ['nbs', /^(?:nbs(?:-.+)?|national-bank-of-serbia|narodna-banka-srbije)$/]
]);

const eventTypeRules = Object.freeze([
  ['inflation-expectations', /\b(?:consumer expectations? survey|inflation expectations?|inflacion\w* ocekiv\w*|inflacion\w* očekiv\w*)\b|(?:инфляц\w* ожидан\w*)/iu],
  ['economic-projections', /\b(?:economic projections?|summary of economic projections?|macroeconomic projections?)\b|(?:макроэкономическ\w* прогноз\w*)/iu],
  ['forward-looking-wage-indicator', /\b(?:wage tracker|forward-looking wage|negotiated wage growth)\b/iu],
  ['operational-framework', /\b(?:collateral eligibility|collateral framework|haircut schedules?|rating methodology|external ratings?|operational framework|implementation guidelines?|monetary policy implementation)\b/iu],
  ['interest-rate-decision', /\b(?:(?:key|policy|reference|deposit|lending|federal funds|interest) rates?).*\b(?:unchanged|held|kept|keeps|raised?|increased?|lowered?|cut|reduced?)\b|\b(?:unchanged|held|kept|keeps|raised?|increased?|lowered?|cut|reduced?).*\b(?:(?:key|policy|reference|deposit|lending|federal funds|interest) rates?)\b|referentn\w*\s+kamatn\w*\s+stop\w*.*(?:zadrz\w*|zadrž\w*|povec\w*|poveć\w*|smanj\w*)|(?:референтн\w*|каматн\w*)\s+стоп\w*.*(?:задрж\w*|повећ\w*|смањ\w*)|(?:ключев\w*|процентн\w*)\s+ставк\w*.*(?:сохран\w*|повыс\w*|сниз\w*)/iu],
  ['inflation-release', /\b(?:inflation movements?|inflation (?:stood|was|rose|increased|fell|declined)|consumer prices? (?:rose|increased|fell|declined)|CPI (?:rose|increased|fell|declined))\b|(?:инфлац\w* (?:износ\w*|порас\w*|смањ\w*)|инфляц\w* (?:состав\w*|вырос\w*|сниз\w*))/iu],
  ['monetary-policy-decision', /\b(?:monetary policy decisions?|FOMC statement|policy decision)\b|(?:одлук\w* о монетарн\w* политиц\w*|решен\w* по денежно-кредитн\w* политик\w*)/iu]
]);

const stopWords = new Set([
  'a', 'an', 'and', 'at', 'by', 'for', 'from', 'in', 'its', 'of', 'on', 'the', 'to', 'with',
  'press', 'release', 'statement', 'announces', 'issues', 'update', 'updated'
]);

export function normalizeWhitespace(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

export function canonicalizeSourceUrl(value, base) {
  const url = base ? new URL(value, base) : new URL(value);
  url.pathname = url.pathname.replace(/\/{2,}/g, '/');
  return url.href;
}

export function stripMarkup(value = '') {
  return normalizeWhitespace(String(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/<[^>]*>/g, ' '));
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

function normalizedAlias(value = '') {
  return normalizeWhitespace(value).toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function itemText(item = {}) {
  const translations = Object.values(item.translations ?? {}).flatMap(translation => Object.values(translation ?? {}));
  const sources = (item.sources ?? [item.source].filter(Boolean)).flatMap(source => [source?.name, source?.originalTitle]);
  return normalizeWhitespace([
    item.originalTitle,
    item.title,
    item.description,
    item.summary,
    item.whatHappened,
    ...translations,
    ...sources
  ].filter(Boolean).join(' '));
}

export function detectEditorialTypes(...values) {
  const text = normalizeWhitespace(values.flat().filter(Boolean).join(' '));
  const types = [];
  if (/\b(?:survey|questionnaire)\b|(?:анкет\w*|истраживањ\w*)/iu.test(text)) types.push('survey');
  if (/\bexpectations?\b|(?:очекивањ\w*|ожидан\w*)/iu.test(text)) types.push('expectations');
  if (/\bprojections?\b|(?:пројекциј\w*|прогноз\w*)/iu.test(text)) types.push('projections');
  if (/\bforecasts?\b|(?:прогноз\w*)/iu.test(text)) types.push('forecast');
  if (/\b(?:forward-looking|wage tracker|dot plot)\b/iu.test(text)) types.push('forward-looking-indicator');
  return [...new Set(types)];
}

export function normalizeIssuer(item = {}) {
  const sources = item.sources ?? [item.source].filter(Boolean);
  for (const source of sources) {
    for (const value of [source?.sourceId, source?.name]) {
      const alias = normalizedAlias(value);
      const known = issuerAliases.find(([, pattern]) => pattern.test(alias));
      if (known) return known[0];
    }
  }
  return null;
}

export function detectEventType(item = {}) {
  const title = normalizeWhitespace(item.originalTitle || item.title || '');
  const fullText = itemText(item);
  for (const [type, pattern] of eventTypeRules) {
    if (pattern.test(title)) return type;
  }
  for (const [type, pattern] of eventTypeRules) {
    if (pattern.test(fullText)) return type;
  }
  return null;
}

export function extractKeyNumericalValues(...values) {
  const text = normalizeWhitespace(values.flat().filter(Boolean).join(' '));
  const results = new Set();
  for (const match of text.matchAll(/(-?\d+(?:[.,]\d+)?)\s*(%|percent(?:age points?)?|basis points?|bps?)\b/giu)) {
    const number = Number(match[1].replace(',', '.'));
    const rawUnit = match[2].toLowerCase();
    const unit = rawUnit.startsWith('basis') || rawUnit.startsWith('bp') ? 'bp' : '%';
    if (Number.isFinite(number)) results.add(`${number}:${unit}`);
  }
  return results;
}

export function classifyCandidate(candidate) {
  const sourceTitles = (candidate.sources ?? []).map(source => source.originalTitle);
  const currencies = [...new Set([
    ...(candidate.currencyHints ?? candidate.currencies ?? []),
    ...detectCurrencies(candidate.originalTitle, candidate.description, sourceTitles)
  ])];
  const editorialTypes = detectEditorialTypes(candidate.originalTitle, candidate.description, sourceTitles);
  const { currencyHints, ...classified } = candidate;
  return {
    ...classified,
    category: detectCategory(candidate.originalTitle, candidate.description, sourceTitles),
    currencies,
    editorialTypes,
    status: currencies.length > 0 ? 'pending' : 'rejected',
    indexable: false,
    rejectionReason: currencies.length > 0 ? null : 'No supported currency could be identified'
  };
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
  const canonicalUrl = value => {
    try { return canonicalizeSourceUrl(value); } catch { return value; }
  };
  const leftUrls = new Set(leftSources.map(source => source?.originalUrl).filter(Boolean).map(canonicalUrl));
  const rightUrls = new Set(rightSources.map(source => source?.originalUrl).filter(Boolean).map(canonicalUrl));
  if ([...leftUrls].some(url => rightUrls.has(url))) return true;

  const leftIds = new Set(leftSources.map(source => `${source?.sourceId}:${source?.externalId}`).filter(value => !value.endsWith(':undefined')));
  const rightIds = new Set(rightSources.map(source => `${source?.sourceId}:${source?.externalId}`).filter(value => !value.endsWith(':undefined')));
  if ([...leftIds].some(id => rightIds.has(id))) return true;

  const distanceHours = dateDistanceHours(left.publishedAt, right.publishedAt);
  if (distanceHours > windowHours) return false;
  const leftCurrencyValues = left.currencies ?? left.currencyHints ?? detectCurrencies(itemText(left));
  const rightCurrencyValues = right.currencies ?? right.currencyHints ?? detectCurrencies(itemText(right));
  const leftCurrencies = new Set(leftCurrencyValues);
  const sharesCurrency = rightCurrencyValues.some(code => leftCurrencies.has(code));
  if (!sharesCurrency) return false;

  const leftIssuer = normalizeIssuer(left);
  const rightIssuer = normalizeIssuer(right);
  const leftEventType = detectEventType(left);
  const rightEventType = detectEventType(right);
  if (leftIssuer && rightIssuer && leftIssuer === rightIssuer && leftEventType && leftEventType === rightEventType) {
    const sameCalendarDate = new Date(left.publishedAt).toISOString().slice(0, 10) === new Date(right.publishedAt).toISOString().slice(0, 10);
    const leftValues = extractKeyNumericalValues(itemText(left));
    const rightValues = extractKeyNumericalValues(itemText(right));
    const sharesValue = [...leftValues].some(value => rightValues.has(value));
    if (sameCalendarDate || sharesValue || (leftEventType === 'interest-rate-decision' && distanceHours <= 36)) return true;
  }
  if (leftIssuer && rightIssuer && leftIssuer !== rightIssuer) return false;
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
      const incomingUrl = (() => { try { return canonicalizeSourceUrl(source.originalUrl); } catch { return source.originalUrl; } })();
      if (!existing.sources.some(current => {
        try { return canonicalizeSourceUrl(current.originalUrl) === incomingUrl; } catch { return current.originalUrl === source.originalUrl; }
      })) existing.sources.push(source);
    }
    existing.currencies = [...new Set([...(existing.currencies ?? []), ...(item.currencies ?? [])])];
    existing.currencyHints = [...new Set([...(existing.currencyHints ?? []), ...(item.currencyHints ?? [])])];
    if ((item.description?.length ?? 0) > (existing.description?.length ?? 0)) existing.description = item.description;
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

const sourceHosts = Object.freeze({
  ecb: ['ecb.europa.eu', 'www.ecb.europa.eu'],
  'federal-reserve': ['federalreserve.gov', 'www.federalreserve.gov'],
  nbs: ['nbs.rs', 'www.nbs.rs'],
  'nbs-executive-board': ['nbs.rs', 'www.nbs.rs'],
  'nbs-monetary-policy': ['nbs.rs', 'www.nbs.rs']
});

const moderationSignals = /\b(?:monetary policy|policy rate|interest rate|key rate|reference rate|fomc statement|economic projections?|inflation|consumer expectations?|wage growth|foreign exchange|exchange rate|monetary policy implementation|kamatn\w* stop\w*|referentn\w* stop\w*)\b|(?:монетарн\w* политик\w*|каматн\w* стоп\w*|референтн\w* стоп\w*|инфлац\w*|девизн\w* курс\w*)/iu;
const moderationExclusions = /\b(?:interview|speech|hearing|resign|banknotes?|cash|task force|tokenised securities|digitalisation of money)\b/iu;

export function assessCandidateValue(candidate) {
  const text = itemText(candidate);
  const eventType = detectEventType(candidate);
  const numericalFacts = extractKeyNumericalValues(text);
  const hasOfficialDataAttachment = (candidate.sources ?? []).some(source => source.metadata?.role === 'data');
  const baseScores = {
    'interest-rate-decision': 4,
    'inflation-release': 4,
    'inflation-expectations': 3,
    'economic-projections': 3,
    'monetary-policy-decision': 3,
    'operational-framework': 0,
    'forward-looking-wage-indicator': 0
  };
  let score = baseScores[eventType] ?? 0;
  score += Math.min(numericalFacts.size, 2);
  if (hasOfficialDataAttachment) score += 1;
  if (/\b(?:foreign exchange|exchange rate|purchasing power)\b|(?:девизн\w* курс\w*|куповн\w* моћ\w*)/iu.test(text)) score += 2;

  const reasons = [];
  if (eventType === 'operational-framework') {
    score -= 3;
    reasons.push('standalone value is too low: predominantly technical or operational central-bank material');
  }
  if (eventType === 'forward-looking-wage-indicator') {
    score -= 2;
    reasons.push('standalone value is too low: specialized forward-looking wage indicator');
  }
  if (score < 3 && reasons.length === 0) reasons.push('standalone value is too low for Balkan Converter users');
  return { ok: score >= 3, score, eventType, numericalFacts: [...numericalFacts], reasons };
}

export function validateCandidateQuality(candidate, { now = new Date(), maximumAgeDays = 21 } = {}) {
  const errors = [];
  const title = normalizeWhitespace(candidate?.originalTitle);
  if (!candidate?.id) errors.push('stable candidate ID is required');
  if (title.length < 24 || title.length > 220) errors.push('title length is outside the moderation range');
  if (!Array.isArray(candidate?.currencies) || candidate.currencies.length === 0) errors.push('at least one supported currency is required');
  const publishedAt = Date.parse(candidate?.publishedAt);
  if (!Number.isFinite(publishedAt)) {
    errors.push('publishedAt must be a valid date');
  } else {
    const ageDays = (now.getTime() - publishedAt) / 86_400_000;
    if (ageDays < -1) errors.push('publication date is unexpectedly in the future');
    if (ageDays > maximumAgeDays) errors.push(`candidate is older than ${maximumAgeDays} days`);
  }
  if (!moderationSignals.test(normalizeWhitespace(`${title} ${candidate?.description ?? ''}`))) errors.push('candidate does not contain a supported monetary-policy signal');
  if (moderationExclusions.test(title)) errors.push('title matches an excluded low-priority content type');
  if (!Array.isArray(candidate?.sources) || candidate.sources.length === 0) errors.push('at least one official source is required');
  for (const source of candidate?.sources ?? []) {
    const allowedHosts = sourceHosts[source?.sourceId];
    if (!allowedHosts) {
      errors.push(`source ${source?.sourceId ?? 'unknown'} is not approved for automation`);
      continue;
    }
    try {
      const url = new URL(source.originalUrl);
      if (url.protocol !== 'https:') errors.push('source URL must use HTTPS');
      if (!allowedHosts.includes(url.hostname.toLowerCase())) errors.push(`source host ${url.hostname} is not approved`);
    } catch {
      errors.push('source URL must be valid');
    }
  }
  const valueAssessment = assessCandidateValue(candidate);
  if (!valueAssessment.ok) errors.push(...valueAssessment.reasons);
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
  retryDelayMs = 250,
  maxResponseBytes = 2_000_000,
  headers = {}
} = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('A fetch implementation is required');
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(url, {
        headers: { Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9', ...headers },
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      if (Buffer.byteLength(text, 'utf8') > maxResponseBytes) throw new Error(`response exceeds ${maxResponseBytes} bytes`);
      return text;
    } catch (error) {
      lastError = error;
      if (attempt < retries) await new Promise(resolve => setTimeout(resolve, retryDelayMs * (attempt + 1)));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error(`Unable to fetch ${url}: ${lastError?.message ?? 'unknown error'}`, { cause: lastError });
}
