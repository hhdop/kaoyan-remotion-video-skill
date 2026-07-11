#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

import {
  labelCuesForProfile,
  profileKicker,
  selectProfile,
} from './content-profiles.mjs';

const DEFAULT_FPS = 30;

const normalizeDocument = (text) =>
  text
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/4\s*0\s*8/g, '408')
    .trim();

const normalizeText = (text) =>
  text
    .replace(/4\s*0\s*8/g, '408')
    .replace(/\s+/g, ' ')
    .trim();

const decodeBuffer = (input) => {
  if (typeof input === 'string') {
    return normalizeDocument(input);
  }

  const bytes = Buffer.isBuffer(input) ? input : Buffer.from(input);
  const candidates = ['utf-8', 'gb18030', 'gbk'];
  for (const encoding of candidates) {
    try {
      const decoded = new TextDecoder(encoding, {fatal: encoding === 'utf-8'}).decode(bytes);
      const text = normalizeDocument(decoded);
      if (!/[锟介敓]/.test(text)) return text;
    } catch {
      // Try the next common Chinese transcript encoding.
    }
  }
  return normalizeDocument(bytes.toString('utf8'));
};

const parseTimecode = (value) => {
  const match = value.trim().match(/^(\d{2}):(\d{2}):(\d{2})[,.](\d{1,3})$/);
  if (!match) throw new Error(`SRT_TIMECODE_INVALID: ${value}`);
  const [, hours, minutes, seconds, millis] = match;
  return (
    Number(hours) * 3600 +
    Number(minutes) * 60 +
    Number(seconds) +
    Number(millis.padEnd(3, '0')) / 1000
  );
};

export const parseSrt = (source) => {
  const text = decodeBuffer(source);
  const blocks = text.split(/\n\s*\n/);
  const cues = blocks
    .map((block) => {
      const lines = block
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      const timingIndex = lines.findIndex((line) => line.includes('-->'));
      if (timingIndex === -1) return null;
      const [startRaw, endRaw] = lines[timingIndex].split(/\s*-->\s*/);
      if (!startRaw || !endRaw) throw new Error(`SRT_TIMING_INVALID: ${lines[timingIndex]}`);
      const start = parseTimecode(startRaw);
      const end = parseTimecode(endRaw.split(/\s+/)[0]);
      if (end <= start) throw new Error(`SRT_DURATION_INVALID: ${lines[timingIndex]}`);
      const cueText = normalizeText(lines.slice(timingIndex + 1).join(' ').replace(/<[^>]+>/g, ''));
      if (!cueText) return null;
      return {start, end, text: cueText};
    })
    .filter(Boolean)
    .sort((a, b) => a.start - b.start);

  if (cues.length === 0) throw new Error('SRT_EMPTY: no timed text cues were parsed.');
  return cues;
};

export const inspectSrt = (srtPath) => {
  if (!srtPath || !fs.existsSync(srtPath)) {
    throw new Error(`SRT_MISSING: ${srtPath || '(not provided)'}`);
  }
  const cues = parseSrt(fs.readFileSync(srtPath));
  return {
    valid: true,
    cueCount: cues.length,
    startSeconds: cues[0].start,
    endSeconds: cues.at(-1).end,
  };
};

const floorSeconds = (value) => Number((Math.floor(value * 1000) / 1000).toFixed(3));
const roundSeconds = (value) => Number(value.toFixed(3));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const subjectDefinitions = [
  ['数据结构', /数据结构/],
  ['计算机组成原理', /计算机组成原理|组成原理/],
  ['操作系统', /操作系统/],
  ['计算机网络', /计算机网络/],
];

const subjectPoints = (text) =>
  subjectDefinitions.filter(([, pattern]) => pattern.test(text)).map(([subject]) => subject);

const splitCueIntoPoints = (cue, labels) => {
  const span = Math.max(0.35, cue.end - cue.start);
  return labels.map((label, index) => {
    const cueStart = floorSeconds(cue.start + (span * index) / labels.length);
    const cueEnd =
      index === labels.length - 1
        ? floorSeconds(cue.end)
        : floorSeconds(cue.start + (span * (index + 1)) / labels.length);
    return {
      text: label,
      shortText: label,
      cueStart,
      cueEnd: Math.max(cueEnd, roundSeconds(cueStart + 0.25)),
      tone: 'subject',
    };
  });
};

