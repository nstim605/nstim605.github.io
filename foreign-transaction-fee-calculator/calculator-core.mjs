export function calculateForeignTransaction({
  localAmount,
  localCurrency,
  homeCurrency,
  localRate,
  homeRate,
  foreignFeePercent = 0,
  fixedFee = 0,
  dccAmount
}) {
  if (localCurrency === homeCurrency) throw new RangeError('Choose two different currencies.');

  const required = [localAmount, localRate, homeRate, foreignFeePercent, fixedFee];
  if (!required.every(Number.isFinite) || localAmount <= 0 || localRate <= 0 || homeRate <= 0) {
    throw new RangeError('Amount and rates must be positive numbers.');
  }
  if (foreignFeePercent < 0 || fixedFee < 0) throw new RangeError('Fees cannot be negative.');

  const referenceRate = homeRate / localRate;
  const referenceAmount = localAmount * referenceRate;
  const percentageFee = referenceAmount * foreignFeePercent / 100;
  const localCurrencyTotal = referenceAmount + percentageFee + fixedFee;

  if (dccAmount === undefined || dccAmount === null) {
    return { referenceRate, referenceAmount, percentageFee, fixedFee, localCurrencyTotal, dcc: null };
  }
  if (!Number.isFinite(dccAmount) || dccAmount <= 0) throw new RangeError('The DCC quote must be greater than zero.');

  const differenceFromReference = dccAmount - referenceAmount;
  const differenceFromLocal = dccAmount - localCurrencyTotal;
  const effectiveMarkupPercent = differenceFromReference / referenceAmount * 100;
  const tolerance = Math.max(1e-9, Math.abs(localCurrencyTotal) * 1e-12);
  const cheaperOption = Math.abs(differenceFromLocal) <= tolerance
    ? 'equal'
    : differenceFromLocal > 0 ? 'local' : 'dcc';

  return {
    referenceRate,
    referenceAmount,
    percentageFee,
    fixedFee,
    localCurrencyTotal,
    dcc: {
      quotedTotal: dccAmount,
      differenceFromReference,
      differenceFromLocal,
      effectiveMarkupPercent,
      cheaperOption
    }
  };
}
