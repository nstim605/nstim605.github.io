export const historicalRatesEndpoint = 'https://api.frankfurter.dev/v2/rates';

export function normalizeHistoryRows(rows, base, quote) {
  if (!Array.isArray(rows)) throw new Error('Invalid historical-rate response.');
  const byDate = new Map();
  for (const row of rows) {
    if (row?.base !== base || row?.quote !== quote || typeof row.date !== 'string' || !Number.isFinite(row.rate) || row.rate <= 0) continue;
    byDate.set(row.date, { date: row.date, rate: row.rate });
  }
  const points = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  if (!points.length) throw new Error('No historical rates are available for this selection.');
  return points;
}

export function calculateHistoryStatistics(points) {
  if (!Array.isArray(points) || !points.length || points.some(point => !Number.isFinite(point?.rate) || point.rate <= 0)) {
    throw new RangeError('At least one valid historical rate is required.');
  }
  const rates = points.map(point => point.rate);
  return {
    latest: points.at(-1),
    minimum: Math.min(...rates),
    maximum: Math.max(...rates),
    average: rates.reduce((sum, rate) => sum + rate, 0) / rates.length
  };
}

function buildUrl(parameters) {
  const url = new URL(historicalRatesEndpoint);
  for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, value);
  return url;
}

async function requestRows(parameters, fetchImpl = fetch) {
  const response = await fetchImpl(buildUrl(parameters), { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`Historical-rate request failed (${response.status}).`);
  return response.json();
}

export async function fetchHistory({ base, quote, from, to }, fetchImpl = fetch) {
  if (!base || !quote || base === quote) throw new RangeError('Choose two different currencies.');
  return normalizeHistoryRows(await requestRows({ base, quotes: quote, from, to }, fetchImpl), base, quote);
}

export async function fetchHistoricalDate({ base, quote, date }, fetchImpl = fetch) {
  if (!base || !quote || base === quote) throw new RangeError('Choose two different currencies.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new RangeError('Choose a valid historical date.');
  const points = normalizeHistoryRows(await requestRows({ base, quotes: quote, date }, fetchImpl), base, quote);
  return points.at(-1);
}
