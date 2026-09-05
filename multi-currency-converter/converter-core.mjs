export function convertToMultiple({ amount, baseRate, targets }) {
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(baseRate) || baseRate <= 0) {
    throw new RangeError('Amount and base rate must be positive numbers.');
  }
  if (!Array.isArray(targets) || targets.length === 0) throw new RangeError('Choose at least one target currency.');

  const seen = new Set();
  return targets.map(({ code, rate }) => {
    if (typeof code !== 'string' || !Number.isFinite(rate) || rate <= 0) throw new RangeError('Every target needs a valid rate.');
    if (seen.has(code)) throw new RangeError('Choose each target currency only once.');
    seen.add(code);
    return { code, value: amount * rate / baseRate };
  });
}
