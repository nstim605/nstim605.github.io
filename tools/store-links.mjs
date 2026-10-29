export const appGalleryUrl = 'https://appgallery.huawei.com/app/C119259363';
export const appGalleryBadge = '/assets/appgallery-badge-en.png';

const playAnchor = /<a\b(?=[^>]*\bhref="https:\/\/play\.google\.com\/store\/apps\/details\?id=io\.github\.nstim605\.balkanconverter")[^>]*>[\s\S]*?<\/a>/g;

/** Add the second store without regenerating approved localized page copy. */
export function ensureStoreLinks(html) {
  const eol = html.includes('\r\n') ? '\r\n' : '\n';
  html = html.replace(/(<link\b[^>]*\bhref=")([^"?#]*\bstyles\.css)(?:\?[^"#]*)?("[^>]*>)/g,
    '$1$2?v=20261029-appgallery$3');
  html = html.replace(playAnchor, (anchor, offset, source) => {
    if (!/<img\b[^>]*\bsrc="[^"]*google-play-badge-en\.png"/.test(anchor)) return anchor;
    const before = source.slice(0, offset);
    if (/<div\b[^>]*\bclass="[^"]*\bstore-links\b[^"]*"[^>]*>\s*$/.test(before)) return anchor;
    const small = /\bplay-link-small\b/.test(anchor);
    const onDark = /\bplay-link-on-dark\b/.test(anchor);
    const label = (anchor.match(/\baria-label="([^"]*)"/)?.[1]
      ?? anchor.match(/\balt="([^"]*)"/)?.[1]
      ?? 'BALCO Converter — Google Play').replaceAll('Google Play', 'AppGallery');
    const currentLine = before.slice(before.lastIndexOf('\n') + 1);
    const indent = /^\s*$/.test(currentLine) ? currentLine : '';
    const classes = `play-link appgallery-link${small ? ' play-link-small' : ''}${onDark ? ' play-link-on-dark' : ''}`;
    const badge = `<a class="${classes}" href="${appGalleryUrl}" aria-label="${label}"><img src="${appGalleryBadge}" width="${small ? 160 : 200}" height="${small ? 48 : 60}" alt="Explore it on AppGallery"></a>`;
    return `<div class="store-links${small ? ' store-links-small' : ''}">${eol}${indent}  ${anchor}${eol}${indent}  ${badge}${eol}${indent}</div>`;
  });

  // A localized template may already contain the pair. Derive the accessible
  // name from its translated Google action rather than retaining English copy.
  html = html.replace(/<div\b[^>]*\bclass="[^"]*\bstore-links\b[^"]*"[^>]*>[\s\S]*?<\/div>/g, pair => {
    const google = pair.match(playAnchor)?.[0];
    if (!google) return pair;
    const label = (google.match(/\baria-label="([^"]*)"/)?.[1]
      ?? google.match(/\balt="([^"]*)"/)?.[1]
      ?? 'BALCO Converter — Google Play').replaceAll('Google Play', 'AppGallery');
    return pair.replace(/<a\b[^>]*\bclass="[^"]*\bappgallery-link\b[^"]*"[^>]*>[\s\S]*?<\/a>/g, anchor => {
      const small = /\bplay-link-small\b/.test(anchor);
      return anchor.replace(/\baria-label="[^"]*"/, `aria-label="${label}"`)
        .replace(/<img\b[^>]*>/, `<img src="${appGalleryBadge}" width="${small ? 160 : 200}" height="${small ? 48 : 60}" alt="Explore it on AppGallery">`);
    });
  });

  // Only the download CTA changes; legal and analytics references stay intact.
  html = html.replace(/<section\b[^>]*\bclass="[^"]*\bcta-section\b[^"]*"[^>]*>[\s\S]*?<\/section>/g,
    section => section.replace(/<p\b[^>]*>[\s\S]*?<\/p>/g,
      paragraph => paragraph.includes('AppGallery') ? paragraph : paragraph.replaceAll('Google Play', 'Google Play / AppGallery')));

  html = html.replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/g, footer => {
    const separator = /<nav\b/.test(footer) ? ' ' : ' · ';
    if (footer.includes(appGalleryUrl)) {
      return footer.replaceAll(`</a><a href="${appGalleryUrl}"`, `</a>${separator}<a href="${appGalleryUrl}"`);
    }
    return footer.replace(playAnchor, anchor => /<img\b/.test(anchor) ? anchor
      : `${anchor}${separator}<a href="${appGalleryUrl}" aria-label="BALCO Converter — AppGallery">AppGallery</a>`);
  });
  return html;
}
