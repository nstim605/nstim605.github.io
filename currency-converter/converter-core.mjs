export function convertCurrency({ amount, sourceRate, targetRate }) {
  if (![amount, sourceRate, targetRate].every(Number.isFinite) || amount <= 0 || sourceRate <= 0 || targetRate <= 0) {
    throw new RangeError('Amount and rates must be positive numbers.');
  }
  return {
    value: amount * targetRate / sourceRate,
    rate: targetRate / sourceRate
  };
}

export function readCurrencySelection(search, fallback = { source: 'EUR', target: 'RSD' }) {
  const params = new URLSearchParams(search);
  const normalize = value => /^[A-Z]{3}$/.test(value ?? '') ? value : null;
  const source = normalize(params.get('source')) ?? fallback.source;
  let target = normalize(params.get('target')) ?? fallback.target;
  if (source === target) target = source === fallback.target ? fallback.source : fallback.target;
  return { source, target };
}
