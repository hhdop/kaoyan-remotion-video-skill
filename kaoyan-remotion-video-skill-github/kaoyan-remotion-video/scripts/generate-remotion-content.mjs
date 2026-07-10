#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const DEFAULT_FPS = 30;
const DEFAULT_TAIL_SECONDS = 0.7;

const semanticStages = [
  {
    key: 'notice',
    label: '公告',
    match: /公告|发布|院校|大学|招生|考试科目/,
    title: '院校考试科目调整',
    kicker: '考研快讯',
  },
  {
    key: 'subjects',
    label: '四门',
    match: /四门|数据结构|组成原理|计算机组成|操作系统|计算机网络|408体系/,
    title: '408 主要包括四门',
    kicker: '统考内容',
  },
  {
    key: 'action',
    label: '行动',
    match: /现在|抓紧|暑期|开始|系统学|立刻|建议|需要/,
    title: '现在就要抓紧调整',
    kicker: '行动提醒',
  },
  {
    key: 'impact',
    label: '影响',
    match: /同学|目标|来说|复习方向|及时调整|报考|备考/,
    title: '目标同学要调整复习方向',
    kicker: '影响对象',
  },
  {
    key: 'change',
    label: '变化',
    match: /调整为|改为|从|变为|自命题|统考|885|408/,
    title: '专业课科目发生变化',
    kicker: '第四科变化',
  },
];

const fallbackLabels = ['重点', '变化', '判断', '方法', '行动', '总结'];

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
    return normalizeText(input);
  }

  const bytes = Buffer.isBuffer(input) ? input : Buffer.from(input);
  const candidates = ['utf-8', 'gb18030', 'gbk'];

  for (const encoding of candidates) {
    try {
      const decoded = new TextDecoder(encoding, {fatal: encoding === 'utf-8'}).decode(bytes);
      const text = normalizeDocument(decoded);
      if (!/[�锟]/.test(text)) {
        return text;
      }
    } catch {
      // Try the next common Chinese transcript encoding.
    }
  }

  return normalizeDocument(bytes.toString('utf8'));
};