const pointFromCue = (cue, extra = {}) => ({
  text: cue.text,
  cueStart: floorSeconds(cue.start),
  cueEnd: floorSeconds(cue.end),
  ...extra,
});

const buildGroups = (cues, profile) => {
  const labeled = labelCuesForProfile(cues, profile);
  const groups = [];
  for (const cue of labeled) {
    const previous = groups.at(-1);
    if (previous && previous.label === cue.semanticLabel) {
      previous.cues.push(cue);
    } else {
      groups.push({label: cue.semanticLabel, cues: [cue]});
    }
  }
  return groups;
};

const newsChangeMain = (text) => {
  const oldValue = text.includes('885') ? '885 软件工程专业基础综合' : '原专业课';
  const newValue = text.includes('408') ? '408 计算机学科专业基础' : '新考试科目';
  return `${oldValue} → ${newValue}`;
};

const stageMain = (group, profile) => {
  const texts = group.cues.map((cue) => cue.text);
  const combined = texts.join(' ');
  const subjects = subjectPoints(combined);
  if (group.label === '四门' && subjects.length >= 2) return subjects.join(' / ');
  if (profile === 'news' && group.label === '变化' && /调整为|改为|自命题|统考|885|408/.test(combined)) {
    return newsChangeMain(combined);
  }
  return texts.length === 1 ? texts[0] : texts.sort((a, b) => b.length - a.length)[0];
};

const stageTitle = (group, profile) => {
  const text = group.cues[0].text;
  const fixed = {
    planning: {
      结论: '先确定暑期复习主线',
      主线: '把全科优先级排清楚',
      数学: '数学从基础进入强化',
      408: '408完成一轮并补漏洞',
      英语: '英语保持单词和阅读手感',
      政治: '政治可以开始但不抢主科',
      总结: '用一句话收束全科安排',
    },
    news: {
      公告: '先确认官方发布的信息',
      变化: '看清考试科目发生了什么变化',
      影响: '判断哪些同学需要调整',
      四门: '408主要包含四门内容',
      行动: '把变化落到下一步行动',
      事实: '拆清楚这条信息',
    },
    knowledge: {
      问题: '先看要解决的问题',
      概念: '抓住核心概念',
      解释: '把原因解释清楚',
      例子: '用例子验证理解',
      方法: '把理解落到做题方法',
      总结: '收束成可复用结论',
    },
  };
  return fixed[profile]?.[group.label] ?? text;
};

const stagePoints = (group) => {
  const combined = group.cues.map((cue) => cue.text).join(' ');
  const subjects = subjectPoints(combined);
  if (group.label === '四门' && subjects.length >= 2) {
    const cue = group.cues.find((item) => subjectPoints(item.text).length >= 2) ?? group.cues.at(-1);
    return splitCueIntoPoints(cue, subjects);
  }
  return group.cues.slice(0, 4).map((cue, index) =>
    pointFromCue(cue, {
      tone: index === 0 ? 'new' : 'neutral',
    }),
  );
};

const normalizeStageCoverage = (stages, durationSeconds) => {
  if (stages.length === 0) return stages;
  stages[0].start = 0;
  for (let index = 0; index < stages.length; index += 1) {
    const next = stages[index + 1];
    stages[index].end = roundSeconds(next ? next.start : durationSeconds);
    stages[index].points = stages[index].points
      .map((point) => {
        const cueStart = clamp(point.cueStart, stages[index].start, stages[index].end);
        const cueEnd = clamp(point.cueEnd, cueStart, stages[index].end);
        return {
          ...point,
          cueStart: roundSeconds(cueStart),
          cueEnd: roundSeconds(Math.max(cueEnd, Math.min(stages[index].end, cueStart + 0.001))),
        };
      })
      .filter((point) => point.cueEnd > point.cueStart);
  }
  return stages;
};

