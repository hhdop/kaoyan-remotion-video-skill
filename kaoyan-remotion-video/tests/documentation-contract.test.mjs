import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const skillDir = path.resolve(here, '..');
const repoDir = path.resolve(skillDir, '..');
const read = (root, relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('Skill metadata describes triggering conditions instead of its workflow', () => {
  const skill = read(skillDir, 'SKILL.md');
  const description = skill.match(/^description:\s*(.+)$/m)?.[1] ?? '';

  assert.match(description, /^Use when\b/);
  assert.ok(description.length < 500);
});

test('public docs state the supported Windows and first-run network contract', () => {
  const docs = [read(repoDir, 'README.md'), read(repoDir, 'USER_GUIDE.md'), read(skillDir, 'SKILL.md')].join('\n');

  assert.match(docs, /Windows 10\/11/);
  assert.match(docs, /首次联网|first-run internet/i);
  assert.doesNotMatch(docs, /9:16/);
  assert.doesNotMatch(docs, /\$superpowers\b/);
  assert.doesNotMatch(docs, /C:\\Users\\yz|D:\\新东方/);
});

test('incident notes are replaced by reusable failure modes', () => {
  const skill = read(skillDir, 'SKILL.md');
  const readme = read(repoDir, 'README.md');

  assert.ok(fs.existsSync(path.join(skillDir, 'references', 'failure-modes.md')));
  assert.ok(!fs.existsSync(path.join(skillDir, 'references', 'iteration-notes.md')));
  assert.doesNotMatch(`${skill}\n${readme}`, /iteration-notes/);
});

test('repository hygiene excludes generated and machine-local artifacts', () => {
  const ignore = read(repoDir, '.gitignore');

  for (const pattern of ['node_modules', '*.mp3', '*.srt', '*.mp4', 'runtime.json', 'frames']) {
    assert.ok(ignore.includes(pattern), `missing ignore pattern: ${pattern}`);
  }
  assert.ok(fs.existsSync(path.join(repoDir, '.gitattributes')));
});

test('README links the official Remotion licensing page', () => {
  assert.match(read(repoDir, 'README.md'), /https:\/\/www\.remotion\.pro\/license|https:\/\/www\.remotion\.dev\/license/);
});