const parseTimecode = (value) => {
  const match = value.trim().match(/^(\d{2}):(\d{2}):(\d{2})[,.](\d{1,3})$/);
  if (!match) {
    throw new Error(`Invalid SRT timecode: ${value}`);
  }

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

  return blocks
    .map((block) => {
      const lines = block
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      const timingIndex = lines.findIndex((line) => line.includes('-->'));
      if (timingIndex === -1) {
        return null;
      }

      const [startRaw, endRaw] = lines[timingIndex].split(/\s*-->\s*/);
      const textLines = lines.slice(timingIndex + 1);
      const cueText = normalizeText(textLines.join(' ').replace(/<[^>]+>/g, ''));
      if (!cueText) {
        return null;
      }

      return {
        start: parseTimecode(startRaw),
        end: parseTimecode(endRaw.split(/\s+/)[0]),
        text: cueText,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.start - b.start);
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const fitText = (text, maxChars) => {
  const clean = normalizeText(text);
  if (clean.length <= maxChars) {
    return clean;
  }
  return `${clean.slice(0, maxChars - 1)}…`;
};

const classifyCue = (cue, index, cueCount) => {
  const semantic = semanticStages.find((stage) => stage.match.test(cue.text));
  if (semantic) {
    return semantic;
  }

  const bucket = Math.floor((index / Math.max(1, cueCount)) * fallbackLabels.length);
  const label = fallbackLabels[clamp(bucket, 0, fallbackLabels.length - 1)];
  return {
    key: `auto-${label}`,
    label,
    title: `${label}信息`,
    kicker: '知识讲解',
    fallback: true,
  };
};

const mergeGroups = (cues) => {
  const groups = [];
  cues.forEach((cue, index) => {
    let stage = classifyCue(cue, index, cues.length);
    if (stage.fallback && groups.length > 0) {
      stage = groups[groups.length - 1].semantic;
    }
    const previous = groups[groups.length - 1];
    if (previous && previous.semantic.key === stage.key) {
      previous.cues.push(cue);
      return;
    }

    groups.push({
      semantic: stage,
      cues: [cue],
    });
  });

  return groups;
};

const deriveMeta = (allText) => {
  const school = allText.includes('北京理工大学') || allText.includes('北理工') ? '北京理工大学' : '';
  const major = allText.includes('软件工程') || allText.includes('软工') ? '软件工程' : '';
  if (school && major) {
    return `${school} · ${major}`;
  }
  if (school) {
    return school;
  }
  if (allText.includes('408')) {
    return '计算机考研 · 408';
  }
  return '考研计算机 · 知识讲解';
};

const subjectPoints = (text) => {
  const subjects = [
    ['数据结构', /数据结构/],
    ['计算机组成原理', /计算机组成原理|组成原理/],
    ['操作系统', /操作系统/],
    ['计算机网络', /计算机网络/],
  ];
  const found = subjects.filter(([, pattern]) => pattern.test(text)).map(([subject]) => subject);
  return found.length >= 2 ? found : [];
};

const floorSeconds = (value) => Number((Math.floor(value * 1000) / 1000).toFixed(3));

const pointFromCue = (cue, text = cue.text, extra = {}) => ({
  text: fitText(text, 30),
  cueStart: floorSeconds(cue.start),
  cueEnd: floorSeconds(Math.max(cue.end, cue.start + 0.35)),
  ...extra,
});

const splitCueIntoPoints = (cue, labels) => {
  const span = Math.max(0.35, cue.end - cue.start);
  return labels.map((label, index) => {
    const start = floorSeconds(cue.start + (span * index) / labels.length);
    const end =
      index === labels.length - 1
        ? floorSeconds(cue.end)
        : floorSeconds(cue.start + (span * (index + 1)) / labels.length);
    return {
      text: label,
      cueStart: start,
      cueEnd: Math.max(end, floorSeconds(start + 0.25)),
    };
  });
};

const cueMatching = (cues, pattern, fallbackIndex = 0) =>
  cues.find((cue) => pattern.test(cue.text)) ?? cues[clamp(fallbackIndex, 0, cues.length - 1)] ?? cues[0];

const fillerPoints = (cues, labels) => {
  const start = cues[0]?.start ?? 0;
  const end = cues[cues.length - 1]?.end ?? start + labels.length;
  const span = Math.max(labels.length * 0.35, end - start);
  return labels.map((label, index) => {
    const cueStart = floorSeconds(start + (span * index) / labels.length);
    const cueEnd = floorSeconds(start + (span * (index + 1)) / labels.length);
    return {text: label, cueStart, cueEnd};
  });
};

const deriveMain = (semantic, texts) => {
  const combined = texts.join(' ');
  const subjects = subjectPoints(combined);
  if (subjects.length) {
    return subjects.join(' / ');
  }

  if (semantic.key === 'change') {
    const from885 = combined.includes('885') ? '885 软件工程专业基础综合' : '原专业课';
    const to408 = combined.includes('408') ? '408 计算机学科专业基础' : '新考试科目';
    return `${from885} → ${to408}`;
  }

  const longest = [...texts].sort((a, b) => b.length - a.length)[0] ?? combined;
  return fitText(longest, 34);
};

const derivePoints = (semantic, cues, main) => {
  const texts = cues.map((cue) => cue.text);
  const combined = texts.join(' ');
  const subjects = subjectPoints(combined);
  if (subjects.length) {
    const subjectCue = cues.find((cue) => subjectPoints(cue.text).length >= 2) ?? cues[cues.length - 1];
    return splitCueIntoPoints(subjectCue, subjects).map((point) => ({...point, tone: 'subject'}));
  }

  if (semantic.key === 'change' && combined.includes('408')) {
    return [
      pointFromCue(cueMatching(cues, /从|885|原/, 0), '专业课路线要切换', {tone: 'old'}),
      pointFromCue(cueMatching(cues, /调整为|改为|408/, 1), '复习资料要转向 408', {tone: 'new'}),
      pointFromCue(cueMatching(cues, /自命题|统考|专业课/, cues.length - 1), '训练题型要同步调整', {
        tone: 'urgent',
      }),
    ];
  }

  const points = cues
    .map((cue) => pointFromCue(cue, cue.text))
    .filter((point) => point.text && point.text !== main);

  if (points.length >= 2) {
    return points.slice(0, 4);
  }

  const fallback = [main, '先抓主线信息', '再落到复习动作'].filter(Boolean).slice(0, 3);
  return fillerPoints(cues, fallback);
};

const deriveStageTitle = (semantic, texts) => {
  const combined = texts.join(' ');
  if (semantic.key === 'notice' && /北京理工大学|北理工/.test(combined)) {
    return '北理工软件工程科目调整';
  }
  if (semantic.key === 'change' && combined.includes('885') && combined.includes('408')) {
    return '885 自命题改为 408 统考';
  }
  if (semantic.key === 'subjects') {
    return '408 主要包括四门';
  }
  if (semantic.key === 'action' && /暑期|抓紧/.test(combined)) {
    return '暑期还没系统学 408';
  }

  const first = texts[0] ?? semantic.title;
  return fitText(first, 22);
};

const buildStages = (cues) =>
  mergeGroups(cues).map((group, index) => {
    const texts = group.cues.map((cue) => cue.text);
    const start = group.cues[0].start;
    const end = group.cues[group.cues.length - 1].end;
    const main = deriveMain(group.semantic, texts);

    return {
      key: `${group.semantic.key.replace(/[^a-z0-9-]/gi, '')}-${index}`,
      start,
      end,
      label: group.semantic.label,
      title: deriveStageTitle(group.semantic, texts),
      kicker: group.semantic.kicker,
      main,
      points: derivePoints(group.semantic, group.cues, main),
      cueTexts: texts,
    };
  });

const findDefaultSrt = (projectDir) => {
  const publicDir = path.join(projectDir, 'public');
  const preferred = path.join(publicDir, 'script.srt');
  if (fs.existsSync(preferred)) {
    return preferred;
  }

  const match = fs
    .readdirSync(publicDir, {withFileTypes: true})
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.srt'))
    .map((entry) => path.join(publicDir, entry.name))
    .sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))[0];

  if (!match) {
    throw new Error(`No SRT file found in ${publicDir}. Put script.srt there or pass --srt.`);
  }

  return match;
};

const findDefaultAudio = (projectDir) => {
  const publicDir = path.join(projectDir, 'public');
  const preferred = path.join(publicDir, 'voice.mp3');
  if (fs.existsSync(preferred)) {
    return 'voice.mp3';
  }

  const match = fs
    .readdirSync(publicDir, {withFileTypes: true})
    .filter((entry) => entry.isFile() && /\.(mp3|wav|m4a|aac)$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))[0];

  if (!match) {
    throw new Error(`No audio file found in ${publicDir}. Put voice.mp3 there or pass --audio.`);
  }

  return match;
};

