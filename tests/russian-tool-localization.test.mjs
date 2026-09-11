import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const inventory = JSON.parse(await fs.readFile(path.join(root, 'site-locales.json'), 'utf8'));
const reviewed = JSON.parse(await fs.readFile(path.join(root, 'tools/tool-copy-reviewed-ru.json'), 'utf8'));
const rich = JSON.parse(await fs.readFile(path.join(root, 'tools/tool-rich-copy.json'), 'utf8'));
const replacements = JSON.parse(await fs.readFile(path.join(root, 'tools/tool-terminology-replacements.json'), 'utf8'));
const toolSlugs = [
  'currency-converter', 'exchange-rate-markup-calculator', 'multi-currency-converter',
  'offline-currency-converter', 'exchange-rate-history', 'currency-converter-widget',
  'foreign-transaction-fee-calculator', 'travel-budget-calculator'
];
const legacyBadge = 'https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png';
const playHref = 'https://play.google.com/store/apps/details?id=io.github.nstim605.balkanconverter';

function visibleMain(html) {
  return (html.match(/<main\b[\s\S]*?<\/main>/)?.[0] ?? '')
    .replace(/<script\b[\s\S]*?<\/script>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replace(/\s+/g, ' ')
    .trim();
}

test('Russian reviewed messages preserve every source placeholder', () => {
  const placeholders = value => [...value.matchAll(/\{[A-Za-z][A-Za-z0-9]*\}/g)].map(match => match[0]).sort();
  for (const [source, translation] of Object.entries(reviewed)) {
    assert.ok(translation.trim(), `empty reviewed translation: ${source}`);
    assert.deepEqual(placeholders(translation), placeholders(source), `placeholder mismatch: ${source}`);
  }
  assert.equal(replacements.ru, undefined, 'Russian copy must not use global terminology replacements');
});

test('all Russian tools contain reviewed terminology and no known broken machine copy', async () => {
  const pages = Object.fromEntries(await Promise.all(toolSlugs.map(async slug => [
    slug, await fs.readFile(path.join(root, 'ru', slug, 'index.html'), 'utf8')
  ])));
  const combined = Object.values(pages).map(visibleMain).join('\n');
  for (const broken of [
    'эталонной скорости', 'Загрузка последних тарифов', 'История опорной скорости',
    'Эффективная разметка DCC', 'DCC выше ссылка', 'Домашняя валюта', 'Аварийный буфер',
    'Сумма покупки или вывода', 'производственный виджет', 'Быстрое преобразование ссылок',
    'евро — евро', 'сохраненные оффлайн тарифы'
  ]) assert.doesNotMatch(combined, new RegExp(broken, 'iu'), broken);

  assert.match(pages['exchange-rate-markup-calculator'], /EUR — Евро/);
  assert.match(pages['exchange-rate-markup-calculator'], /placeholder="Например, 11 500"/);
  assert.match(pages['exchange-rate-markup-calculator'], /Разница, % = \(сумма по справочному курсу − предложенная сумма\) ÷ сумма по справочному курсу × 100\./);
  assert.match(pages['exchange-rate-markup-calculator'], /Положительное значение означает/);
  assert.match(pages['foreign-transaction-fee-calculator'], /Комиссия добавляется только к оценке оплаты в местной валюте/);
  assert.match(pages['foreign-transaction-fee-calculator'], /placeholder="Например, 90"/);
  assert.match(pages['foreign-transaction-fee-calculator'], /Комиссия за операцию за границей, %/);
  assert.match(pages['foreign-transaction-fee-calculator'], /Фиксированная комиссия банка или банкомата/);
  assert.match(pages['foreign-transaction-fee-calculator'], /Предложенная сумма с конвертацией DCC/);
  assert.match(pages['foreign-transaction-fee-calculator'], /Что такое конвертация DCC/);
  assert.match(pages['foreign-transaction-fee-calculator'], /Ограничения расчёта/);
  assert.match(pages['offline-currency-converter'], /один общий локальный кэш/);
  assert.match(pages['currency-converter-widget'], /Курс нужной валютной пары — прямо на главном экране/);

  const multiCurrency = pages['multi-currency-converter'];
  assert.match(multiCurrency, /Одна сумма — несколько валют/);
  assert.match(multiCurrency, /Пересчитывайте одну сумму сразу в несколько валют\. Это удобно, когда вы сравниваете цены в разных странах, планируете бюджет в нескольких валютах или собираетесь посетить несколько стран\./);
  assert.match(multiCurrency, /Для расчёта используются справочные курсы\. Курс вашего банка или обменника может отличаться\./);
  assert.doesNotMatch(multiCurrency, /Сравните несколько валют на одном экране/);
  assert.doesNotMatch(multiCurrency, /Такой расчёт удобен для поездок по нескольким странам/);
  assert.doesNotMatch(multiCurrency, /Курсы являются справочными значениями и могут отличаться от курса/);
});

test('Russian rich messages are complete sentences and retain locale-specific tool links', async () => {
  const expectedIds = new Set(Object.keys(rich.ru));
  const foundIds = new Set();
  for (const slug of toolSlugs) {
    const html = await fs.readFile(path.join(root, 'ru', slug, 'index.html'), 'utf8');
    for (const match of html.matchAll(/<p[^>]*data-i18n-rich="([^"]+)"[^>]*>([\s\S]*?)<\/p>/g)) {
      foundIds.add(match[1]);
      assert.doesNotMatch(match[2], /(?:Explore|Use the|For one quick pair|learn how)/);
      for (const href of [...match[2].matchAll(/href="([^"]+)"/g)].map(item => item[1])) {
        assert.match(href, /^\/ru\/(?:currency-converter|exchange-rate-markup-calculator|multi-currency-converter|offline-currency-converter|exchange-rate-history|currency-converter-widget|foreign-transaction-fee-calculator|travel-budget-calculator)\/$/);
      }
    }
  }
  assert.deepEqual(foundIds, expectedIds);
});

test('official local Google Play badge is used by all 440 active locale pages', async () => {
  const badge = await fs.readFile(path.join(root, 'assets/google-play-badge-en.png'));
  assert.deepEqual([...badge.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(badge.readUInt32BE(16), 478);
  assert.equal(badge.readUInt32BE(20), 142);
  let checked = 0;
  for (const locale of inventory.locales) {
    const route = locale.url === '/' ? '' : locale.url.slice(1, -1);
    for (const relative of ['index.html', 'privacy-policy.html', ...toolSlugs.map(slug => `${slug}/index.html`)]) {
      const html = await fs.readFile(path.join(root, route, relative), 'utf8');
      assert.doesNotMatch(html, new RegExp(legacyBadge.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      assert.match(html, /src="\/assets\/google-play-badge-en\.png"/);
      assert.match(html, new RegExp(playHref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      checked += 1;
    }
  }
  assert.equal(checked, 440);
});
