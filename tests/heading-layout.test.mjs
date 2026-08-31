import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { countRenderedLines } from '../tools/heading-layout-audit.mjs';

const root = path.resolve(import.meta.dirname, '..');
const css = await fs.readFile(path.join(root, 'styles.css'), 'utf8');

test('headings wrap at word boundaries without ellipsis or automatic hyphenation', () => {
  const rule = css.match(/h1, h2, h3\s*\{([^}]+)\}/)?.[1];
  assert.ok(rule);
  assert.match(rule, /overflow-wrap:\s*normal/);
  assert.match(rule, /word-break:\s*normal/);
  assert.match(rule, /hyphens:\s*none/);
  assert.doesNotMatch(rule, /break-word|break-all|anywhere|ellipsis|nowrap/);
  assert.match(css, /p\s*\{\s*overflow-wrap:\s*break-word/);
});

test('heading caps use actual text columns at all breakpoints', () => {
  assert.match(css, /\.hero-copy, \.section-heading > div, \.about-copy, \.feature-card,[\s\S]*?container-type:\s*inline-size/);
  for (const cap of ['13cqi', '10cqi', '9cqi', '9.1cqi', '8.2cqi']) assert.ok(css.includes(cap));
  assert.match(css, /grid-template-columns:\s*minmax\(0, 1fr\) 380px/);
  assert.match(css, /h1\s*\{\s*--heading-size:\s*clamp\(2.65rem/);
  assert.match(css, /h2\s*\{\s*--heading-size:\s*clamp\(1.95rem/);
  assert.doesNotMatch(css, /:lang\(|\[lang[\s=|]/);
});

test('word ranges distinguish a real second line from bidi fragments and subpixel rounding', () => {
  assert.equal(countRenderedLines([{ top: 12, width: 100 }, { top: 12.4, width: 30 }]), 1);
  assert.equal(countRenderedLines([{ top: 12, width: 100 }, { top: 44, width: 12 }]), 2);
  assert.equal(countRenderedLines([{ top: 12, width: 100 }, { top: 44, width: 0 }]), 1);
});

test('rendered regression runner derives all locales and checks both real page types', async () => {
  const runner = await fs.readFile(path.join(root, 'tools/check-heading-layout.html'), 'utf8');
  const audit = await fs.readFile(path.join(root, 'tools/heading-layout-audit.mjs'), 'utf8');
  assert.match(runner, /fetch\('\.\.\/site-locales\.json'\)/);
  assert.match(runner, /\[l.url, l.privacyUrl\]/);
  assert.ok(runner.includes('320,360,390,540,768,980,1440'));
  assert.ok(runner.includes('value="1,1.25"'));
  assert.match(runner, /doc.fonts.ready/);
  assert.match(audit, /getClientRects\(\)/);
  assert.match(audit, /getBoundingClientRect\(\)/);
  assert.match(audit, /glyph-overflow/);
  assert.match(audit, /split-word/);
});
