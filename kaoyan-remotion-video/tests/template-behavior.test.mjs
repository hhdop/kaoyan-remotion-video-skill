import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath, pathToFileURL} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const templateSource = path.resolve(here, '..', 'assets', 'remotion-template', 'src');

const loadTemplateModule = (fileName) =>
  import(`${pathToFileURL(path.join(templateSource, fileName)).href}?test=${Date.now()}`);

const stages = [
  {key: 'opening', label: '开场', start: 0, end: 2},
  {key: 'method', label: '方法', start: 4, end: 7},
  {key: 'summary', label: '总结', start: 7, end: 9},
];

test('timeline gaps and tail hold the most recently started stage', async () => {
  const {getStageAt} = await loadTemplateModule('timeline.ts');

  assert.equal(getStageAt(stages, 3).key, 'opening');
  assert.equal(getStageAt(stages, 5).key, 'method');
  assert.equal(getStageAt(stages, 12).key, 'summary');
});

test('cue preparation never exposes meaningful future text', async () => {
  const {cueState} = await loadTemplateModule('motion.ts');
  const state = cueState({cueStart: 2, cueEnd: 4}, 1.95);

  assert.equal(state.preparing, true);
  assert.equal(state.revealed, false);
  assert.equal(state.visible, false);
});

test('the final stage holds its completed frame through the audio boundary', async () => {
  const {stageState} = await loadTemplateModule('motion.ts');
  const state = stageState({start: 8, end: 10}, 9.99, 0, 0.4, true);

  assert.ok(state.presence > 0.99);
  assert.equal(state.exit, 1);
});

test('chapter handoffs keep the content area covered without revealing the next stage early', async () => {
  const {chapterTransitionState} = await loadTemplateModule('motion.ts');

  const before = chapterTransitionState({start: 6, end: 8}, 5.99, true);
  assert.equal(before.current, 0);

  for (const sec of [6, 6.03, 6.08, 6.16, 6.28]) {
    const state = chapterTransitionState({start: 6, end: 8}, sec, true);
    assert.ok(Math.abs(state.current + state.previous - 1) < 0.001, `content gap or overlap at ${sec}s`);
  }

  const boundary = chapterTransitionState({start: 6, end: 8}, 6, true);
  assert.equal(boundary.current, 0);
  assert.equal(boundary.previous, 1);
});

test('major visual surfaces remain below the exposure ceiling', async () => {
  const {majorSurfaces, relativeLuminance} = await loadTemplateModule('visualSystem.ts');

  for (const [name, color] of Object.entries(majorSurfaces)) {
    assert.ok(
      relativeLuminance(color) <= 0.82,
      `${name} is too bright: ${relativeLuminance(color).toFixed(3)}`,
    );
  }
});

test('long timelines collapse to the active chapter label', async () => {
  const {getVisibleTimelineItems} = await loadTemplateModule('timeline.ts');
  const timeline = Array.from({length: 8}, (_, index) => ({
    key: `stage-${index}`,
    label: `章节 ${index + 1}`,
  }));

  assert.deepEqual(getVisibleTimelineItems(timeline, 'stage-4'), [timeline[4]]);
  assert.deepEqual(getVisibleTimelineItems(timeline.slice(0, 5), 'stage-4'), timeline.slice(0, 5));
});
