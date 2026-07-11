import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const skillDir = path.resolve(here, '..');
const repoDir = path.resolve(skillDir, '..');

test('Windows smoke workflow exercises the portable Skill', () => {
  const workflowPath = path.join(repoDir, '.github', 'workflows', 'windows-smoke.yml');
  const orchestratorPath = path.join(skillDir, 'scripts', 'test-skill.ps1');

  assert.ok(fs.existsSync(workflowPath));
  assert.ok(fs.existsSync(orchestratorPath));

  const workflow = fs.readFileSync(workflowPath, 'utf8');
  assert.match(workflow, /windows-latest/);
  assert.match(workflow, /node-version:\s*['"]?24/);
  assert.match(workflow, /11\.7\.0/);
  assert.match(workflow, /test-skill\.ps1/);

  const orchestrator = fs.readFileSync(orchestratorPath, 'utf8');
  for (const required of ['node --test', 'runtime-resolution.test.ps1', 'preflight-contract.test.ps1', 'studio-contract.test.ps1', 'render-contract.test.ps1', 'scaffold-remotion-project.ps1']) {
    assert.ok(orchestrator.includes(required), `orchestrator missing: ${required}`);
  }
});
