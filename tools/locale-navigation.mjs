// Locale IDs and HTML lang values use BCP 47. Google Search's hreflang region
// support is narrower: https://developers.google.com/search/docs/specialty/international/localized-versions#language-codes
// Keep es-419 URLs, locale IDs and ordinary language links unchanged.
export function searchHreflang(locale) {
  return locale === 'es-419' ? 'es' : locale;
}

export const skipLinkCopy = Object.freeze({
  en: 'Skip to content',
  sr: 'Пређи на садржај',
  bs: 'Pređi na sadržaj',
  hr: 'Prijeđi na sadržaj',
  sq: 'Kalo te përmbajtja',
  mk: 'Премини на содржината',
  bg: 'Преминете към съдържанието',
  ro: 'Sari la conținut',
  hu: 'Ugrás a tartalomhoz',
  pl: 'Przejdź do treści',
  cs: 'Přejít k obsahu',
  sk: 'Prejsť na obsah',
  sl: 'Preskoči na vsebino',
  de: 'Zum Inhalt springen',
  fr: 'Aller au contenu',
  it: 'Vai al contenuto',
  'es-ES': 'Saltar al contenido',
  'es-419': 'Saltar al contenido',
  'pt-BR': 'Ir para o conteúdo',
  'pt-PT': 'Saltar para o conteúdo',
  nl: 'Naar inhoud',
  da: 'Spring til indhold',
  sv: 'Hoppa till innehållet',
  nb: 'Hopp til innhold',
  fi: 'Siirry sisältöön',
  is: 'Fara í efni',
  el: 'Μετάβαση στο περιεχόμενο',
  tr: 'İçeriğe geç',
  ru: 'Перейти к содержанию',
  uk: 'Перейти до вмісту',
  ar: 'الانتقال إلى المحتوى',
  he: 'דילוג לתוכן',
  fa: 'رفتن به محتوا',
  ur: 'مواد پر جائیں',
  hi: 'मुख्य सामग्री पर जाएँ',
  bn: 'মূল বিষয়বস্তুতে যান',
  id: 'Lewati ke konten',
  ms: 'Langkau ke kandungan',
  th: 'ข้ามไปยังเนื้อหา',
  vi: 'Chuyển đến nội dung',
  'zh-Hans': '跳至内容',
  'zh-Hant': '跳至內容',
  ja: '本文へスキップ',
  ko: '본문으로 건너뛰기'
});

export function skipLinkLabel(locale) {
  const label = skipLinkCopy[locale];
  if (!label) throw new Error(`Missing skip-navigation copy for ${locale}`);
  return label;
}

export function updateSearchAlternates(markup) {
  return markup.replace(/<(?:xhtml:)?link\b[^>]*>/gi, tag => {
    if (!/\brel\s*=\s*(["'])alternate\1/i.test(tag)) return tag;
    return tag.replace(/(\bhreflang\s*=\s*)(["'])es-419\2/gi, '$1$2es$2');
  });
}

// Only generic navigation links use this copy. Keep the tools' more specific
// "Skip to calculator/converter/guide" labels in their existing translations.
export function updateGenericSkipLink(html, locale) {
  const label = skipLinkLabel(locale);
  let count = 0;
  const result = html.replace(/(<a\b[^>]*\bclass=(["'])[^"']*\bskip-link\b[^"']*\2[^>]*>)[\s\S]*?(<\/a>)/gi,
    (_, opening, quote, closing) => {
      if (!/\bhref=(["'])#main\1/.test(opening)) throw new Error(`${locale}: unexpected skip-link target`);
      count += 1;
      return `${opening}${label}${closing}`;
    });
  if (count !== 1) throw new Error(`${locale}: expected one generic skip link, found ${count}`);
  return result;
}

export function updateGenericNavigation(html, locale) {
  return updateGenericSkipLink(updateSearchAlternates(html), locale);
}
