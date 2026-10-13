import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const expectedIcons = ['converter', 'scanner', 'travel', 'offline'];

test('all localized homepages use the four semantic feature icons', async () => {
  const manifest = JSON.parse(await fs.readFile(path.join(root, 'site-locales.json'), 'utf8'));

  for (const locale of manifest.locales) {
    const homePath = new URL(locale.url, 'https://balkanconverter.com').pathname;
    const file = homePath === '/' ? path.join(root, 'index.html') : path.join(root, homePath.slice(1), 'index.html');
    const html = await fs.readFile(file, 'utf8');
    const icons = [...html.matchAll(/<span class="feature-mark" data-feature-icon="([^"]+)"[^>]*><svg\b[\s\S]*?<\/svg><\/span>/g)]
      .map(match => match[1]);

    assert.deepEqual(icons, expectedIcons, `${locale.webLocale}: semantic feature icons`);
    assert.doesNotMatch(html, /<span class="feature-mark" aria-hidden="true">(?:↔|⌁|≡|↓)<\/span>/, `${locale.webLocale}: no legacy glyphs`);
  }
});

test('feature icon SVGs inherit the existing theme color and sizing', async () => {
  const styles = await fs.readFile(path.join(root, 'styles.css'), 'utf8');
  assert.match(styles, /\.feature-mark svg\s*\{[^}]*width:\s*22px;[^}]*height:\s*22px;[^}]*fill:\s*none;[^}]*stroke:\s*currentColor;/);
});
