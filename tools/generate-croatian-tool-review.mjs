import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const tools = [
  ['currency-converter', 'Pretvarač valuta'],
  ['exchange-rate-markup-calculator', 'Kalkulator razlike tečaja'],
  ['multi-currency-converter', 'Viševalutni pretvarač'],
  ['offline-currency-converter', 'Pretvarač valuta bez interneta'],
  ['exchange-rate-history', 'Povijest i grafikon tečaja'],
  ['currency-converter-widget', 'Widget pretvarača valuta za Android'],
  ['foreign-transaction-fee-calculator', 'Kalkulator naknada i DCC-a'],
  ['travel-budget-calculator', 'Kalkulator proračuna putovanja']
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
    .filter(value => /[A-Za-zČĆĐŠŽčćđšž]/u.test(value) && !visibleText.includes(value))
    .sort((a, b) => a.localeCompare(b, 'hr'));
}

const sections = [];
for (const [slug, heading] of tools) {
  const html = await fs.readFile(path.join(root, 'hr', slug, 'index.html'), 'utf8');
  const title = decode(html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '');
  const description = decode(html.match(/<meta name="description" content="([^"]*)">/)?.[1] ?? '');
  const visible = mainLines(html);
  const dynamic = dynamicMessages(html, visible);
  sections.push(`## ${heading}\n\nURL: \`/hr/${slug}/\`\n\nTitle: ${title}\n\nMeta description: ${description}\n\n### Cjelovit vidljivi tekst glavnog sadržaja\n\n\`\`\`text\n${visible}\n\`\`\`\n\n### Dodatne dinamičke poruke\n\n${dynamic.length ? dynamic.map(value => `- ${value}`).join('\n') : '- Na ovoj stranici nema dodatnih dinamičkih poruka.'}`);
}

const document = `# Croatian web tools — jezična i urednička provjera

Datum lokalne provjere: 11. rujna 2026.

Status: **LANGUAGE QA PASS** za hrvatsku lokalizaciju svih osam web-alata. Ostale lokalizacije u ovom zadatku nisu mijenjane ni ponovno ocjenjivane.

## Izvor problema i rješenje

Prethodna verzija kombinirala je strojno prevedeni katalog s globalnim zamjenama pojedinačnih izraza. To je stvaralo kontekstno pogrešne izraze poput „stopa” umjesto „tečaj”, doslovne prijevode i gramatički nepravilne rečenice oko poveznica. Hrvatski alati sada koriste zaseban, kontekstno pregledan rječnik. Rečenice s poveznicama sastavljaju se kao cjelovite poruke s imenovanim mjestima za poveznice.

## Usvojena terminologija i ponašanje

- Exchange/reference rate: „tečaj” / „referentni tečaj”.
- Markup: razlika ponuđenog iznosa u odnosu na referentni rezultat; pozitivan postotak znači da je ponuđeni iznos manji, a negativan da je veći.
- Offline: jedna zajednička, ažurirana predmemorija; uspješan zahtjev zamjenjuje starije podatke, a pogreška ne briše prethodnu ispravnu kopiju.
- Widget: prikazuje spremljeni tečaj, stanje podataka i datum tečaja; otvara odabrani par; prošireni prikaz omogućuje zamjenu valuta.
- Fiksna naknada kartice/bankomata: unosi se u valuti kartice i dodaje samo procjeni plaćanja u lokalnoj valuti.
- DCC: uneseni konačni iznos ponude uspoređuje se kao zasebna cjelina; fiksna naknada ne dodaje mu se automatski.

${sections.join('\n\n')}

## Proračun i tehnički QA

- Formula razlike nije mijenjana: uz referentni rezultat 100 i ponudu 95 rezultat je +5%; uz ponudu 105 rezultat je −5%.
- Hrvatski unos s razmakom za grupiranje tisuća i decimalnim zarezom provjeren je u browser QA-u.
- Browser QA obuhvaća svih 8 stranica na širinama 320, 390 i 1440 px, interaktivna stanja alata, mrežnu pogrešku i učitavanje značke Google Playa. Detaljan rezultat: \`artifacts/croatian-localization-review/browser-qa.json\`.

## Neriješena pitanja

Nema. Promjene su ograničene na lokalni commit; push i deployment nisu izvršeni.
`;

await fs.writeFile(path.join(root, 'CROATIAN_TOOL_LOCALIZATION_REVIEW.md'), document);
console.log('Generated CROATIAN_TOOL_LOCALIZATION_REVIEW.md');
