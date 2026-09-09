import { fetchReferenceRates, parseLocalizedNumber } from '../exchange-rate-markup-calculator/calculator-core.mjs';
import { calculateForeignTransaction } from './calculator-core.mjs';
import { trackSiteEvent } from '../analytics.js';
import { formatRateDate, t } from '../tool-i18n.mjs';

const form = document.querySelector('#foreign-fee-form');
const localAmountInput = document.querySelector('#local-amount');
const localCurrencySelect = document.querySelector('#local-currency');
const homeCurrencySelect = document.querySelector('#home-currency');
const percentageInput = document.querySelector('#foreign-fee-percent');
const fixedFeeInput = document.querySelector('#fixed-fee');
const dccAmountInput = document.querySelector('#dcc-amount');
const submitButton = form.querySelector('button[type="submit"]');
const status = document.querySelector('#foreign-fee-status');
const results = document.querySelector('#foreign-fee-results');
const dccResults = results.querySelector('[data-result-section="dcc"]');
const pageLocale = document.documentElement.lang || undefined;
let rateData;

function formatMoney(value, currency) {
  return new Intl.NumberFormat(pageLocale, {
    style: 'currency',
    currency,
    currencyDisplay: 'code',
    maximumFractionDigits: 2
  }).format(value);
}

function formatNumber(value, digits = 6) {
  return new Intl.NumberFormat(pageLocale, { maximumFractionDigits: digits }).format(value);
}

function setStatus(message, type = '') {
  status.textContent = message;
  status.dataset.type = type;
}

function setBusy(busy) {
  submitButton.disabled = busy;
  submitButton.textContent = busy ? t('Loading latest rates…') : t('Compare payment options');
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
  const local = localCurrencySelect.value;
  const home = homeCurrencySelect.value;
  localCurrencySelect.replaceChildren(...currencyOptions(local, table));
  homeCurrencySelect.replaceChildren(...currencyOptions(home, table));
  localCurrencySelect.value = table.has(local) ? local : 'RSD';
  homeCurrencySelect.value = table.has(home) ? home : 'EUR';
}

async function getRates() {
  if (!rateData) {
    rateData = await fetchReferenceRates();
    populateCurrencies(rateData.table);
  }
  return rateData;
}

function setResult(name, value) {
  results.querySelector(`[data-result="${name}"]`).textContent = value;
}

function renderResult(calculation, localCurrency, homeCurrency, feePercent, date) {
  setResult('referenceRate', `1 ${localCurrency} = ${formatNumber(calculation.referenceRate)} ${homeCurrency}`);
  setResult('referenceAmount', formatMoney(calculation.referenceAmount, homeCurrency));
  results.querySelector('[data-label="percentageFee"]').textContent = t('Foreign transaction fee ({percentage}%)', { percentage: formatNumber(feePercent, 2) });
  setResult('percentageFee', formatMoney(calculation.percentageFee, homeCurrency));
  setResult('fixedFee', formatMoney(calculation.fixedFee, homeCurrency));
  setResult('localTotal', formatMoney(calculation.localCurrencyTotal, homeCurrency));

  if (calculation.dcc) {
    const dcc = calculation.dcc;
    setResult('dccTotal', formatMoney(dcc.quotedTotal, homeCurrency));
    setResult('dccReferenceDifference', formatMoney(Math.abs(dcc.differenceFromReference), homeCurrency));
    results.querySelector('[data-label="dccReferenceDifference"]').textContent = dcc.differenceFromReference >= 0
      ? t('DCC above reference by') : t('DCC below reference by');
    setResult('dccMarkup', `${formatNumber(Math.abs(dcc.effectiveMarkupPercent), 2)}%`);
    results.querySelector('[data-label="dccMarkup"]').textContent = dcc.effectiveMarkupPercent >= 0
      ? t('Effective DCC markup') : t('DCC below reference');
    setResult('dccLocalDifference', formatMoney(Math.abs(dcc.differenceFromLocal), homeCurrency));
    results.querySelector('[data-label="dccLocalDifference"]').textContent = t('Difference between options');

    const difference = formatMoney(Math.abs(dcc.differenceFromLocal), homeCurrency);
    results.querySelector('.result-summary').textContent = dcc.cheaperOption === 'equal'
      ? t('Based on these values, both options have the same estimated cost.')
      : dcc.cheaperOption === 'local'
        ? t('Based on these values, paying in local currency would cost about {difference} less.', { difference })
        : t('Based on these values, the offered conversion would cost about {difference} less.', { difference });
    dccResults.hidden = false;
  } else {
    dccResults.hidden = true;
    results.querySelector('.result-summary').textContent = t('Add the optional DCC quoted total to compare both payment options.');
  }

  results.querySelector('.result-date').textContent = date
    ? t('Reference rates dated {date}. Source: Frankfurter reference-rate API.', { date: formatRateDate(date) })
    : t('Reference-rate date unavailable.');
  results.hidden = false;
  results.focus({ preventScroll: true });
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  results.hidden = true;

  const localAmount = parseLocalizedNumber(localAmountInput.value);
  const foreignFeePercent = parseLocalizedNumber(percentageInput.value);
  const fixedFee = parseLocalizedNumber(fixedFeeInput.value);
  const dccText = dccAmountInput.value.trim();
  const dccAmount = dccText ? parseLocalizedNumber(dccText) : undefined;

  if (!Number.isFinite(localAmount) || localAmount <= 0) {
    setStatus(t('Enter a purchase or withdrawal amount greater than zero.'), 'error');
    return;
  }
  if (!Number.isFinite(foreignFeePercent) || foreignFeePercent < 0 || !Number.isFinite(fixedFee) || fixedFee < 0) {
    setStatus(t('Enter fees of zero or more.'), 'error');
    return;
  }
  if (dccText && (!Number.isFinite(dccAmount) || dccAmount <= 0)) {
    setStatus(t('Enter a DCC quoted total greater than zero, or leave it blank.'), 'error');
    return;
  }

  setBusy(true);
  setStatus(t('Fetching the latest reference rates…'), 'loading');
  try {
    const { table, date } = await getRates();
    const localCurrency = localCurrencySelect.value;
    const homeCurrency = homeCurrencySelect.value;
    const localRate = table.get(localCurrency);
    const homeRate = table.get(homeCurrency);
    if (!localRate || !homeRate) throw new Error(t('A reference rate is unavailable for this currency pair.'));

    const calculation = calculateForeignTransaction({
      localAmount,
      localCurrency,
      homeCurrency,
      localRate,
      homeRate,
      foreignFeePercent,
      fixedFee,
      dccAmount
    });
    renderResult(calculation, localCurrency, homeCurrency, foreignFeePercent, date);
    setStatus(t('Comparison updated from the latest available reference rates.'), 'success');
    trackSiteEvent('foreign_transaction_fee_calculator_used');
    if (calculation.dcc) trackSiteEvent('dcc_comparison_used');
  } catch (error) {
    setStatus(error instanceof RangeError ? t(error.message) : t('Rates could not be loaded. Check your connection and try again.'), 'error');
    if (!(error instanceof RangeError)) rateData = undefined;
  } finally {
    setBusy(false);
  }
});

document.querySelector('.foreign-fee-play-cta')?.addEventListener('click', () => {
  trackSiteEvent('foreign_fee_play_cta_clicked');
});
