import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { expectedSitemapUrls, validateSitemapUrlSet } from '../tools/sitemap-validation.mjs';

const root = path.resolve(import.meta.dirname, '..');
const manifest = JSON.parse(await fs.readFile(path.join(root, 'site-locales.json'), 'utf8'));
const sitemap = await fs.readFile(path.join(root, 'sitemap.xml'), 'utf8');

test('current sitemap exactly matches all locale and page routes', () => {
  const result = validateSitemapUrlSet(sitemap, manifest);
  assert.equal(expectedSitemapUrls(manifest).length, 440);
  assert.equal(result.expectedUrls.length, 440);
  assert.equal(result.actualUrls.length, 440);
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test('expected URLs grow from manifest routes without a hardcoded page count', () => {
  const expandedManifest = structuredClone(manifest);
  expandedManifest.locales[0].toolUrls.futureTool = '/future-tool/';
  const urls = expectedSitemapUrls(expandedManifest);
  assert.equal(urls.length, 441);
  assert.ok(urls.includes('https://balkanconverter.com/future-tool/'));
});

test('missing expected sitemap URL fails validation', () => {
  const firstBlock = sitemap.match(/<url>[\s\S]*?<\/url>/)?.[0];
  assert.ok(firstBlock);
  const missingUrl = firstBlock.match(/<loc>([^<]+)<\/loc>/)?.[1];
  assert.ok(missingUrl);
  const result = validateSitemapUrlSet(sitemap.replace(firstBlock, ''), manifest);
  assert.equal(result.ok, false);
  assert.deepEqual(result.missingUrls, [missingUrl]);
  assert.match(result.errors.join('\n'), /Sitemap missing/);
});

test('unexpected sitemap URL fails validation', () => {
  const unexpectedUrl = 'https://balkanconverter.com/unexpected-validator-route/';
  const changed = sitemap.replace('</urlset>', `  <url>\n    <loc>${unexpectedUrl}</loc>\n  </url>\n</urlset>`);
  const result = validateSitemapUrlSet(changed, manifest);
  assert.equal(result.ok, false);
  assert.deepEqual(result.unexpectedUrls, [unexpectedUrl]);
  assert.match(result.errors.join('\n'), /Sitemap contains unexpected URL/);
});

test('duplicate sitemap URL fails validation', () => {
  const firstBlock = sitemap.match(/<url>[\s\S]*?<\/url>/)?.[0];
  assert.ok(firstBlock);
  const duplicateUrl = firstBlock.match(/<loc>([^<]+)<\/loc>/)?.[1];
  assert.ok(duplicateUrl);
  const result = validateSitemapUrlSet(sitemap.replace(firstBlock, `${firstBlock}\n${firstBlock}`), manifest);
  assert.equal(result.ok, false);
  assert.deepEqual(result.duplicateUrls, [duplicateUrl]);
  assert.match(result.errors.join('\n'), /Sitemap contains duplicate URL/);
});
