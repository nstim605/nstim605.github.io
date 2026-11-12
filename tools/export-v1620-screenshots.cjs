/* Export approved native-app marketing cards; never writes to frozen store artwork. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const SITE = path.resolve(__dirname, '..');
const ROOT = path.resolve(SITE, '..');
const ART = path.join(ROOT, 'artifacts/store-screenshots-2026-11-11/artwork');
const OUT = path.join(SITE, 'assets/screenshots/v1-620');
const sharp = require(path.join(ROOT, 'artifacts/marketing/pro-store-refresh-2026-10-06/sources/design/node_modules/sharp'));
sharp.concurrency(2);
sharp.cache({memory: 64});
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const relative = file => path.relative(ROOT, file).replaceAll('\\', '/');
const argument = name => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const sourceManifestPath = path.join(ART, 'google-final-upload.json');
const cataloguePath = path.join(ART, 'catalog.json');
const sourceManifestSha = 'aad85d89844a84e6d2d9dc919978c89cf90b02107840cbb0054fa034162a4ccb';
const catalogueSha = '460beb6851d09a3f2dca69eb340b07743f5d2a9aec664f6a8838665f77cb5b6a';
if (sha(fs.readFileSync(sourceManifestPath)) !== sourceManifestSha) throw Error('Frozen Google source manifest changed');
if (sha(fs.readFileSync(cataloguePath)) !== catalogueSha) throw Error('Frozen caption catalogue changed');
const sourceManifest = read(sourceManifestPath);
const catalogue = read(cataloguePath);
const inventoryPath = path.join(SITE, 'site-locales.json');
const inventory = read(inventoryPath);
if (inventory.locales.length !== 44) throw Error('Expected the reviewed 44-language website inventory');
const sources = new Map(Object.entries(sourceManifest.locales).map(([storeLocale, value]) => [value.appLocale, {...value, storeLocale}]));
const bosnianManifestPath = argument('bs-manifest');
// The optional Bosnian supplement has the same appLocale/phoneScreenshots row
// shape as the frozen Google listing. It is generated outside frozen artwork.
if (bosnianManifestPath) {
  const supplement = read(path.resolve(bosnianManifestPath));
  if (supplement.appLocale !== 'bs' || supplement.complete !== true || supplement.phoneScreenshots.length !== 8) throw Error('Incomplete Bosnian artwork supplement');
  sources.set('bs', {...supplement, storeLocale: null});
}
const encoding = {format: 'webp', quality: 90, effort: 6, smartSubsample: true, resizeKernel: 'lanczos3', widths: [540, 1080]};
const previousPath = path.join(OUT, 'manifest.json');
const previous = fs.existsSync(previousPath) ? read(previousPath) : null;
const mayReuse = previous && JSON.stringify(previous.encoding) === JSON.stringify(encoding);
const manifest = {
  schemaVersion: 1,
  appVersion: '1.620', appVersionCode: 37, flavor: 'google',
  exactApkSha256: '99d2445b810a0449b6aa80ea6eb571252e7e12c2f38a05e4cc317954eeb31662',
  expectedLocales: 44, expectedCards: 352, expectedOutputs: 704,
  complete: false,
  order: sourceManifest.order,
  encoding,
  provenance: {
    websiteInventory: {path: 'site-locales.json', mappingSha256: sha(Buffer.from(JSON.stringify(inventory.locales.map(({androidLocale, webLocale, dir}) => ({androidLocale, webLocale, dir})))) )},
    googleStoreArtwork: {path: relative(sourceManifestPath), sha256: sourceManifestSha},
    localizedCaptionCatalogue: {path: relative(cataloguePath), sha256: catalogueSha},
    ...(bosnianManifestPath ? {bosnianSupplement: {path: relative(path.resolve(bosnianManifestPath)), sha256: sha(fs.readFileSync(path.resolve(bosnianManifestPath)))}} : {}),
    operation: 'Approved whole marketing card resized proportionally and encoded as WebP; no cropping, UI synthesis, text replacement or retouching.',
  },
  locales: {},
};
async function main() {
  fs.mkdirSync(OUT, {recursive: true});
  let outputCount = 0, totalBytes = 0;
  for (const locale of inventory.locales) {
    const source = sources.get(locale.androidLocale);
    const entry = {appLocale: locale.androidLocale, webLocale: locale.webLocale, dir: locale.dir, sourceStoreLocale: source?.storeLocale ?? null, complete: Boolean(source), cards: []};
    manifest.locales[locale.webLocale] = entry;
    if (!source) {
      if (locale.androidLocale !== 'bs') throw Error(`Missing unexpected locale ${locale.androidLocale}`);
      continue;
    }
    if (source.phoneScreenshots.length !== 8) throw Error(`Expected eight cards: ${locale.webLocale}`);
    const directory = path.join(OUT, locale.webLocale);
    fs.mkdirSync(directory, {recursive: true});
    for (let position = 0; position < 8; position++) {
      const item = source.phoneScreenshots[position];
      if (item.index !== position + 1 || item.scene !== sourceManifest.order[position]) throw Error(`Invalid scene order: ${locale.webLocale}`);
      const bytes = fs.readFileSync(item.path);
      if (sha(bytes) !== item.sha256) throw Error(`Source hash mismatch: ${item.path}`);
      const meta = await sharp(bytes).metadata();
      if (meta.width !== 1080 || meta.height !== 1920 || meta.hasAlpha) throw Error(`Expected opaque RGB 1080x1920: ${item.path}`);
      const base = `${String(item.index).padStart(2, '0')}-${item.scene}`;
      const card = {index: item.index, scene: item.scene, caption: catalogue.captions[locale.androidLocale][item.scene], source: {path: relative(item.path), sha256: item.sha256, width: meta.width, height: meta.height, bytes: bytes.length}, variants: {}};
      for (const width of encoding.widths) {
        const filename = `${base}${width === 1080 ? '' : `-${width}`}.webp`;
        const output = path.join(directory, filename);
        const priorCard = mayReuse ? previous.locales[locale.webLocale]?.cards.find(card => card.scene === item.scene && card.source.sha256 === item.sha256) : null;
        const priorVariant = priorCard?.variants[width];
        const existingBytes = priorVariant && fs.existsSync(output) ? fs.readFileSync(output) : null;
        const encoded = existingBytes && sha(existingBytes) === priorVariant.sha256 ? existingBytes : await sharp(bytes).resize({width, kernel: sharp.kernel.lanczos3, withoutEnlargement: true}).webp({quality: encoding.quality, effort: encoding.effort, smartSubsample: encoding.smartSubsample}).toBuffer();
        if (encoded !== existingBytes) fs.writeFileSync(output, encoded);
        const actual = await sharp(encoded).metadata();
        if (actual.width !== width || actual.height !== width * 16 / 9 || actual.format !== 'webp' || actual.hasAlpha) throw Error(`Unexpected exported image: ${output}`);
        card.variants[width] = {url: `/assets/screenshots/v1-620/${locale.webLocale}/${filename}`, width: actual.width, height: actual.height, bytes: encoded.length, sha256: sha(encoded)};
        outputCount++;
        totalBytes += encoded.length;
      }
      entry.cards.push(card);
    }
    console.log(`Exported ${locale.webLocale}: 8 cards, 16 WebP files`);
  }
  manifest.completedLocales = Object.values(manifest.locales).filter(locale => locale.complete).length;
  manifest.missingLocales = Object.values(manifest.locales).filter(locale => !locale.complete).map(locale => locale.webLocale);
  manifest.totalCards = Object.values(manifest.locales).reduce((sum, locale) => sum + locale.cards.length, 0);
  manifest.totalOutputs = outputCount;
  manifest.totalBytes = totalBytes;
  manifest.complete = manifest.completedLocales === manifest.expectedLocales && manifest.totalCards === manifest.expectedCards && outputCount === manifest.expectedOutputs;
  // All input hashes are checked again after conversion to bind an immutable batch.
  if (sha(fs.readFileSync(sourceManifestPath)) !== sourceManifestSha || sha(fs.readFileSync(cataloguePath)) !== catalogueSha) throw Error('Frozen input changed during export');
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify({complete: manifest.complete, completedLocales: manifest.completedLocales, totalCards: manifest.totalCards, totalOutputs: outputCount, totalBytes, missingLocales: manifest.missingLocales}));
}
main().catch(error => {console.error(error); process.exitCode = 1;});
