import { fetchReferenceRates } from '../exchange-rate-markup-calculator/calculator-core.mjs';
import { calculateHistoryStatistics, fetchHistoricalDate, fetchHistory } from './history-core.mjs';
import { trackSiteEvent } from '../analytics.js';

const historyForm = document.querySelector('#history-form');
const dateForm = document.querySelector('#history-date-form');
const baseSelect = document.querySelector('#history-base');
const targetSelect = document.querySelector('#history-target');
const swapButton = document.querySelector('#history-swap');
const historyStatus = document.querySelector('#history-status');
const dateStatus = document.querySelector('#history-date-status');
const historyResults = document.querySelector('#history-results');
const dateResults = document.querySelector('#history-date-results');
const dateInput = document.querySelector('#history-date');
const line = document.querySelector('#history-line');
let currenciesReady = false;

const today = new Date().toISOString().slice(0, 10);
dateInput.max = today;
dateInput.value = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

function setStatus(element, message, type = '') {
  element.textContent = message;
  element.dataset.type = type;
}

function options(selected, table) {
  return [...table.keys()].sort().map(code => {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = code;
    option.selected = code === selected;
    return option;
  });
}

async function ensureCurrencies() {
  if (currenciesReady) return;
  const data = await fetchReferenceRates();
  const base = baseSelect.value;
  const target = targetSelect.value;
  baseSelect.replaceChildren(...options(base, data.table));
  targetSelect.replaceChildren(...options(target, data.table));
  currenciesReady = true;
}

function selectedPair() {
  const base = baseSelect.value;
  const quote = targetSelect.value;
  if (base === quote) throw new RangeError('Choose two different currencies.');
  return { base, quote };
}

function periodRange(days) {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
}

function formatRate(value) {
  return new Intl.NumberFormat(undefined, { minimumSignificantDigits: 4, maximumSignificantDigits: 7 }).format(value);
}

function renderChart(points, base, quote) {
  const width = 720;
  const height = 280;
  const padding = 14;
  const rates = points.map(point => point.rate);
  const minimum = Math.min(...rates);
  const maximum = Math.max(...rates);
  const naturalSpread = maximum - minimum;
  const spread = naturalSpread || Math.max(Math.abs(maximum) * 0.02, 0.000001);
  const low = naturalSpread ? minimum : minimum - spread / 2;
  const coordinates = points.map((point, index) => {
    const x = padding + (points.length === 1 ? (width - padding * 2) / 2 : index * (width - padding * 2) / (points.length - 1));
    const y = padding + (maximum - point.rate + (naturalSpread ? 0 : spread / 2)) * (height - padding * 2) / spread;
    return `${index ? 'L' : 'M'} ${x.toFixed(2)} ${y.toFixed(2)}`;
  });
  line.setAttribute('d', coordinates.join(' '));
  line.closest('svg').setAttribute('aria-label', `${base} to ${quote} reference-rate history from ${points[0].date} to ${points.at(-1).date}. Minimum ${formatRate(minimum)}, maximum ${formatRate(maximum)}.`);
  document.querySelector('#chart-maximum').textContent = formatRate(maximum);
  document.querySelector('#chart-minimum').textContent = formatRate(minimum);
  document.querySelector('#chart-start').textContent = points[0].date;
  document.querySelector('#chart-end').textContent = points.at(-1).date;
}

swapButton.addEventListener('click', () => {
  const base = baseSelect.value;
  baseSelect.value = targetSelect.value;
  targetSelect.value = base;
  trackSiteEvent('exchange_rate_history_swapped');
  historyForm.requestSubmit();
});

historyForm.addEventListener('submit', async event => {
  event.preventDefault();
  historyResults.hidden = true;
  dateResults.hidden = true;
  const submit = historyForm.querySelector('button[type="submit"]');
  submit.disabled = true;
  submit.textContent = 'Loading history…';
  setStatus(historyStatus, 'Fetching historical reference rates…', 'loading');
  try {
    await ensureCurrencies();
    const { base, quote } = selectedPair();
    const days = Number(new FormData(historyForm).get('period'));
    const points = await fetchHistory({ base, quote, ...periodRange(days) });
    const stats = calculateHistoryStatistics(points);
    renderChart(points, base, quote);
    document.querySelector('#history-results-title').textContent = `${base}/${quote} exchange-rate history`;
    document.querySelector('[data-history="latest"]').textContent = `1 ${base} = ${formatRate(stats.latest.rate)} ${quote}`;
    document.querySelector('[data-history="minimum"]').textContent = formatRate(stats.minimum);
    document.querySelector('[data-history="maximum"]').textContent = formatRate(stats.maximum);
    document.querySelector('[data-history="average"]').textContent = formatRate(stats.average);
    document.querySelector('#history-range-date').textContent = `Latest available data in this period: ${stats.latest.date}.`;
    historyResults.hidden = false;
    historyResults.focus({ preventScroll: true });
    setStatus(historyStatus, `${points.length} dated reference rates loaded.`, 'success');
    trackSiteEvent('exchange_rate_history_used', { period_days: days });
  } catch (error) {
    setStatus(historyStatus, error instanceof RangeError ? error.message : 'Historical rates could not be loaded. Check your connection and try again.', 'error');
  } finally {
    submit.disabled = false;
    submit.textContent = 'Show exchange-rate history';
  }
});

dateForm.addEventListener('submit', async event => {
  event.preventDefault();
  dateResults.hidden = true;
  const submit = dateForm.querySelector('button[type="submit"]');
  const date = dateInput.value;
  if (!date || date > today) {
    setStatus(dateStatus, 'Choose a valid date that is not in the future.', 'error');
    return;
  }
  submit.disabled = true;
  submit.textContent = 'Looking up rate…';
  setStatus(dateStatus, 'Fetching the historical reference rate…', 'loading');
  try {
    await ensureCurrencies();
    const { base, quote } = selectedPair();
    const point = await fetchHistoricalDate({ base, quote, date });
    document.querySelector('[data-date-result="rate"]').textContent = `1 ${base} = ${formatRate(point.rate)} ${quote}`;
    document.querySelector('[data-date-result="date"]').textContent = point.date;
    document.querySelector('#historical-date-note').textContent = point.date === date
      ? `The API returned reference data dated ${point.date}.`
      : `You selected ${date}; the nearest available published data returned by the API is dated ${point.date}.`;
    dateResults.hidden = false;
    dateResults.focus({ preventScroll: true });
    setStatus(dateStatus, 'Historical reference rate loaded.', 'success');
    trackSiteEvent('historical_date_lookup_used');
  } catch (error) {
    setStatus(dateStatus, error instanceof RangeError ? error.message : 'No historical rate could be loaded for that date and pair.', 'error');
  } finally {
    submit.disabled = false;
    submit.textContent = 'Look up historical rate';
  }
});

document.querySelector('.history-play-cta')?.addEventListener('click', () => trackSiteEvent('exchange_history_play_cta_clicked'));