const buildStages = (cues, profile, durationSeconds) => {
  const stages = buildGroups(cues, profile).map((group, index) => ({
    key: `${profile}-${index}`,
    start: floorSeconds(group.cues[0].start),
    end: floorSeconds(group.cues.at(-1).end),
    label: group.label,
    title: stageTitle(group, profile),
    kicker: profileKicker(profile, group.label),
    main: stageMain(group, profile),
    points: stagePoints(group),
    cueTexts: group.cues.map((cue) => cue.text),
  }));
  return normalizeStageCoverage(stages, durationSeconds);
};

const deriveMeta = (text, profile) => {
  if (profile === 'planning') return text.includes('408') ? '计算机考研 · 全科规划' : '考研复习 · 阶段规划';
  if (profile === 'news') return text.includes('408') ? '计算机考研 · 信息更新' : '考研信息 · 官方更新';
  return text.includes('408') ? '计算机考研 · 知识讲解' : '考研知识 · 结构化讲解';
};

const defaultBrand = (text, profile) => {
  if (profile === 'planning') return text.includes('408') ? '408 复习规划' : '考研复习规划';
  if (profile === 'news') return text.includes('408') ? '408 考研快讯' : '考研信息更新';
  return text.includes('408') ? '408 知识讲解' : '考研知识讲解';
};

export const buildContentModel = (cues, options = {}) => {
  if (!Array.isArray(cues) || cues.length === 0) throw new Error('SRT_EMPTY: no timed cues were supplied.');
  const normalizedCues = cues
    .map((cue) => ({start: Number(cue.start), end: Number(cue.end), text: normalizeText(cue.text)}))
    .sort((a, b) => a.start - b.start);
  for (const cue of normalizedCues) {
    if (!Number.isFinite(cue.start) || !Number.isFinite(cue.end) || cue.end <= cue.start || !cue.text) {
      throw new Error(`SRT_CUE_INVALID: ${JSON.stringify(cue)}`);
    }
  }

  const fps = Number(options.fps ?? DEFAULT_FPS);
  if (!Number.isFinite(fps) || fps <= 0) throw new Error(`FPS_INVALID: ${options.fps}`);
  const selection = selectProfile(normalizedCues, options.profile ?? 'auto');
  const transcriptEnd = normalizedCues.at(-1).end;
  const audioDurationSeconds = Number(options.audioDurationSeconds ?? transcriptEnd);
  const tailHoldSeconds = Number(options.tailHoldSeconds ?? 0);
  if (!Number.isFinite(audioDurationSeconds) || audioDurationSeconds <= 0) {
    throw new Error(`AUDIO_DURATION_INVALID: ${options.audioDurationSeconds}`);
  }
  if (!Number.isFinite(tailHoldSeconds) || tailHoldSeconds < 0) {
    throw new Error(`TAIL_HOLD_INVALID: ${options.tailHoldSeconds}`);
  }
  if (audioDurationSeconds + 0.25 < transcriptEnd) {
    throw new Error(`AUDIO_SHORTER_THAN_SRT: audio=${audioDurationSeconds}, srt=${transcriptEnd}`);
  }

  const durationSeconds = roundSeconds(audioDurationSeconds + tailHoldSeconds);
  const stages = buildStages(normalizedCues, selection.profile, durationSeconds);
  const allText = normalizedCues.map((cue) => cue.text).join(' ');
  return {
    profile: selection.profile,
    profileConfidence: selection.confidence,
    profileEvidence: selection.evidence,
    brand: options.title || defaultBrand(allText, selection.profile),
    meta: deriveMeta(allText, selection.profile),
    badge: allText.includes('408') ? '408' : '考研',
    fps,
    durationSeconds,
    durationInFrames: Math.ceil(durationSeconds * fps),
    audioFile: options.audioFile || 'voice.mp3',
    stages,
    timeline: stages.map((stage) => ({key: stage.key, label: stage.label})),
  };
};

const findDefaultSrt = (projectDir) => {
  const publicDir = path.join(projectDir, 'public');
  const preferred = path.join(publicDir, 'script.srt');
  if (fs.existsSync(preferred)) return preferred;
  if (!fs.existsSync(publicDir)) throw new Error(`SRT_MISSING: public directory not found: ${publicDir}`);
  const match = fs
    .readdirSync(publicDir, {withFileTypes: true})
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.srt'))
    .map((entry) => path.join(publicDir, entry.name))
    .sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))[0];
  if (!match) throw new Error(`SRT_MISSING: no SRT file found in ${publicDir}`);
  return match;
};