export const buildContentModel = (cues, options = {}) => {
  if (!Array.isArray(cues) || cues.length === 0) {
    throw new Error('No timed cues were parsed from the SRT file.');
  }

  const fps = Number(options.fps || DEFAULT_FPS);
  const normalizedCues = cues.map((cue) => ({...cue, text: normalizeText(cue.text)}));
  const allText = normalizedCues.map((cue) => cue.text).join(' ');
  const durationSeconds = Number((normalizedCues[normalizedCues.length - 1].end + DEFAULT_TAIL_SECONDS).toFixed(3));
  const stages = buildStages(normalizedCues);

  return {
    brand: options.title || (allText.includes('408') ? '408 考研快讯' : '考研知识讲解'),
    meta: deriveMeta(allText),
    badge: allText.includes('408') ? '408' : '考研',
    fps,
    durationSeconds,
    durationInFrames: Math.ceil(durationSeconds * fps),
    audioFile: options.audioFile || 'voice.mp3',
    stages,
    timeline: stages.map((stage) => ({
      key: stage.key,
      label: stage.label,
    })),
  };
};

const toTs = (model) => `export type GeneratedPoint = {
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

export const generatedVideo = ${JSON.stringify(model, null, 2)} satisfies GeneratedVideo;

export const generatedDurationInFrames = generatedVideo.durationInFrames;
export const generatedAudioFile = generatedVideo.audioFile;
`;

export const writeGeneratedContent = (options = {}) => {
  const projectDir = path.resolve(options.projectDir || process.cwd());
  const srcDir = path.join(projectDir, 'src');
  const srtPath = path.resolve(projectDir, options.srtPath || options.srt || findDefaultSrt(projectDir));
  const audioFile = options.audioFile || options.audio || findDefaultAudio(projectDir);
  const cues = parseSrt(fs.readFileSync(srtPath));
  const model = buildContentModel(cues, {
    fps: options.fps || DEFAULT_FPS,
    title: options.title,
    audioFile: path.basename(audioFile),
  });

  fs.mkdirSync(srcDir, {recursive: true});
  const generatedContentPath = path.join(srcDir, 'generatedContent.ts');
  fs.writeFileSync(generatedContentPath, toTs(model), 'utf8');

  return {
    projectDir,
    srtPath,
    generatedContentPath,
    model,
  };
};

const parseArgs = (argv) => {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) {
      continue;
    }
    const key = arg.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    const value = argv[index + 1] && !argv[index + 1].startsWith('--') ? argv[++index] : 'true';
    args[key] = value;
  }
  return args;
};

const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) {
  const args = parseArgs(process.argv.slice(2));
  const result = writeGeneratedContent({
    projectDir: args.projectDir,
    srtPath: args.srt,
    audioFile: args.audio,
    title: args.title,
    fps: args.fps ? Number(args.fps) : DEFAULT_FPS,
  });

  console.log(`Generated Remotion content: ${result.generatedContentPath}`);
  console.log(`Duration: ${result.model.durationInFrames} frames @ ${result.model.fps}fps`);
}
