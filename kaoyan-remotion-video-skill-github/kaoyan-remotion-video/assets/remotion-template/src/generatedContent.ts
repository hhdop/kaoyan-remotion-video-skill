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

export const generatedVideo = {
  brand: '408 考研快讯',
  meta: '考研计算机 · 知识讲解',
  badge: '408',
  fps: 30,
  durationSeconds: 12,
  durationInFrames: 360,
  audioFile: 'voice.mp3',
  stages: [
    {
      key: 'notice-0',
      start: 0,
      end: 4,
      label: '公告',
      title: '把考试变化先听明白',
      kicker: '考研快讯',
      main: '先确认院校公告和考试科目',
      points: [
        {text: '看清目标院校', cueStart: 0, cueEnd: 1.333},
        {text: '确认专业方向', cueStart: 1.333, cueEnd: 2.666},
        {text: '标记第四科变化', cueStart: 2.666, cueEnd: 4},
      ],
      cueTexts: ['把考试变化先听明白'],
    },
    {
      key: 'change-1',
      start: 4,
      end: 8,
      label: '变化',
      title: '复习路线要跟着调整',
      kicker: '备考判断',
      main: '原专业课 → 408 计算机学科专业基础',
      points: [
        {text: '资料体系要切换', cueStart: 4, cueEnd: 5.333, tone: 'new'},
        {text: '训练题型要同步', cueStart: 5.333, cueEnd: 6.666},
        {text: '暑期节奏要重排', cueStart: 6.666, cueEnd: 8, tone: 'urgent'},
      ],
      cueTexts: ['复习路线要跟着调整'],
    },
    {
      key: 'action-2',
      start: 8,
      end: 12,
      label: '行动',
      title: '下一步先抓主线',
      kicker: '行动提醒',
      main: '把变化落到今天的学习计划',
      points: [
        {text: '先补基础框架', cueStart: 8, cueEnd: 9.333},
        {text: '同步做选择题', cueStart: 9.333, cueEnd: 10.666},
        {text: '别等开学后再改', cueStart: 10.666, cueEnd: 12, tone: 'urgent'},
      ],
      cueTexts: ['下一步先抓主线'],
    },
  ],
  timeline: [
    {key: 'notice-0', label: '公告'},
    {key: 'change-1', label: '变化'},
    {key: 'action-2', label: '行动'},
  ],
} satisfies GeneratedVideo;

export const generatedDurationInFrames = generatedVideo.durationInFrames;
export const generatedAudioFile = generatedVideo.audioFile;
