import { fetchReferenceRates, parseLocalizedNumber } from '../exchange-rate-markup-calculator/calculator-core.mjs';
import { convertCurrency } from './converter-core.mjs';
import { trackSiteEvent } from '../analytics.js';
import { formatRateDate, t } from '../tool-i18n.mjs';

const form = document.querySelector('#currency-form');
const amountInput = document.querySelector('#currency-amount');
const sourceSelect = document.querySelector('#currency-source');
const targetSelect = document.querySelector('#currency-target');
const swapButton = document.querySelector('#swap-currencies');
const submitButton = form.querySelector('button[type="submit"]');
const status = document.querySelector('#currency-status');
const results = document.querySelector('#currency-results');
const pageLocale = document.documentElement.lang || undefined;
let rateData;

function formatAmount(value, code) {
  return new Intl.NumberFormat(pageLocale, {
    style: 'currency',
    currency: code,
    currencyDisplay: 'code',
    maximumFractionDigits: 4
  }).format(value);
}

function formatRate(value) {
  return new Intl.NumberFormat(pageLocale, { maximumFractionDigits: 6 }).format(value);
}

function setStatus(message, type = '') {
  status.textContent = message;
  status.dataset.type = type;
}

function currencyOptions(selected, table) {
  return [...table.keys()].sort().map(code => {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = code;
    option.selected = code === selected;
    return option;
  });
}

function populateCurrencies(table) {
  const source = sourceSelect.value;
  const target = targetSelect.value;
  sourceSelect.replaceChildren(...currencyOptions(source, table));
  targetSelect.replaceChildren(...currencyOptions(target, table));
}

async function getRates() {
  if (!rateData) {
    rateData = await fetchReferenceRates();
    populateCurrencies(rateData.table);
  }
  return rateData;
}

swapButton.addEventListener('click', () => {
  const source = sourceSelect.value;
  sourceSelect.value = targetSelect.value;
  targetSelect.value = source;
  trackSiteEvent('currency_converter_swapped');
  form.requestSubmit();
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  results.hidden = true;
  const amount = parseLocalizedNumber(amountInput.value);
  if (!Number.isFinite(amount) || amount <= 0) {
    setStatus(t('Enter an amount greater than zero.'), 'error');
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = t('Loading latest rates…');
  setStatus(t('Fetching the latest reference rates…'), 'loading');
  try {
    const { table, date } = await getRates();
    const source = sourceSelect.value;
    const target = targetSelect.value;
    if (source === target) throw new RangeError(t('Choose two different currencies.'));
    const converted = convertCurrency({ amount, sourceRate: table.get(source), targetRate: table.get(target) });
    results.querySelector('[data-result="amount"]').textContent = formatAmount(converted.value, target);
    results.querySelector('[data-result="rate"]').textContent = `1 ${source} = ${formatRate(converted.rate)} ${target}`;
    results.querySelector('.result-date').textContent = date
      ? t('Reference rates dated {date}.', { date: formatRateDate(date) })
      : t('Rate date unavailable.');
    results.hidden = false;
    results.focus({ preventScroll: true });
    setStatus(t('Conversion updated from the latest available reference rates.'), 'success');
    trackSiteEvent('currency_converter_used', { source_currency: source, target_currency: target });
  } catch (error) {
    setStatus(error instanceof RangeError ? t(error.message) : t('Rates could not be loaded. Check your connection and try again.'), 'error');
    if (!(error instanceof RangeError)) rateData = undefined;
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = t('Convert currency');
  }
});

document.querySelector('.currency-play-cta')?.addEventListener('click', () => trackSiteEvent('currency_converter_play_cta_clicked'));
