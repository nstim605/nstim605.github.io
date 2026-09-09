const spacedScripts = new Set(['en', 'sr', 'bs', 'hr', 'sq', 'mk', 'bg', 'ro', 'hu', 'pl', 'cs', 'sk', 'sl', 'de', 'fr', 'it', 'es-ES', 'es-419', 'pt-BR', 'pt-PT', 'nl', 'da', 'sv', 'nb', 'fi', 'is', 'el', 'tr', 'ru', 'uk', 'ar', 'he', 'fa', 'ur', 'hi', 'bn', 'id', 'ms', 'vi', 'ko']);
const localizedPunctuation = {
  ar: { ',': '،', ';': '؛', '?': '؟' },
  fa: { ',': '،', ';': '؛', '?': '؟' },
  ur: { ',': '،', ';': '؛', '?': '؟' },
  'zh-Hans': { ',': '，', '.': '。', ';': '；', ':': '：', '?': '？', '!': '！' },
  'zh-Hant': { ',': '，', '.': '。', ';': '；', ':': '：', '?': '？', '!': '！' },
  ja: { ',': '、', '.': '。', ';': '；', ':': '：', '?': '？', '!': '！' }
};

export function resolveToolMessages(locale, rawMessages, overrides = {}, replacements = {}) {
  const messages = { ...rawMessages, ...(overrides[locale] ?? {}) };
  return Object.fromEntries(Object.entries(messages).map(([source, rawValue]) => {
    let value = rawValue.trim();
    for (const [from, to] of replacements[locale] ?? []) value = value.replaceAll(from, to);
    value = value.replace(/\s*\|\s*/g, ' | ');
    if (spacedScripts.has(locale) && !value.includes('http')) {
      value = value.replace(/([.!?;:])(?=\p{L})/gu, '$1 ');
    }
    const boundary = source.match(/^([,.;:!?])\s*/u)?.[1];
    if (boundary && !/^[,.;:!?،؛؟，。；：？！、]/u.test(value)) {
      value = `${localizedPunctuation[locale]?.[boundary] ?? boundary}${spacedScripts.has(locale) ? ' ' : ''}${value}`;
    }
    return [source, value];
  }));
}
