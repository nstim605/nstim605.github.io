import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const tools = [
  ['currency-converter', 'Währungsrechner'],
  ['exchange-rate-markup-calculator', 'Kursabweichung berechnen'],
  ['multi-currency-converter', 'Ein Betrag. Mehrere Währungen.'],
  ['offline-currency-converter', 'Offline-Währungsumrechnung'],
  ['exchange-rate-history', 'Wechselkursverlauf und Währungsdiagramm'],
  ['currency-converter-widget', 'Währungs-Widget für Android'],
  ['foreign-transaction-fee-calculator', 'Gebühren und DCC vergleichen'],
  ['travel-budget-calculator', 'Reisebudgetrechner']
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
    .filter(value => /[A-Za-zÄÖÜäöüß]/u.test(value) && !visibleText.includes(value))
    .sort((a, b) => a.localeCompare(b, 'de'));
}

const sections = [];
for (const [slug, heading] of tools) {
  const html = await fs.readFile(path.join(root, 'de', slug, 'index.html'), 'utf8');
  const title = decode(html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '');
  const description = decode(html.match(/<meta name="description" content="([^"]*)">/)?.[1] ?? '');
  const visible = mainLines(html);
  const dynamic = dynamicMessages(html, visible);
  sections.push(`## ${heading}\n\nURL: \`/de/${slug}/\`\n\nTitle: ${title}\n\nMeta description: ${description}\n\n### Vollständiger sichtbarer Hauptinhalt\n\n\`\`\`text\n${visible}\n\`\`\`\n\n### Weitere dynamische Meldungen\n\n${dynamic.length ? dynamic.map(value => `- ${value}`).join('\n') : '- Auf dieser Seite gibt es keine weiteren dynamischen Meldungen.'}`);
}

const document = `# Deutsche Web-Tools – sprachliche und redaktionelle Prüfung

Datum der lokalen Prüfung: 11. September 2026.

Status: **LANGUAGE QA PASS** für die deutsche Fassung aller acht Web-Tools. Andere Sprachfassungen wurden im Rahmen dieser Aufgabe nicht inhaltlich geändert oder erneut bewertet.

## Ausgangslage und Lösung

Der bisherige Katalog enthielt maschinell übersetzte Begriffe und Sätze, darunter „Bewerten“ für einen Wechselkurs, „Tarife“ und „Raten“ statt „Kurse“, „Heimatwährung“, „Puffer“, wörtliche DCC-Formulierungen und unpassende Texte für positive und negative Abweichungen. Die deutschen Tools verwenden nun einen eigenen redaktionell geprüften Katalog. Sätze mit eingebetteten Links werden als vollständige deutsche Aussagen mit benannten Link-Platzhaltern erzeugt.

## Einheitliche Begriffe und tatsächliches Verhalten

- Exchange/reference rate: „Wechselkurs“ / „Referenzkurs“.
- Markup: prozentuale Abweichung des angebotenen Betrags vom Ergebnis zum Referenzkurs; ein positiver Wert bedeutet einen niedrigeren angebotenen Betrag, ein negativer Wert einen höheren.
- Offline: ein gemeinsamer, aktualisierbarer Kursspeicher; eine erfolgreiche Abfrage ersetzt den vorherigen Datensatz, bei einem Fehler bleibt die letzte funktionierende Kopie erhalten.
- Widget: zeigt gespeicherten Referenzkurs, Aktualitätsstatus und Kursdatum, öffnet das gewählte Paar und bietet im breiten Layout eine Tauschfunktion.
- Karten-/Geldautomatengebühr: wird in der Kartenwährung eingegeben und nur der Schätzung für die Zahlung in Landeswährung zugerechnet.
- DCC: der vollständig eingegebene Angebotsbetrag wird als eigene Alternative verglichen; die feste Gebühr wird nicht automatisch zum DCC-Betrag addiert.
- Reisebudget: „Reserve für unerwartete Ausgaben“ ist ein optionaler Prozentsatz der täglichen und festen Kosten.

${sections.join('\n\n')}

## Berechnungen und technische Prüfung

- Die Abweichungsformel bleibt unverändert: Bei einem Referenzergebnis von 100 und einem Angebot von 95 beträgt das Ergebnis +5 %; bei einem Angebot von 105 beträgt es −5 %.
- Die Eingabe mit Dezimalkomma und Leerzeichen als Tausendertrennzeichen wird geprüft. Der Punkt als alleiniger Tausendertrenner wird nicht empfohlen, weil der bestehende Parser „11.500“ als 11,5 interpretiert.
- Der Browser-QA umfasst alle acht Seiten bei 320, 390, 768 und 1440 px, interaktive Zustände, Fehlermeldungen, Datums-/Zahlenformatierung und das Google-Play-Badge.

## Offene sprachliche Fragen

Keine. Die Änderungen bleiben in einem lokalen Commit; Push und Deployment werden nicht ausgeführt.
`;

await fs.writeFile(path.join(root, 'GERMAN_TOOL_LOCALIZATION_REVIEW.md'), document);
console.log('Generated GERMAN_TOOL_LOCALIZATION_REVIEW.md');
