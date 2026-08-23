import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  createRunTimestamp,
  isValidGeneratedAt,
  writeGeneratedJson
} from '../tools/generated-json.mjs';

const firstTimestamp = '2026-08-23T10:00:00.000Z';
const secondTimestamp = '2026-08-24T11:12:13.000Z';

async function fixture(t, name = 'generated.json') {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'balkan-generator-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  return path.join(directory, name);
}

function fixedTimestamp(value = secondTimestamp) {
  return createRunTimestamp({ now: () => new Date(value), sourceDateEpoch: undefined });
}

async function seed(file, semantic, generatedAt = firstTimestamp, generatedAtIndex = 0) {
  const entries = Object.entries(semantic);
  entries.splice(generatedAtIndex, 0, ['generatedAt', generatedAt]);
  await fs.writeFile(file, `${JSON.stringify(Object.fromEntries(entries), null, 2)}\n`);
}

test('unchanged semantic payload preserves the existing timestamp', async t => {
  const file = await fixture(t);
  await seed(file, { locales: ['en', 'sr'] });
  const result = await writeGeneratedJson(file, { locales: ['en', 'sr'] }, { getRunTimestamp: fixedTimestamp() });
  assert.equal(result.generatedAt, firstTimestamp);
  assert.equal(result.changed, false);
});

test('unchanged semantic payload produces byte-identical output', async t => {
  const file = await fixture(t);
  await seed(file, { title: 'Currency', nested: { rtl: false } }, firstTimestamp, 1);
  const before = await fs.readFile(file);
  await writeGeneratedJson(file, { title: 'Currency', nested: { rtl: false } }, {
    getRunTimestamp: fixedTimestamp(), generatedAtIndex: 1
  });
  assert.deepEqual(await fs.readFile(file), before);
});

test('unchanged output is not rewritten', async t => {
  const file = await fixture(t);
  await seed(file, { locales: ['en'] });
  let writes = 0;
  const fileSystem = {
    readFile: (...args) => fs.readFile(...args),
    writeFile: async (...args) => { writes += 1; return fs.writeFile(...args); }
  };
  const result = await writeGeneratedJson(file, { locales: ['en'] }, {
    getRunTimestamp: fixedTimestamp(), fileSystem
  });
  assert.equal(result.changed, false);
  assert.equal(writes, 0);
});

test('changed semantic payload receives a new timestamp', async t => {
  const file = await fixture(t);
  await seed(file, { locales: ['en'] });
  const result = await writeGeneratedJson(file, { locales: ['en', 'sr'] }, { getRunTimestamp: fixedTimestamp() });
  assert.equal(result.generatedAt, secondTimestamp);
  assert.equal(JSON.parse(await fs.readFile(file, 'utf8')).generatedAt, secondTimestamp);
});

test('two files changed in one run receive the same timestamp', async t => {
  const first = await fixture(t, 'first.json');
  const second = path.join(path.dirname(first), 'second.json');
  const runTimestamp = fixedTimestamp();
  await writeGeneratedJson(first, { value: 1 }, { getRunTimestamp: runTimestamp });
  await writeGeneratedJson(second, { value: 2 }, { getRunTimestamp: runTimestamp });
  assert.equal(JSON.parse(await fs.readFile(first, 'utf8')).generatedAt, secondTimestamp);
  assert.equal(JSON.parse(await fs.readFile(second, 'utf8')).generatedAt, secondTimestamp);
});

test('second run after a semantic change is byte-identical', async t => {
  const file = await fixture(t);
  await seed(file, { value: 'old' });
  await writeGeneratedJson(file, { value: 'new' }, { getRunTimestamp: fixedTimestamp() });
  const changed = await fs.readFile(file);
  const result = await writeGeneratedJson(file, { value: 'new' }, { getRunTimestamp: fixedTimestamp('2026-08-25T00:00:00.000Z') });
  assert.equal(result.changed, false);
  assert.deepEqual(await fs.readFile(file), changed);
});

test('missing output receives a valid timestamp', async t => {
  const file = await fixture(t);
  await writeGeneratedJson(file, { value: 1 }, { getRunTimestamp: fixedTimestamp() });
  assert.equal(isValidGeneratedAt(JSON.parse(await fs.readFile(file, 'utf8')).generatedAt), true);
});

test('missing existing timestamp receives a valid timestamp', async t => {
  const file = await fixture(t);
  await fs.writeFile(file, '{\n  "value": 1\n}\n');
  const result = await writeGeneratedJson(file, { value: 1 }, { getRunTimestamp: fixedTimestamp() });
  assert.equal(result.reason, 'invalid-or-missing-timestamp');
  assert.equal(isValidGeneratedAt(JSON.parse(await fs.readFile(file, 'utf8')).generatedAt), true);
});

test('malformed existing JSON fails safely and explicitly', async t => {
  const file = await fixture(t);
  await fs.writeFile(file, '{broken');
  await assert.rejects(
    writeGeneratedJson(file, { value: 1 }, { getRunTimestamp: fixedTimestamp() }),
    /Malformed generated JSON/
  );
});

test('malformed existing timestamp is replaced by the run timestamp', async t => {
  const file = await fixture(t);
  await seed(file, { value: 1 }, 'yesterday');
  const result = await writeGeneratedJson(file, { value: 1 }, { getRunTimestamp: fixedTimestamp() });
  assert.equal(result.reason, 'invalid-or-missing-timestamp');
  assert.equal(result.generatedAt, secondTimestamp);
});

