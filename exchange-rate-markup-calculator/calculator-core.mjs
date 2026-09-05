export const ratesEndpoint = 'https://api.frankfurter.dev/v2/rates';

export function parseLocalizedNumber(value) {
  const compact = String(value ?? '').trim().replace(/[\s\u00a0\u202f']/g, '');
  if (!compact) return Number.NaN;

  const lastComma = compact.lastIndexOf(',');
  const lastDot = compact.lastIndexOf('.');
  let normalized = compact;
  if (lastComma >= 0 && lastDot >= 0) {
    const decimal = lastComma > lastDot ? ',' : '.';
    const grouping = decimal === ',' ? '.' : ',';
    normalized = compact.replaceAll(grouping, '').replace(decimal, '.');
  } else if (lastComma >= 0) {
    normalized = compact.replace(',', '.');
  }

  return Number(normalized);
}

export function buildRateTable(rows) {
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('No reference rates were returned.');
  const table = new Map([['EUR', 1]]);
  let date = '';
  for (const row of rows) {
    if (row?.base !== 'EUR' || typeof row?.quote !== 'string' || !Number.isFinite(row?.rate) || row.rate <= 0) continue;
    table.set(row.quote, row.rate);
    if (typeof row.date === 'string' && row.date > date) date = row.date;
  }
  if (table.size < 2) throw new Error('Reference-rate data is incomplete.');
  return { table, date };
}

export async function fetchReferenceRates(fetchImpl = fetch) {
  const response = await fetchImpl(ratesEndpoint, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`Reference-rate request failed (${response.status}).`);
  return buildRateTable(await response.json());
}

export function calculateMarkup({ amount, offeredAmount, sourceRate, targetRate }) {
  const values = [amount, offeredAmount, sourceRate, targetRate];
  if (!values.every(Number.isFinite) || amount <= 0 || offeredAmount <= 0 || sourceRate <= 0 || targetRate <= 0) {
    throw new RangeError('Amounts and rates must be positive numbers.');
  }

  const referenceRate = targetRate / sourceRate;
  const referenceResult = amount * referenceRate;
  const difference = referenceResult - offeredAmount;
  const markupPercentage = (difference / referenceResult) * 100;
  return { referenceRate, referenceResult, offeredAmount, difference, markupPercentage };
}
