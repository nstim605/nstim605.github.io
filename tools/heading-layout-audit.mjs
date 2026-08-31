export function countRenderedLines(rects) {
  const tops = [];
  for (const rect of rects) {
    if (rect.width > 0 && !tops.some(top => Math.abs(top - rect.top) < 2)) tops.push(rect.top);
  }
  return tops.length;
}

// Read actual rendered glyph ranges, not only heading element/scroll widths.
export function auditHeadings(doc) {
  const win = doc.defaultView;
  const locale = doc.documentElement.lang || 'en';
  const segmenter = new Intl.Segmenter(locale, { granularity: 'word' });
  const naturalCharacterWrap = /^(zh|ja|ko|th)(-|$)/.test(locale);
  const canvas = doc.createElement('canvas').getContext('2d');
  const headings = [...doc.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(element => {
    const style = win.getComputedStyle(element);
    const bounds = element.getBoundingClientRect();
    const contentLeft = bounds.left + parseFloat(style.paddingLeft);
    const contentRight = bounds.right - parseFloat(style.paddingRight);
    const available = contentRight - contentLeft;
    const failures = [];
    let longest = { text: '', em: 0 };
    canvas.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const walker = doc.createTreeWalker(element, win.NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const full = doc.createRange();
      full.selectNodeContents(node);
      for (const rect of full.getClientRects()) {
        if (rect.width > 0 && (rect.left < contentLeft - 1 || rect.right > contentRight + 1)) {
          failures.push({ kind: 'glyph-overflow', left: rect.left, right: rect.right });
        }
      }
      for (const word of segmenter.segment(node.textContent)) {
        if (!word.isWordLike) continue;
        const em = canvas.measureText(word.segment).width / parseFloat(style.fontSize);
        if (em > longest.em) longest = { text: word.segment, em };
        const range = doc.createRange();
        range.setStart(node, word.index);
        range.setEnd(node, word.index + word.segment.length);
        const rects = [...range.getClientRects()].filter(rect => rect.width > 0);
        const lines = countRenderedLines(rects);
        if (!naturalCharacterWrap && lines > 1) failures.push({ kind: 'split-word', word: word.segment, lines });
      }
    }
    if (style.overflowWrap !== 'normal' || style.wordBreak === 'break-all') failures.push({ kind: 'unsafe-word-breaking' });
    if (style.textOverflow === 'ellipsis') failures.push({ kind: 'ellipsis' });
    return {
      tag: element.tagName, id: element.id, text: element.textContent.trim(),
      fontSize: parseFloat(style.fontSize), available, longest,
      bounds: { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom },
      failures,
    };
  });
  return {
    locale, viewport: win.innerWidth,
    pageOverflow: doc.documentElement.scrollWidth > doc.documentElement.clientWidth + 1,
    overflowElements: [...doc.querySelectorAll('body *')].flatMap(element => {
      const rect = element.getBoundingClientRect();
      if (rect.width && rect.height && (rect.left < -1 || rect.right > doc.documentElement.clientWidth + 1)) {
        return [{ tag: element.tagName, className: element.getAttribute('class'), text: element.textContent.trim().slice(0,120), left: rect.left, right: rect.right }];
      }
      return [];
    }),
    headings, failures: headings.flatMap(h => h.failures.map(f => ({ heading: h.text, ...f }))),
  };
}