test('stable JSON ordering and one trailing newline are preserved', async t => {
  const file = await fixture(t);
  const semantic = { source: ['index.html'], home: ['Title'], privacyPolicy: ['Policy'] };
  await writeGeneratedJson(file, semantic, { getRunTimestamp: fixedTimestamp(), generatedAtIndex: 1 });
  const text = await fs.readFile(file, 'utf8');
  assert.match(text, /^\{\n  "source":/);
  assert.ok(text.indexOf('"generatedAt"') < text.indexOf('"home"'));
  assert.equal(text.endsWith('\n'), true);
  assert.equal(text.endsWith('\n\n'), false);
});

test('changing a real locale value is not hidden', async t => {
  const file = await fixture(t);
  await seed(file, { locales: [{ webLocale: 'sr', name: 'Српски' }] });
  const result = await writeGeneratedJson(file, { locales: [{ webLocale: 'sr', name: 'Srpski' }] }, { getRunTimestamp: fixedTimestamp() });
  assert.equal(result.semanticChanged, true);
  assert.equal(result.changed, true);
});

test('changing homepage metadata is not hidden', async t => {
  const file = await fixture(t);
  await seed(file, { home: ['Convert currencies quickly, anywhere'] });
  const result = await writeGeneratedJson(file, { home: ['Changed title'] }, { getRunTimestamp: fixedTimestamp() });
  assert.equal(result.semanticChanged, true);
});

test('changing a policy string is not hidden', async t => {
  const file = await fixture(t);
  await seed(file, { privacyPolicy: ['Optional Analytics'] });
  const result = await writeGeneratedJson(file, { privacyPolicy: ['Changed policy'] }, { getRunTimestamp: fixedTimestamp() });
  assert.equal(result.semanticChanged, true);
});

test('generatedAt alone does not cause semantic regeneration', async t => {
  const file = await fixture(t);
  await seed(file, { value: 1 }, firstTimestamp);
  const result = await writeGeneratedJson(file, { value: 1 }, { getRunTimestamp: fixedTimestamp() });
  assert.equal(result.semanticChanged, false);
  assert.equal(result.generatedAt, firstTimestamp);
});

test('valid SOURCE_DATE_EPOCH is deterministic and cached per run', () => {
  const timestamp = createRunTimestamp({ sourceDateEpoch: '1787486400' });
  assert.equal(timestamp(), '2026-08-23T12:00:00.000Z');
  assert.equal(timestamp(), '2026-08-23T12:00:00.000Z');
});

test('invalid SOURCE_DATE_EPOCH fails clearly', () => {
  for (const value of ['', '-1', '1.5', 'not-a-date', ' 1']) {
    assert.throws(() => createRunTimestamp({ sourceDateEpoch: value })(), /SOURCE_DATE_EPOCH/);
  }
});

test('a controlled semantic fixture changes once and then stabilizes', async t => {
  const firstFile = await fixture(t, 'locale.json');
  const secondFile = path.join(path.dirname(firstFile), 'metadata.json');
  const initialFirst = { locale: 'fixture', copy: 'before' };
  const initialSecond = { homepage: { title: 'before' } };
  const changedFirst = { locale: 'fixture', copy: 'after' };
  const changedSecond = { homepage: { title: 'after' } };
  await seed(firstFile, initialFirst);
  await seed(secondFile, initialSecond);
  const runTimestamp = fixedTimestamp();
  const firstChange = await writeGeneratedJson(firstFile, changedFirst, { getRunTimestamp: runTimestamp });
  const secondChange = await writeGeneratedJson(secondFile, changedSecond, { getRunTimestamp: runTimestamp });
  const afterFirstChange = await fs.readFile(firstFile);
  const afterSecondChange = await fs.readFile(secondFile);
  assert.equal(firstChange.generatedAt, secondChange.generatedAt);
  assert.equal(firstChange.changed, true);
  assert.equal(secondChange.changed, true);

  const stableTimestamp = fixedTimestamp('2026-08-25T00:00:00.000Z');
  const stableFirst = await writeGeneratedJson(firstFile, changedFirst, { getRunTimestamp: stableTimestamp });
  const stableSecond = await writeGeneratedJson(secondFile, changedSecond, { getRunTimestamp: stableTimestamp });
  assert.equal(stableFirst.changed, false);
  assert.equal(stableSecond.changed, false);
  assert.deepEqual(await fs.readFile(firstFile), afterFirstChange);
  assert.deepEqual(await fs.readFile(secondFile), afterSecondChange);

  const restoreTimestamp = fixedTimestamp('2026-08-26T00:00:00.000Z');
  const restoredFirst = await writeGeneratedJson(firstFile, initialFirst, { getRunTimestamp: restoreTimestamp });
  const restoredSecond = await writeGeneratedJson(secondFile, initialSecond, { getRunTimestamp: restoreTimestamp });
  assert.equal(restoredFirst.generatedAt, restoredSecond.generatedAt);
  assert.deepEqual(JSON.parse(await fs.readFile(firstFile, 'utf8')).copy, 'before');
  assert.deepEqual(JSON.parse(await fs.readFile(secondFile, 'utf8')).homepage.title, 'before');
});
