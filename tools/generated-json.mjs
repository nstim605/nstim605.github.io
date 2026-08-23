import fs from 'node:fs/promises';

const isoUtcPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value).sort().map(key => [key, canonicalValue(value[key])])
    );
  }
  return value;
}

function semanticSignature(value) {
  return JSON.stringify(canonicalValue(value));
}

function timestampFromEpoch(sourceDateEpoch) {
  if (!/^(0|[1-9]\d*)$/.test(sourceDateEpoch)) {
    throw new Error('SOURCE_DATE_EPOCH must be a non-negative integer number of UTC seconds');
  }
  const milliseconds = Number(BigInt(sourceDateEpoch) * 1000n);
  if (!Number.isSafeInteger(milliseconds)) {
    throw new Error('SOURCE_DATE_EPOCH is outside the supported JavaScript date range');
  }
  const date = new Date(milliseconds);
  if (Number.isNaN(date.getTime())) {
    throw new Error('SOURCE_DATE_EPOCH is outside the supported JavaScript date range');
  }
  return date.toISOString();
}

export function isValidGeneratedAt(value) {
  if (typeof value !== 'string' || !isoUtcPattern.test(value)) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

export function createRunTimestamp({
  sourceDateEpoch = process.env.SOURCE_DATE_EPOCH,
  now = () => new Date()
} = {}) {
  let value;
  return () => {
    if (value) return value;
    if (sourceDateEpoch !== undefined) {
      value = timestampFromEpoch(sourceDateEpoch);
      return value;
    }
    const date = now();
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      throw new Error('Generator clock did not return a valid Date');
    }
    value = date.toISOString();
    return value;
  };
}

function payloadWithTimestamp(semanticPayload, generatedAt, generatedAtIndex) {
  const entries = Object.entries(semanticPayload);
  if (!Number.isInteger(generatedAtIndex) || generatedAtIndex < 0 || generatedAtIndex > entries.length) {
    throw new Error(`Invalid generatedAtIndex: ${generatedAtIndex}`);
  }
  entries.splice(generatedAtIndex, 0, ['generatedAt', generatedAt]);
  return Object.fromEntries(entries);
}

export async function writeGeneratedJson(filePath, semanticPayload, {
  getRunTimestamp,
  generatedAtIndex = 0,
  fileSystem = fs
} = {}) {
  if (typeof getRunTimestamp !== 'function') {
    throw new Error('writeGeneratedJson requires one shared run timestamp provider');
  }
  if (!semanticPayload || typeof semanticPayload !== 'object' || Array.isArray(semanticPayload)) {
    throw new Error('Generated semantic payload must be a JSON object');
  }
  if (Object.hasOwn(semanticPayload, 'generatedAt')) {
    throw new Error('Semantic payload must not contain generatedAt');
  }

  let existingText = null;
  try {
    existingText = await fileSystem.readFile(filePath, 'utf8');
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }

  let existingTimestamp;
  let semanticChanged = true;
  let reason = 'missing-output';
  if (existingText !== null) {
    let existingPayload;
    try {
      existingPayload = JSON.parse(existingText);
    } catch (error) {
      throw new Error(`Malformed generated JSON at ${filePath}: ${error.message}`, { cause: error });
    }
    if (!existingPayload || typeof existingPayload !== 'object' || Array.isArray(existingPayload)) {
      throw new Error(`Malformed generated JSON at ${filePath}: root value must be an object`);
    }
    ({ generatedAt: existingTimestamp, ...existingPayload } = existingPayload);
    semanticChanged = semanticSignature(existingPayload) !== semanticSignature(semanticPayload);
    reason = semanticChanged ? 'semantic-change' : 'unchanged';
    if (!semanticChanged && !isValidGeneratedAt(existingTimestamp)) reason = 'invalid-or-missing-timestamp';
  }

  const preserveTimestamp = !semanticChanged && isValidGeneratedAt(existingTimestamp);
  const generatedAt = preserveTimestamp ? existingTimestamp : getRunTimestamp();
  const serialized = `${JSON.stringify(
    payloadWithTimestamp(semanticPayload, generatedAt, generatedAtIndex),
    null,
    2
  )}\n`;
  const changed = serialized !== existingText;
  if (changed) await fileSystem.writeFile(filePath, serialized, 'utf8');

  return { changed, semanticChanged, generatedAt, reason };
}
