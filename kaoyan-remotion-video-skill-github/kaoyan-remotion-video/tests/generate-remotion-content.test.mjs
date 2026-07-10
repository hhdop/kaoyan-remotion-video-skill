import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  buildContentModel,
  parseSrt,
  writeGeneratedContent,
} from '../scripts/generate-remotion-content.mjs';

const sampleSrt = `1
00:00:00,000 --> 00:00:02,533
北京理工大学发布考试科目调整公告

2
00:00:02,533 --> 00:00:05,100
085405软件工程初试第四科从

3
00:00:05,100 --> 00:00:07,500
885软件工程专业基础综合

4
00:00:07,500 --> 00:00:09,900
调整为408计算机学科专业基础

5
00:00:09,900 --> 00:00:11,700
也就是说 北理工软件工程

6
00:00:11,700 --> 00:00:13,900
专业课从自命题改为408统考

7
00:00:13,900 --> 00:00:17,066
对27考研同学来说 目标北理工软件工程的话

8
00:00:17,300 --> 00:00:19,333
专业课复习方向要及时调整

9
00:00:19,333 --> 00:00:22,900
后续需要转向408体系复习 408主要包括四门：

10
00:00:22,900 --> 00:00:26,366
数据结构 计算机组成原理 操作系统 计算机网络

11
00:00:26,366 --> 00:00:29,033
暑期阶段还没开始系统学408的同学

12
00:00:29,033 --> 00:00:30,333
现在就要抓紧了
`;

test('parses UTF-8 Chinese SRT into timed cues without mojibake', () => {
  const cues = parseSrt(Buffer.from(sampleSrt, 'utf8'));

  assert.equal(cues.length, 12);
  assert.equal(cues[0].start, 0);
  assert.equal(cues[0].end, 2.533);
  assert.equal(cues[0].text, '北京理工大学发布考试科目调整公告');
  assert.ok(cues.every((cue) => !/[�锟鍖]/.test(cue.text)));
});

test('builds 408-oriented semantic stages from transcript cues', () => {
  const model = buildContentModel(parseSrt(Buffer.from(sampleSrt, 'utf8')), {
    fps: 30,
    title: '北理工软工改408',
  });

  assert.equal(model.fps, 30);
  assert.equal(model.badge, '408');
  assert.ok(model.durationInFrames >= 920 && model.durationInFrames <= 950);
  assert.ok(model.brand.includes('408'));

  const labels = model.stages.map((stage) => stage.label).join('|');
  for (const label of ['公告', '变化', '影响', '四门', '行动']) {
    assert.ok(labels.includes(label), labels);
  }
  assert.deepEqual(model.stages.map((stage) => stage.label), ['公告', '变化', '影响', '四门', '行动']);

  assert.ok(model.stages.some((stage) => stage.main.includes('885') && stage.main.includes('408')));
  const subjects = model.stages.find((stage) => stage.label === '四门');
  assert.ok(subjects);
  assert.deepEqual(
    subjects.points.map((point) => point.cueStart),
    [22.9, 23.766, 24.633, 25.499],
  );
  assert.ok(subjects.points.some((point) => point.text.includes('数据结构')));
  assert.ok(model.stages.every((stage) => stage.points.every((point) => point.cueEnd > point.cueStart)));
  assert.ok(model.timeline.every((item) => item.label.length > 0));
});

test('writes generatedContent.ts that Remotion template can import', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kaoyan-remotion-generator-'));
  fs.mkdirSync(path.join(projectDir, 'src'), {recursive: true});
  fs.mkdirSync(path.join(projectDir, 'public'), {recursive: true});
  fs.writeFileSync(path.join(projectDir, 'public', 'script.srt'), sampleSrt, 'utf8');
  fs.writeFileSync(path.join(projectDir, 'public', 'voice.mp3'), Buffer.from([0x49, 0x44, 0x33]));

  const result = writeGeneratedContent({
    projectDir,
    fps: 30,
    title: '北理工软工改408',
  });

  const generated = fs.readFileSync(result.generatedContentPath, 'utf8');
  assert.match(generated, /export const generatedVideo/);
  assert.match(generated, /北京理工大学/);
  assert.match(generated, /408/);
  assert.doesNotMatch(generated, /�|锟|鍖/);
  assert.equal(result.model.audioFile, 'voice.mp3');
});
