import { fetchReferenceRates, parseLocalizedNumber } from '../exchange-rate-markup-calculator/calculator-core.mjs';
import { convertToMultiple } from './converter-core.mjs';
import { trackSiteEvent } from '../analytics.js';

const form = document.querySelector('#multi-form');
const baseSelect = document.querySelector('#base-currency');
const amountInput = document.querySelector('#multi-amount');
const targetList = document.querySelector('#target-list');
const addButton = document.querySelector('#add-target');
const status = document.querySelector('#multi-status');
const results = document.querySelector('#multi-results');
const submitButton = form.querySelector('button[type="submit"]');
let rateData;

function formatCurrency(value, code) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: code, currencyDisplay: 'code', maximumFractionDigits: 4 }).format(value);
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

function addTarget(selected = 'USD') {
  const row = document.createElement('div');
  row.className = 'target-row';
  const select = document.createElement('select');
  select.className = 'target-currency';
  select.setAttribute('aria-label', 'Target currency');
  const available = rateData?.table ?? new Map([['RSD', 1], ['USD', 1], ['GBP', 1]]);
  select.replaceChildren(...currencyOptions(selected, available));
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'remove-target';
  remove.setAttribute('aria-label', 'Remove target currency');
  remove.textContent = '×';
  remove.addEventListener('click', () => {
    if (targetList.children.length === 1) {
      setStatus('Keep at least one target currency.', 'error');
      return;
    }
    row.remove();
  });
  row.append(select, remove);
  targetList.append(row);
}

function populateAll(table) {
  const base = baseSelect.value;
  baseSelect.replaceChildren(...currencyOptions(base, table));
  [...targetList.querySelectorAll('select')].forEach(select => {
    const selected = select.value;
    select.replaceChildren(...currencyOptions(selected, table));
  });
}

async function getRates() {
  if (!rateData) {
    rateData = await fetchReferenceRates();
    populateAll(rateData.table);
  }
  return rateData;
}

addButton.addEventListener('click', () => addTarget('CHF'));
addTarget('RSD');
addTarget('USD');
addTarget('GBP');

form.addEventListener('submit', async event => {
  event.preventDefault();
  results.hidden = true;
  const amount = parseLocalizedNumber(amountInput.value);
  if (!Number.isFinite(amount) || amount <= 0) {
    setStatus('Enter an amount greater than zero.', 'error');
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = 'Loading latest rates…';
  setStatus('Fetching the latest reference rates…', 'loading');
  try {
    const { table, date } = await getRates();
    const base = baseSelect.value;
    const targetCodes = [...targetList.querySelectorAll('select')].map(select => select.value);
    if (targetCodes.includes(base)) throw new RangeError('Target currencies must be different from the base currency.');
    const converted = convertToMultiple({
      amount,
      baseRate: table.get(base),
      targets: targetCodes.map(code => ({ code, rate: table.get(code) }))
    });
    results.querySelector('.multi-result-list').replaceChildren(...converted.map(({ code, value }) => {
      const row = document.createElement('div');
      const term = document.createElement('dt');
      const definition = document.createElement('dd');
      term.textContent = code;
      definition.textContent = formatCurrency(value, code);
      row.append(term, definition);
      return row;
    }));
    results.querySelector('.result-date').textContent = date ? `Reference rates dated ${date}.` : '';
    results.hidden = false;
    results.focus({ preventScroll: true });
    setStatus('Conversions updated from the latest available reference rates.', 'success');
    trackSiteEvent('multi_currency_converter_used', { base_currency: base, target_count: converted.length });
  } catch (error) {
    setStatus(error instanceof RangeError ? error.message : 'Rates could not be loaded. Check your connection and try again.', 'error');
    if (!(error instanceof RangeError)) rateData = undefined;
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Convert currencies';
  }
});

document.querySelector('.multi-play-cta')?.addEventListener('click', () => trackSiteEvent('multi_currency_play_cta_clicked'));
