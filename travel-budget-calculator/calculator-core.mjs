export function calculateTravelBudget({
  days,
  accommodationPerDay = 0,
  foodPerDay = 0,
  transportPerDay = 0,
  activitiesPerDay = 0,
  fixedCosts = 0,
  bufferPercent = 0,
  destinationCurrency,
  homeCurrency,
  destinationRate,
  homeRate
}) {
  const values = [days, accommodationPerDay, foodPerDay, transportPerDay, activitiesPerDay,
    fixedCosts, bufferPercent, destinationRate, homeRate];
  if (!values.every(Number.isFinite)) throw new RangeError('Enter valid numbers in every field.');
  if (!Number.isInteger(days) || days <= 0) throw new RangeError('Travel days must be a whole number greater than zero.');
  if ([accommodationPerDay, foodPerDay, transportPerDay, activitiesPerDay, fixedCosts, bufferPercent].some(value => value < 0)) {
    throw new RangeError('Budget amounts and buffer cannot be negative.');
  }
  if (destinationRate <= 0 || homeRate <= 0) throw new RangeError('Reference rates must be positive.');
  if (destinationCurrency === homeCurrency) throw new RangeError('Choose two different currencies.');

  const categories = {
    accommodation: accommodationPerDay * days,
    food: foodPerDay * days,
    transport: transportPerDay * days,
    activities: activitiesPerDay * days,
    fixed: fixedCosts
  };
  const dailyBudget = accommodationPerDay + foodPerDay + transportPerDay + activitiesPerDay;
  const tripTotal = dailyBudget * days + fixedCosts;
  if (tripTotal <= 0) throw new RangeError('Enter at least one budget amount greater than zero.');
  const bufferAmount = tripTotal * bufferPercent / 100;
  const finalDestinationBudget = tripTotal + bufferAmount;
  const referenceRate = homeRate / destinationRate;
  const finalHomeBudget = finalDestinationBudget * referenceRate;

  return { dailyBudget, tripTotal, categories, bufferAmount, finalDestinationBudget, referenceRate, finalHomeBudget };
}
