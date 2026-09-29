import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const stories = JSON.parse(await fs.readFile(path.join(root, 'news/data/stories.json'), 'utf8')).stories;

test('news indexes are static, localized, filterable, and linked from supported homepages', async () => {
  const [en, sr, ru, script, css, enHome, srHome, ruHome] = await Promise.all([
    fs.readFile(path.join(root, 'news/index.html'), 'utf8'),
    fs.readFile(path.join(root, 'sr/news/index.html'), 'utf8'),
    fs.readFile(path.join(root, 'ru/news/index.html'), 'utf8'),
    fs.readFile(path.join(root, 'news/news.js'), 'utf8'),
    fs.readFile(path.join(root, 'news/news.css'), 'utf8'),
    fs.readFile(path.join(root, 'index.html'), 'utf8'),
    fs.readFile(path.join(root, 'sr/index.html'), 'utf8'),
    fs.readFile(path.join(root, 'ru/index.html'), 'utf8')
  ]);
  for (const [page, locale, canonical] of [[en, 'en', '/news/'], [sr, 'sr', '/sr/news/'], [ru, 'ru', '/ru/news/']]) {
    assert.match(page, new RegExp(`<html lang="${locale}"`));
    assert.match(page, new RegExp(`rel="canonical" href="https://balkanconverter\\.com${canonical}"`));
    assert.equal((page.match(/<h1\b/g) ?? []).length, 1);
    assert.equal((page.match(/data-news-story/g) ?? []).length, stories.length);
    assert.match(page, /hreflang="en"/);
    assert.match(page, /hreflang="sr"/);
    assert.match(page, /hreflang="ru"/);
    assert.match(page, /"@type": "CollectionPage"/);
  }
  assert.match(script, /URLSearchParams/);
  assert.match(script, /aria-pressed/);
  assert.match(css, /@media \(max-width: 540px\)/);
  assert.match(css, /grid-template-columns: 1fr/);
  assert.match(enHome, /href="\/news\/">News</);
  assert.match(srHome, /href="\/sr\/news\/">Вести</);
  assert.match(ruHome, /href="\/ru\/news\/">Новости</);
});

test('every approved story has three crawlable equivalents with complete article metadata', async () => {
  for (const story of stories) {
    for (const [locale, prefix] of [['en', ''], ['sr', 'sr'], ['ru', 'ru']]) {
      const page = await fs.readFile(path.join(root, prefix, 'news', story.slug, 'index.html'), 'utf8');
      const canonicalPath = `${prefix ? `/${prefix}` : ''}/news/${story.slug}/`;
      assert.match(page, new RegExp(`rel="canonical" href="https://balkanconverter\\.com${canonicalPath}"`));
      assert.match(page, /"@type": "NewsArticle"/);
      assert.match(page, /"datePublished":/);
      assert.match(page, /"dateModified":/);
      assert.match(page, /"mainEntityOfPage":/);
      assert.match(page, /<meta property="og:type" content="article">/);
      assert.match(page, /<meta name="twitter:card" content="summary_large_image">/);
      assert.match(page, new RegExp(`hreflang="${locale}" href="https://balkanconverter\\.com${canonicalPath}"`));
      assert.match(page, /rel="external noopener"/);
      assert.match(page, /currency-converter\/\?source=/);
      assert.doesNotMatch(page, /EUR will rise|USD will fall/i);
    }
  }
});

test('only approved stories enter the general sitemap and automated candidates remain non-indexable', async () => {
  const [sitemap, newsSitemap, inbox, robots] = await Promise.all([
    fs.readFile(path.join(root, 'sitemap.xml'), 'utf8'),
    fs.readFile(path.join(root, 'news-sitemap.xml'), 'utf8'),
    fs.readFile(path.join(root, 'news/data/inbox.json'), 'utf8'),
    fs.readFile(path.join(root, 'robots.txt'), 'utf8')
  ]);
  for (const story of stories) assert.match(sitemap, new RegExp(`/news/${story.slug}/`));
  for (const candidate of JSON.parse(inbox).candidates) assert.doesNotMatch(sitemap, new RegExp(candidate.id));
  assert.match(newsSitemap, /xmlns:news="http:\/\/www\.google\.com\/schemas\/sitemap-news\/0\.9"/);
  assert.match(robots, /Sitemap: https:\/\/balkanconverter\.com\/news-sitemap\.xml/);
});
