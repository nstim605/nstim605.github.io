export function convertCurrency({ amount, sourceRate, targetRate }) {
  if (![amount, sourceRate, targetRate].every(Number.isFinite) || amount <= 0 || sourceRate <= 0 || targetRate <= 0) {
    throw new RangeError('Amount and rates must be positive numbers.');
  }
  return {
    value: amount * targetRate / sourceRate,
    rate: targetRate / sourceRate
  };
}
