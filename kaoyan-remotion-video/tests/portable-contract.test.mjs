import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const skillDir = path.resolve(here, '..');
const templateDir = path.join(skillDir, 'assets', 'remotion-template');

const requiredTemplateFiles = [
  '.gitignore',
  'tsconfig.json',
  'remotion.config.ts',
  path.join('src', 'timeline.ts'),
  path.join('src', 'motion.ts'),
  path.join('src', 'visualSystem.ts'),
];

const textExtensions = new Set(['.json', '.md', '.mjs', '.ps1', '.ts', '.tsx', '.yaml', '.yml']);

const walkTextFiles = (root) => {
  const output = [];
  for (const entry of fs.readdirSync(root, {withFileTypes: true})) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', 'tests'].includes(entry.name)) output.push(...walkTextFiles(fullPath));
    } else if (textExtensions.has(path.extname(entry.name).toLowerCase())) {
      output.push(fullPath);
    }
  }
  return output;
};

test('portable scaffold includes every machine-neutral configuration file', () => {
  for (const relativePath of requiredTemplateFiles) {
    assert.ok(fs.existsSync(path.join(templateDir, relativePath)), `missing ${relativePath}`);
  }
});

test('generic skill files contain no private machine paths or legacy output name', () => {
  const offenders = [];
  for (const file of walkTextFiles(skillDir)) {
    const text = fs.readFileSync(file, 'utf8');
    if (/C:\\Users\\|D:\\新东方|408-progress-check/i.test(text)) {
      offenders.push(path.relative(skillDir, file));
    }
  }
  assert.deepEqual(offenders, []);
});

test('template source does not select readable stages with visual lead time', () => {
  const video = fs.readFileSync(path.join(templateDir, 'src', 'Video.tsx'), 'utf8');
  assert.doesNotMatch(video, /getStage\(displaySec\)/);
  assert.doesNotMatch(video, /opacity:\s*clampProgress\([^\n]+\[0\.4[0-9],\s*1\]/);
});

test('template palette avoids bright major surfaces and dense 8px grid', () => {
  const video = fs.readFileSync(path.join(templateDir, 'src', 'Video.tsx'), 'utf8');
  assert.doesNotMatch(video, /#fff(?:fff|9ec)/i);
  assert.doesNotMatch(video, /8px 8px/);
});

test('scaffolding excludes installed dependencies, outputs, and sample media', () => {
  const scaffold = fs.readFileSync(path.join(skillDir, 'scripts', 'scaffold-remotion-project.ps1'), 'utf8');

  assert.match(scaffold, /node_modules/);
  assert.match(scaffold, /out/);
  assert.match(scaffold, /public/);
  assert.match(scaffold, /Get-ChildItem[^\n]+-Force/);
});

test('dependency installs suppress pnpm update-network noise', () => {
  for (const relativePath of [
    path.join('scripts', 'test-skill.ps1'),
    path.join('scripts', 'start-remotion-studio.ps1'),
    path.join('scripts', 'render-remotion.ps1'),
  ]) {
    const source = fs.readFileSync(path.join(skillDir, relativePath), 'utf8');
    assert.match(source, /--config\.update-notifier=false/, `${relativePath} must disable the pnpm update check`);
  }
});

test('preflight distinguishes command failure from missing compositions', () => {
  const source = fs.readFileSync(path.join(skillDir, 'scripts', 'check-remotion-env.ps1'), 'utf8');
  assert.match(source, /COMPOSITION_DISCOVERY_FAILED/);
  assert.match(source, /COMPOSITIONS_MISSING/);
});
