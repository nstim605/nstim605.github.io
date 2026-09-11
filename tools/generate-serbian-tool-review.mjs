import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const tools = [
  ['currency-converter', 'Конвертор валута'],
  ['exchange-rate-markup-calculator', 'Калкулатор разлике курса'],
  ['multi-currency-converter', 'Мултивалутни конвертор'],
  ['offline-currency-converter', 'Офлајн конвертор валута'],
  ['exchange-rate-history', 'Историја и графикон курса'],
  ['currency-converter-widget', 'Виџет конвертора валута за Android'],
  ['foreign-transaction-fee-calculator', 'Калкулатор провизија и DCC'],
  ['travel-budget-calculator', 'Калкулатор буџета путовања']
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
  const map = JSON.parse(payload);
  return [...new Set(Object.values(map))]
    .filter(value => /[А-Яа-яЂђЈјЉљЊњЋћЏџ]/u.test(value) && !visibleText.includes(value))
    .sort((a, b) => a.localeCompare(b, 'sr-Cyrl'));
}

const sections = [];
for (const [slug, heading] of tools) {
  const html = await fs.readFile(path.join(root, 'sr', slug, 'index.html'), 'utf8');
  const title = decode(html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '');
  const description = decode(html.match(/<meta name="description" content="([^"]*)">/)?.[1] ?? '');
  const visible = mainLines(html);
  const dynamic = dynamicMessages(html, visible);
  sections.push(`## ${heading}\n\nURL: \`/sr/${slug}/\`\n\nTitle: ${title}\n\nMeta description: ${description}\n\n### Комплетан видљиви текст главног садржаја\n\n\`\`\`text\n${visible}\n\`\`\`\n\n### Додатне динамичке поруке\n\n${dynamic.length ? dynamic.map(value => `- ${value}`).join('\n') : '- На овој страници нема додатних динамичких порука.'}`);
}

const document = `# Serbian web tools — језичка и уредничка провера\n\nДатум локалне провере: 11. септембар 2026.\n\nСтатус: **LANGUAGE QA PASS** за српску ћириличку локализацију свих осам web алата. Остале локализације у овом задатку нису мењане нити поново оцењиване.\n\n## Извор проблема и решење\n\nПретходна верзија је комбиновала машински преведен каталог са глобалним заменама појединачних термина. Зато су се појављивали изрази попут „стопа“, „брзина“, транслитерисани енглески називи и граматички неисправне реченице око линкова. Српски алати сада користе засебан, контекстуално проверен речник. Реченице које садрже линкове састављају се као целе поруке са именованим местима за линкове.\n\n## Усвојена терминологија и понашање\n\n- Exchange/reference rate: „курс“ / „референтни курс“.\n- Markup: разлика понуђеног износа у односу на референтни резултат; позитиван проценат значи да је понуђени износ мањи, негативан да је већи.\n- Offline: један заједнички, ажурирани кеш; успешан захтев замењује старије податке, а грешка не брише претходну исправну копију.\n- Widget: приказује сачувани курс, стање података и датум курса; отвара изабрани пар; шири приказ омогућава замену валута.\n- Fixed card/ATM fee: уноси се у валути картице и додаје само процени плаћања у локалној валути.\n- DCC: унети коначни износ понуде пореди се као засебна целина; фиксна провизија му се не додаје аутоматски.\n\n${sections.join('\n\n')}\n\n## Прорачун и технички QA\n\n- Формула разлике није мењана: при референтном резултату 100 и понуди 95 резултат је +5%; при понуди 105 резултат је −5%.\n- Српски унос са тачком за хиљаде и децималним зарезом проверен је у browser QA.\n- Browser QA обухвата свих 8 страница на ширинама 320, 390 и 1440 px, интерактивна стања алата, мрежну грешку и учитавање Google Play беџа. Детаљан резултат: \`artifacts/serbian-localization-review/browser-qa.json\`.\n\n## Нерешена питања\n\nНема. Промене су ограничене на локални commit; push и deployment нису извршени.\n`;

const reviewedDocument = document.replace(
  'Српски унос са тачком за хиљаде и децималним зарезом',
  'Српски унос са размаком за груписање хиљада и децималним зарезом'
);
await fs.writeFile(path.join(root, 'SERBIAN_TOOL_LOCALIZATION_REVIEW.md'), reviewedDocument);
console.log('Generated SERBIAN_TOOL_LOCALIZATION_REVIEW.md');