const findDefaultAudio = (projectDir) => {
  const publicDir = path.join(projectDir, 'public');
  const preferred = path.join(publicDir, 'voice.mp3');
  if (fs.existsSync(preferred)) return 'voice.mp3';
  if (!fs.existsSync(publicDir)) throw new Error(`AUDIO_MISSING: public directory not found: ${publicDir}`);
  const match = fs
    .readdirSync(publicDir, {withFileTypes: true})
    .filter((entry) => entry.isFile() && /\.(mp3|wav|m4a|aac)$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))[0];
  if (!match) throw new Error(`AUDIO_MISSING: no supported audio file found in ${publicDir}`);
  return match;
};

const toTs = (model) => `export type VideoProfile = 'planning' | 'news' | 'knowledge';

export type GeneratedPoint = {
  text: string;
  shortText?: string;
  cueStart: number;
  cueEnd: number;
  tone?: 'neutral' | 'old' | 'new' | 'urgent' | 'subject';
};

export type GeneratedStage = {
  key: string;
  start: number;
  end: number;
  label: string;
  title: string;
  kicker: string;
  main: string;
  points: GeneratedPoint[];
  cueTexts: string[];
};

export type GeneratedVideo = {
  profile: VideoProfile;
  profileConfidence: number;
  profileEvidence: string[];
  brand: string;
  meta: string;
  badge: string;
  fps: number;
  durationSeconds: number;
  durationInFrames: number;
  audioFile: string;
  stages: GeneratedStage[];
  timeline: Array<{key: string; label: string}>;
};

export const generatedVideo: GeneratedVideo = ${JSON.stringify(model, null, 2)};

export const generatedDurationInFrames = generatedVideo.durationInFrames;
export const generatedAudioFile = generatedVideo.audioFile;
`;

export const writeGeneratedContent = (options = {}) => {
  const projectDir = path.resolve(options.projectDir || process.cwd());
  const srcDir = path.join(projectDir, 'src');
  const srtPath = path.resolve(options.srtPath || options.srt || findDefaultSrt(projectDir));
  const audioFile = options.audioFile || options.audio || findDefaultAudio(projectDir);
  const cues = parseSrt(fs.readFileSync(srtPath));
  const model = buildContentModel(cues, {
    fps: options.fps ?? DEFAULT_FPS,
    title: options.title,
    audioFile: path.basename(audioFile),
    profile: options.profile ?? 'auto',
    audioDurationSeconds: options.audioDurationSeconds,
    tailHoldSeconds: options.tailHoldSeconds,
  });
  fs.mkdirSync(srcDir, {recursive: true});
  const generatedContentPath = path.join(srcDir, 'generatedContent.ts');
  fs.writeFileSync(generatedContentPath, toTs(model), 'utf8');
  return {projectDir, srtPath, generatedContentPath, model};
};

const parseArgs = (argv) => {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    const value = argv[index + 1] && !argv[index + 1].startsWith('--') ? argv[++index] : 'true';
    args[key] = value;
  }
  return args;
};

const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) {
  const args = parseArgs(process.argv.slice(2));
  try {
    if (args.inspect === 'true') {
      console.log(JSON.stringify(inspectSrt(args.srt)));
    } else {
      const result = writeGeneratedContent({
        projectDir: args.projectDir,
        srtPath: args.srt,
        audioFile: args.audio,
        title: args.title,
        profile: args.profile ?? 'auto',
        fps: args.fps ? Number(args.fps) : DEFAULT_FPS,
        audioDurationSeconds: args.audioDuration ? Number(args.audioDuration) : undefined,
        tailHoldSeconds: args.tailHold ? Number(args.tailHold) : 0,
      });
      console.log(`Generated Remotion content: ${result.generatedContentPath}`);
      console.log(`Profile: ${result.model.profile} (${result.model.profileConfidence})`);
      console.log(`Duration: ${result.model.durationInFrames} frames @ ${result.model.fps}fps`);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
