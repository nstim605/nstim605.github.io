import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const tools = [
  ['currency-converter', 'Konverter valuta'],
  ['exchange-rate-markup-calculator', 'Kalkulator razlike kursa'],
  ['multi-currency-converter', 'Viševalutni konverter'],
  ['offline-currency-converter', 'Konverter valuta bez interneta'],
  ['exchange-rate-history', 'Historija kursa i valutni grafikon'],
  ['currency-converter-widget', 'Widget konvertera valuta za Android'],
  ['foreign-transaction-fee-calculator', 'Kalkulator naknada i DCC-a'],
  ['travel-budget-calculator', 'Kalkulator budžeta putovanja']
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
    .sort((a, b) => a.localeCompare(b, 'bs'));
}

const sections = [];
for (const [slug, heading] of tools) {
  const html = await fs.readFile(path.join(root, 'bs', slug, 'index.html'), 'utf8');
  const title = decode(html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '');
  const description = decode(html.match(/<meta name="description" content="([^"]*)">/)?.[1] ?? '');
  const visible = mainLines(html);
  const dynamic = dynamicMessages(html, visible);
  sections.push(`## ${heading}\n\nURL: \`/bs/${slug}/\`\n\nTitle: ${title}\n\nMeta description: ${description}\n\n### Cjelovit vidljivi tekst glavnog sadržaja\n\n\`\`\`text\n${visible}\n\`\`\`\n\n### Dodatne dinamičke poruke\n\n${dynamic.length ? dynamic.map(value => `- ${value}`).join('\n') : '- Na ovoj stranici nema dodatnih dinamičkih poruka.'}`);
}

const document = `# Bosnian web tools — jezička i urednička provjera

Datum lokalne provjere: 11. septembar 2026.

Status: **LANGUAGE QA PASS** za bosansku lokalizaciju svih osam web-alata. Ostale lokalizacije u ovom zadatku nisu mijenjane niti ponovo ocjenjivane.

## Izvor problema i rješenje

Prethodna verzija koristila je neujednačen mašinski preveden katalog. U njemu su se miješali izrazi „stopa”, „tečaj”, „kurs”, „bafer”, „međuspremnik”, hrvatski i srpski oblici te pojedini engleski ostaci. Bosanski alati sada koriste zaseban, kontekstno pregledan rječnik. Rečenice s linkovima sastavljaju se kao cjelovite poruke s imenovanim mjestima za linkove.

## Usvojena terminologija i ponašanje

- Exchange/reference rate: „kurs” / „referentni kurs”.
- Markup: razlika ponuđenog iznosa u odnosu na referentni rezultat; pozitivan procenat znači da je ponuđeni iznos manji, a negativan da je veći.
- Offline: jedna zajednička, ažurirana predmemorija; uspješan zahtjev zamjenjuje starije podatke, a greška ne briše prethodnu ispravnu kopiju.
- Widget: prikazuje sačuvani kurs, stanje podataka i datum kursa; otvara odabrani par; širi prikaz omogućava zamjenu valuta.
- Fiksna naknada kartice/bankomata: unosi se u valuti kartice i dodaje samo procjeni plaćanja u lokalnoj valuti.
- DCC: uneseni konačni iznos ponude poredi se kao zasebna cjelina; fiksna naknada ne dodaje mu se automatski.
- Travel Budget: „rezerva” označava neobavezni procenat za nepredviđene troškove.

${sections.join('\n\n')}

## Izračun i tehnički QA

- Formula razlike nije mijenjana: uz referentni rezultat 100 i ponudu 95 rezultat je +5%; uz ponudu 105 rezultat je −5%.
- Bosanski unos s razmakom za grupisanje hiljada i decimalnim zarezom provjeren je u browser QA-u.
- Browser QA obuhvata svih 8 stranica na širinama 320, 390 i 1440 px, interaktivna stanja alata, mrežnu grešku i učitavanje značke Google Playa. Detaljan rezultat: \`artifacts/bosnian-localization-review/browser-qa.json\`.

## Neriješena pitanja

Nema. Promjene su ograničene na lokalni commit; push i deployment nisu izvršeni.
`;

await fs.writeFile(path.join(root, 'BOSNIAN_TOOL_LOCALIZATION_REVIEW.md'), document);
console.log('Generated BOSNIAN_TOOL_LOCALIZATION_REVIEW.md');
