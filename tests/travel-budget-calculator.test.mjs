import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { calculateTravelBudget } from '../travel-budget-calculator/calculator-core.mjs';

const root = path.resolve(import.meta.dirname, '..');
const base = {
  days: 1, accommodationPerDay: 50, foodPerDay: 20, transportPerDay: 10,
  activitiesPerDay: 20, fixedCosts: 0, bufferPercent: 0,
  destinationCurrency: 'RSD', homeCurrency: 'EUR', destinationRate: 2, homeRate: 1
};

test('calculates one-day and multi-day budgets with an independently checked formula', () => {
  const oneDay = calculateTravelBudget(base);
  assert.equal(oneDay.dailyBudget, 100);
  assert.equal(oneDay.tripTotal, 100);
  assert.equal(oneDay.finalDestinationBudget, 100);
  assert.equal(oneDay.referenceRate, 0.5);
  assert.equal(oneDay.finalHomeBudget, 50);

  const trip = calculateTravelBudget({ ...base, days: 5, fixedCosts: 100, bufferPercent: 10 });
  assert.deepEqual(trip.categories, { accommodation: 250, food: 100, transport: 50, activities: 100, fixed: 100 });
  assert.equal(trip.tripTotal, 600);
  assert.equal(trip.bufferAmount, 60);
  assert.equal(trip.finalDestinationBudget, 660);
  assert.equal(trip.finalHomeBudget, 330);
});

test('supports zero optional categories but rejects invalid budgets', () => {
  const fixedOnly = calculateTravelBudget({ ...base, accommodationPerDay: 0, foodPerDay: 0, transportPerDay: 0, activitiesPerDay: 0, fixedCosts: 40 });
  assert.equal(fixedOnly.tripTotal, 40);
  assert.throws(() => calculateTravelBudget({ ...base, days: 0 }), /greater than zero/);
  assert.throws(() => calculateTravelBudget({ ...base, days: 1.5 }), /whole number/);
  assert.throws(() => calculateTravelBudget({ ...base, accommodationPerDay: -1 }), /cannot be negative/);
  assert.throws(() => calculateTravelBudget({ ...base, accommodationPerDay: 0, foodPerDay: 0, transportPerDay: 0, activitiesPerDay: 0 }), /at least one/);
  assert.throws(() => calculateTravelBudget({ ...base, homeCurrency: 'RSD' }), /different currencies/);
});

test('page is indexable, distinct, linked, and privacy-aware', async () => {
  const [page, script, home, sitemap] = await Promise.all([
    fs.readFile(path.join(root, 'travel-budget-calculator/index.html'), 'utf8'),
    fs.readFile(path.join(root, 'travel-budget-calculator/calculator.js'), 'utf8'),
    fs.readFile(path.join(root, 'index.html'), 'utf8'),
    fs.readFile(path.join(root, 'sitemap.xml'), 'utf8')
  ]);
  assert.match(page, /<title>Travel Budget Calculator in Two Currencies \| Balkan Converter<\/title>/);
  assert.match(page, /rel="canonical" href="https:\/\/balkanconverter\.com\/travel-budget-calculator\/"/);
  assert.equal((page.match(/<h1\b/g) || []).length, 1);
  for (const href of ['/multi-currency-converter/', '/currency-converter/', '/offline-currency-converter/']) assert.match(page, new RegExp(`href="${href}"`));
  assert.match(home, /href="\/travel-budget-calculator\/"/);
  assert.match(sitemap, /<loc>https:\/\/balkanconverter\.com\/travel-budget-calculator\/<\/loc>/);
  assert.match(page, /Travel Board and Saved Sets/);
  for (const event of ['travel_budget_calculator_used', 'travel_budget_play_cta_clicked']) assert.match(script, new RegExp(`trackSiteEvent\\('${event}'\\)`));
  assert.doesNotMatch(script, /trackSiteEvent\('(?:travel_budget_calculator_used|travel_budget_play_cta_clicked)'\s*,/);
});

test('network failure remains visible and retryable', async () => {
  const script = await fs.readFile(path.join(root, 'travel-budget-calculator/calculator.js'), 'utf8');
  assert.match(script, /Rates could not be loaded\. Check your connection and try again\./);
  assert.match(script, /rateData = undefined/);
});
