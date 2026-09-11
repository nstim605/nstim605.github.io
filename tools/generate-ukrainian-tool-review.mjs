import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const tools = [
  ['currency-converter', 'Конвертер валют'],
  ['exchange-rate-markup-calculator', 'Калькулятор відхилення курсу'],
  ['multi-currency-converter', 'Мультивалютний конвертер'],
  ['offline-currency-converter', 'Конвертер валют без інтернету'],
  ['exchange-rate-history', 'Історія курсу та валютний графік'],
  ['currency-converter-widget', 'Віджет конвертера валют для Android'],
  ['foreign-transaction-fee-calculator', 'Калькулятор комісії та DCC'],
  ['travel-budget-calculator', 'Калькулятор бюджету подорожі']
];

function decode(value) {
  return value.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&nbsp;', ' ');
}

function mainLines(html) {
  const main = html.match(/<main\b[\s\S]*?<\/main>/)?.[0] ?? '';
  return decode(main
    .replace(/<span[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/span>/g, '')
    .replace(/<script\b[\s\S]*?<\/script>/g, '')
    .replace(/<\/(?:h1|h2|h3|p|label|button|dt|dd|figcaption|article|aside|section)>/g, '\n')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .split(/\r?\n/)
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n'));
}

function dynamicMessages(html, visibleText) {
  const payload = html.match(/<script id="tool-i18n" type="application\/json">([\s\S]*?)<\/script>/)?.[1];
  if (!payload) return [];
  return [...new Set(Object.values(JSON.parse(payload)))]
    .filter(value => /[A-Za-zА-Яа-яІіЇїЄєҐґ]/u.test(value) && !visibleText.includes(value))
    .sort((a, b) => a.localeCompare(b, 'uk'));
}

const sections = [];
for (const [slug, heading] of tools) {
  const html = await fs.readFile(path.join(root, 'uk', slug, 'index.html'), 'utf8');
  const title = decode(html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '');
  const description = decode(html.match(/<meta name="description" content="([^"]*)">/)?.[1] ?? '');
  const visible = mainLines(html);
  const dynamic = dynamicMessages(html, visible);
  sections.push(`## ${heading}\n\nURL: \`/uk/${slug}/\`\n\nTitle: ${title}\n\nMeta description: ${description}\n\n### Повний видимий текст основного вмісту\n\n\`\`\`text\n${visible}\n\`\`\`\n\n### Додаткові динамічні повідомлення\n\n${dynamic.length ? dynamic.map(value => `- ${value}`).join('\n') : '- На цій сторінці немає додаткових динамічних повідомлень.'}`);
}

const document = `# Ukrainian web tools — мовна й редакторська перевірка

Дата локальної перевірки: 11 вересня 2026 року.

Статус: **LANGUAGE QA PASS** для української локалізації всіх восьми вебінструментів. Інші локалізації в межах цього завдання не змінювалися й не оцінювалися повторно.

## Джерело проблем і рішення

Попередній каталог містив машинні кальки, русизми, помилкові фінансові терміни на кшталт «ставка», «тариф» і «розмітка», буквальний вислів «домашня валюта», слово «буфер», фрагменти англійською та речення без належних пробілів. Українські інструменти тепер використовують окремий перевірений словник. Речення з посиланнями формуються як цілі повідомлення з іменованими місцями для посилань.

## Узгоджена термінологія та поведінка

- Exchange/reference rate: «курс» / «довідковий курс».
- Markup: різниця запропонованої суми порівняно з результатом за довідковим курсом; додатне значення означає, що запропонована сума менша, а від’ємне — що вона більша.
- Offline: один спільний оновлюваний кеш; успішний запит замінює попередні дані, а помилка не видаляє останню робочу копію.
- Widget: показує кешований курс, стан актуальності та дату курсу; відкриває вибрану пару; у широкому форматі дає змогу поміняти валюти місцями.
- Fixed card/ATM fee: вводиться у валюті картки й додається лише до оцінки оплати в місцевій валюті.
- DCC: повна введена сума пропозиції порівнюється як окремий варіант; фіксована комісія не додається до неї автоматично.
- Travel Budget: «резерв на непередбачені витрати» — необов’язковий відсоток від щоденних і фіксованих витрат.

${sections.join('\n\n')}

## Розрахунки й технічний QA

- Формулу відхилення не змінено: за довідкового результату 100 і пропозиції 95 результат становить +5%; за пропозиції 105 — −5%.
- У browser QA перевірено український формат чисел із пробілом для групування тисяч і десятковою комою.
- Browser QA охоплює всі 8 сторінок на ширинах 320, 390 і 1440 px, інтерактивні стани інструментів, мережеву помилку й завантаження значка Google Play. Детальний результат: \`artifacts/ukrainian-localization-review/browser-qa.json\`.

## Невирішені питання

Немає. Зміни обмежено локальним commit; push і deployment не виконувалися.
`;

await fs.writeFile(path.join(root, 'UKRAINIAN_TOOL_LOCALIZATION_REVIEW.md'), document);
console.log('Generated UKRAINIAN_TOOL_LOCALIZATION_REVIEW.md');
