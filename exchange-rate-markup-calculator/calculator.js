import {
  calculateMarkup,
  fetchReferenceRates,
  parseLocalizedNumber
} from './calculator-core.mjs';
import { trackSiteEvent } from '../analytics.js';
import { formatRateDate, t } from '../tool-i18n.mjs';

const form = document.querySelector('#markup-form');
const sourceSelect = document.querySelector('#source-currency');
const targetSelect = document.querySelector('#target-currency');
const amountInput = document.querySelector('#source-amount');
const offeredInput = document.querySelector('#offered-amount');
const status = document.querySelector('#calculator-status');
const results = document.querySelector('#calculator-results');
const submitButton = form.querySelector('button[type="submit"]');
const pageLocale = document.documentElement.lang || undefined;
let rateData;

function formatNumber(value, options = {}) {
  return new Intl.NumberFormat(pageLocale, { maximumFractionDigits: 4, ...options }).format(value);
}

function setStatus(message, type = '') {
  status.textContent = message;
  status.dataset.type = type;
}

function setBusy(busy) {
  submitButton.disabled = busy;
  submitButton.textContent = busy ? t('Loading latest rates…') : t('Calculate markup');
}

function populateCurrencies(table) {
  const displayNames = typeof Intl.DisplayNames === 'function'
    ? new Intl.DisplayNames([pageLocale], { type: 'currency' })
    : null;
  const codes = [...table.keys()].sort();
  for (const select of [sourceSelect, targetSelect]) {
    const selected = select.value;
    select.replaceChildren(...codes.map(code => {
      const option = document.createElement('option');
      option.value = code;
      const name = displayNames?.of(code);
      option.textContent = name && name !== code ? `${code} — ${name}` : code;
      return option;
    }));
    select.value = table.has(selected) ? selected : (select === sourceSelect ? 'EUR' : 'RSD');
  }
}

async function getRates() {
  if (rateData) return rateData;
  rateData = await fetchReferenceRates();
  populateCurrencies(rateData.table);
  return rateData;
}

function renderResult(calculation, source, target, date) {
  const rows = {
    referenceRate: `1 ${source} = ${formatNumber(calculation.referenceRate, { maximumFractionDigits: 6 })} ${target}`,
    referenceResult: `${formatNumber(calculation.referenceResult)} ${target}`,
    offeredResult: `${formatNumber(calculation.offeredAmount)} ${target}`,
    difference: `${formatNumber(Math.abs(calculation.difference))} ${target}`,
    percentage: `${formatNumber(Math.abs(calculation.markupPercentage), { maximumFractionDigits: 2 })}%`
  };
  for (const [key, value] of Object.entries(rows)) {
    results.querySelector(`[data-result="${key}"]`).textContent = value;
  }

  const worse = calculation.difference >= 0;
  results.querySelector('[data-label="difference"]').textContent = worse ? t('You receive less by') : t('You receive more by');
  results.querySelector('[data-label="percentage"]').textContent = worse ? t('Exchange-rate markup') : t('Above reference by');
  results.querySelector('.result-summary').textContent = worse
    ? t('The offer is {percentage} below the reference result.', { percentage: rows.percentage })
    : t('The offer is {percentage} above the reference result.', { percentage: rows.percentage });
  results.querySelector('.result-date').textContent = date
    ? t('Reference rates dated {date}.', { date: formatRateDate(date) }) : '';
  results.hidden = false;
  results.focus({ preventScroll: true });
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  results.hidden = true;
  const amount = parseLocalizedNumber(amountInput.value);
  const offeredAmount = parseLocalizedNumber(offeredInput.value);
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(offeredAmount) || offeredAmount <= 0) {
    setStatus(t('Enter two amounts greater than zero.'), 'error');
    return;
  }

  setBusy(true);
  setStatus(t('Fetching the latest reference rates…'), 'loading');
  try {
    const { table, date } = await getRates();
    const source = sourceSelect.value;
    const target = targetSelect.value;
    if (source === target) throw new RangeError(t('Choose two different currencies.'));
    const sourceRate = table.get(source);
    const targetRate = table.get(target);
    if (!sourceRate || !targetRate) throw new Error(t('A reference rate is unavailable for this currency pair.'));
    renderResult(calculateMarkup({ amount, offeredAmount, sourceRate, targetRate }), source, target, date);
    setStatus(t('Calculation updated from the latest available reference rates.'), 'success');
    trackSiteEvent('exchange_markup_calculator_used', { source_currency: source, target_currency: target });
  } catch (error) {
    setStatus(error instanceof RangeError ? t(error.message) : t('Rates could not be loaded. Check your connection and try again.'), 'error');
    if (!(error instanceof RangeError)) rateData = undefined;
  } finally {
    setBusy(false);
  }
});

document.querySelector('.calculator-play-cta')?.addEventListener('click', () => {
  trackSiteEvent('exchange_markup_play_cta_clicked');
});
