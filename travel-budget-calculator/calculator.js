import { fetchReferenceRates, parseLocalizedNumber } from '../exchange-rate-markup-calculator/calculator-core.mjs';
import { calculateTravelBudget } from './calculator-core.mjs';
import { trackSiteEvent } from '../analytics.js';
import { formatRateDate, t } from '../tool-i18n.mjs';

const form = document.querySelector('#travel-budget-form');
const destinationSelect = document.querySelector('#destination-currency');
const homeSelect = document.querySelector('#home-currency');
const submitButton = form.querySelector('button[type="submit"]');
const status = document.querySelector('#travel-budget-status');
const results = document.querySelector('#travel-budget-results');
const pageLocale = document.documentElement.lang || undefined;
let rateData;

function numberFrom(id, blankValue = Number.NaN) {
  const value = document.querySelector(id).value;
  return value.trim() ? parseLocalizedNumber(value) : blankValue;
}
function formatMoney(value, currency) {
  return new Intl.NumberFormat(pageLocale, { style: 'currency', currency, currencyDisplay: 'code', maximumFractionDigits: 2 }).format(value);
}
function formatNumber(value, digits = 6) { return new Intl.NumberFormat(pageLocale, { maximumFractionDigits: digits }).format(value); }
function setStatus(message, type = '') { status.textContent = message; status.dataset.type = type; }
function setBusy(busy) { submitButton.disabled = busy; submitButton.textContent = busy ? t('Loading latest rates…') : t('Calculate travel budget'); }
function setResult(name, value) { results.querySelector(`[data-result="${name}"]`).textContent = value; }

function currencyOptions(selected, table) {
  return [...table.keys()].sort().map(code => {
    const option = document.createElement('option');
    option.value = code; option.textContent = code; option.selected = code === selected;
    return option;
  });
}
function populateCurrencies(table) {
  const destination = destinationSelect.value;
  const home = homeSelect.value;
  destinationSelect.replaceChildren(...currencyOptions(destination, table));
  homeSelect.replaceChildren(...currencyOptions(home, table));
  destinationSelect.value = table.has(destination) ? destination : 'RSD';
  homeSelect.value = table.has(home) ? home : 'EUR';
}
async function getRates() {
  if (!rateData) { rateData = await fetchReferenceRates(); populateCurrencies(rateData.table); }
  return rateData;
}

function renderResult(calculation, destinationCurrency, homeCurrency, date) {
  setResult('dailyBudget', formatMoney(calculation.dailyBudget, destinationCurrency));
  setResult('tripTotal', formatMoney(calculation.tripTotal, destinationCurrency));
  setResult('accommodation', formatMoney(calculation.categories.accommodation, destinationCurrency));
  setResult('food', formatMoney(calculation.categories.food, destinationCurrency));
  setResult('transport', formatMoney(calculation.categories.transport, destinationCurrency));
  setResult('activities', formatMoney(calculation.categories.activities, destinationCurrency));
  setResult('fixedCosts', formatMoney(calculation.categories.fixed, destinationCurrency));
  setResult('bufferAmount', formatMoney(calculation.bufferAmount, destinationCurrency));
  setResult('finalDestinationBudget', formatMoney(calculation.finalDestinationBudget, destinationCurrency));
  setResult('finalHomeBudget', formatMoney(calculation.finalHomeBudget, homeCurrency));
  setResult('referenceRate', `1 ${destinationCurrency} = ${formatNumber(calculation.referenceRate)} ${homeCurrency}`);
  results.querySelector('.result-date').textContent = date
    ? t('Reference rates dated {date}. Source: Frankfurter reference-rate API.', { date: formatRateDate(date) })
    : t('Reference-rate date unavailable.');
  results.hidden = false;
  results.focus({ preventScroll: true });
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  results.hidden = true;
  const input = {
    days: numberFrom('#travel-days'),
    accommodationPerDay: numberFrom('#accommodation', 0),
    foodPerDay: numberFrom('#food', 0),
    transportPerDay: numberFrom('#transport', 0),
    activitiesPerDay: numberFrom('#activities', 0),
    fixedCosts: numberFrom('#fixed-costs', 0),
    bufferPercent: numberFrom('#buffer-percent', 0),
    destinationCurrency: destinationSelect.value,
    homeCurrency: homeSelect.value
  };
  if (!Number.isInteger(input.days) || input.days <= 0) { setStatus(t('Enter a whole number of travel days greater than zero.'), 'error'); return; }
  const costs = [input.accommodationPerDay, input.foodPerDay, input.transportPerDay, input.activitiesPerDay, input.fixedCosts, input.bufferPercent];
  if (!costs.every(Number.isFinite) || costs.some(value => value < 0)) { setStatus(t('Enter budget amounts and a buffer of zero or more.'), 'error'); return; }
  if (costs.slice(0, 5).every(value => value === 0)) { setStatus(t('Enter at least one budget amount greater than zero.'), 'error'); return; }

  setBusy(true); setStatus(t('Fetching the latest reference rates…'), 'loading');
  try {
    const { table, date } = await getRates();
    const destinationRate = table.get(input.destinationCurrency);
    const homeRate = table.get(input.homeCurrency);
    if (!destinationRate || !homeRate) throw new Error(t('A reference rate is unavailable for this currency pair.'));
    const calculation = calculateTravelBudget({ ...input, destinationRate, homeRate });
    renderResult(calculation, input.destinationCurrency, input.homeCurrency, date);
    setStatus(t('Budget updated from the latest available reference rates.'), 'success');
    trackSiteEvent('travel_budget_calculator_used');
  } catch (error) {
    setStatus(error instanceof RangeError ? t(error.message) : t('Rates could not be loaded. Check your connection and try again.'), 'error');
    if (!(error instanceof RangeError)) rateData = undefined;
  } finally { setBusy(false); }
});

document.querySelector('.travel-budget-play-cta')?.addEventListener('click', () => {
  trackSiteEvent('travel_budget_play_cta_clicked');
});
