import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const tools = [
  ['currency-converter', 'Конвертер валют'],
  ['exchange-rate-markup-calculator', 'Калькулятор разницы обменного курса'],
  ['multi-currency-converter', 'Мультивалютный конвертер'],
  ['offline-currency-converter', 'Офлайн-конвертер валют'],
  ['exchange-rate-history', 'История и график валютного курса'],
  ['currency-converter-widget', 'Виджет конвертера валют для Android'],
  ['foreign-transaction-fee-calculator', 'Калькулятор комиссий и DCC'],
  ['travel-budget-calculator', 'Калькулятор бюджета поездки']
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

function dynamicMessages(html, slug, visibleText) {
  const payload = html.match(/<script id="tool-i18n" type="application\/json">([\s\S]*?)<\/script>/)?.[1];
  if (!payload) return [];
  const map = JSON.parse(payload);
  return [...new Set(Object.values(map))]
    .filter(value => /[А-Яа-яЁё]/u.test(value) && !visibleText.includes(value))
    .sort((a, b) => a.localeCompare(b, 'ru'));
}

const sections = [];
for (const [slug, heading] of tools) {
  const html = await fs.readFile(path.join(root, 'ru', slug, 'index.html'), 'utf8');
  const title = decode(html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '');
  const description = decode(html.match(/<meta name="description" content="([^"]*)">/)?.[1] ?? '');
  const visible = mainLines(html);
  const dynamic = dynamicMessages(html, slug, visible);
  sections.push(`## ${heading}\n\nURL: \`/ru/${slug}/\`\n\nTitle: ${title}\n\nMeta description: ${description}\n\n### Полный видимый текст основного содержимого\n\n\`\`\`text\n${visible}\n\`\`\`\n\n### Дополнительные динамические сообщения\n\n${dynamic.length ? dynamic.map(value => `- ${value}`).join('\n') : '- На этой странице нет динамических сообщений.'}`);
}

const document = `# Russian web tools — редакторская проверка\n\nДата локальной проверки: 10 сентября 2026 г.\n\nСтатус: русская локаль полностью отредактирована контекстно. Языковое качество остальных 43 локалей в этой задаче: **NOT REVIEWED**; для них выполнена только техническая проверка генерации, маршрутов, assets и responsive layout.\n\n## Причина дефектов\n\nГенератор переводил текстовые узлы вокруг ссылок независимо, поэтому порядок слов и падежи разрушались. После машинного перевода также выполнялись глобальные терминологические замены, которые не учитывали контекст и превращали «exchange rate» в «ставку», «скорость» или «тариф». Теперь русская локаль использует отдельный проверенный словарь, а предложения со ссылками собираются как цельные rich-text сообщения с именованными слотами. Глобальные русские подстановки удалены.\n\n## Зафиксированная терминология и поведение\n\n- Exchange/reference rate: «курс» / «справочный курс».\n- Markup calculator: сравнение предложенной суммы со справочным результатом; положительный процент означает меньшую предложенную сумму, отрицательный — сумму выше справочного результата.\n- Offline: один общий обновляемый кэш; успешный запрос заменяет старые данные, ошибка не удаляет предыдущую рабочую копию.\n- Widget: показывает сохранённый курс, состояние данных и дату курса; открывает выбранную пару; широкий вариант позволяет поменять валюты местами.\n- Fixed card/ATM fee: вводится в валюте карты и добавляется только к оценке оплаты в местной валюте.\n- DCC: введённая итоговая сумма сравнивается как отдельное полное предложение; фиксированная комиссия к ней автоматически не прибавляется.\n\n${sections.join('\n\n')}\n\n## Скриншоты исправленных блоков\n\n- \`artifacts/russian-localization-review/01-markup-explanation-390.png\`\n- \`artifacts/russian-localization-review/02-offline-cache-390.png\`\n- \`artifacts/russian-localization-review/03-widget-behavior-390.png\`\n- \`artifacts/russian-localization-review/04-foreign-fee-form-390.png\`\n- \`artifacts/russian-localization-review/05-travel-budget-form-390.png\`\n\n## Расчёты и QA\n\n- Формула разницы не изменена: при справочном результате 100 и предложении 95 результат +5%; при предложении 105 — −5%.\n- Русский ввод с пробелом и запятой проверен: \`11 500\` → 11500; \`11,5\` → 11.5.\n- Browser QA: 8 страниц × 320/390/1440 px, интерактивные состояния шести инструментов, сетевой отказ и загрузка Google Play badge. Подробный результат: \`artifacts/russian-localization-review/browser-qa.json\`.\n\n## Нерешённые вопросы\n\nНет. Для публикации потребуется отдельное разрешение: эта задача ограничена локальным commit без push/deploy.\n`;

await fs.writeFile(path.join(root, 'RUSSIAN_TOOL_LOCALIZATION_REVIEW.md'), document);
console.log('Generated RUSSIAN_TOOL_LOCALIZATION_REVIEW.md');
