export type VideoProfile = 'planning' | 'news' | 'knowledge';

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

export const generatedVideo: GeneratedVideo = {
  "profile": "knowledge",
  "profileConfidence": 1,
  "profileEvidence": [
    "explicit:knowledge"
  ],
  "brand": "408 知识讲解",
  "meta": "考研知识 · 结构化讲解",
  "badge": "考研",
  "fps": 30,
  "durationSeconds": 10,
  "durationInFrames": 300,
  "audioFile": "voice.mp3",
  "stages": [
    {
      "key": "knowledge-0",
      "start": 0,
      "end": 2,
      "label": "问题",
      "title": "先看要解决的问题",
      "kicker": "先看问题",
      "main": "为什么程序访问数组通常比链表更快？",
      "points": [
        {
          "text": "为什么程序访问数组通常比链表更快？",
          "cueStart": 0,
          "cueEnd": 2,
          "tone": "new"
        }
      ],
      "cueTexts": [
        "为什么程序访问数组通常比链表更快？"
      ]
    },
    {
      "key": "knowledge-1",
      "start": 2,
      "end": 6,
      "label": "概念",
      "title": "抓住核心概念",
      "kicker": "知识讲解",
      "main": "数组元素相邻，缓存一次可以带入多个元素。",
      "points": [
        {
          "text": "关键概念是局部性和连续内存布局。",
          "cueStart": 2,
          "cueEnd": 4,
          "tone": "new"
        },
        {
          "text": "数组元素相邻，缓存一次可以带入多个元素。",
          "cueStart": 4,
          "cueEnd": 6,
          "tone": "neutral"
        }
      ],
      "cueTexts": [
        "关键概念是局部性和连续内存布局。",
        "数组元素相邻，缓存一次可以带入多个元素。"
      ]
    },
    {
      "key": "knowledge-2",
      "start": 6,
      "end": 8,
      "label": "方法",
      "title": "把理解落到做题方法",
      "kicker": "知识讲解",
      "main": "做题时先判断访问模式，再分析时间和空间代价。",
      "points": [
        {
          "text": "做题时先判断访问模式，再分析时间和空间代价。",
          "cueStart": 6,
          "cueEnd": 8,
          "tone": "new"
        }
      ],
      "cueTexts": [
        "做题时先判断访问模式，再分析时间和空间代价。"
      ]
    },
    {
      "key": "knowledge-3",
      "start": 8,
      "end": 10,
      "label": "总结",
      "title": "收束成可复用结论",
      "kicker": "知识讲解",
      "main": "总结一下，数据结构性能要结合真实访问方式判断。",
      "points": [
        {
          "text": "总结一下，数据结构性能要结合真实访问方式判断。",
          "cueStart": 8,
          "cueEnd": 10,
          "tone": "new"
        }
      ],
      "cueTexts": [
        "总结一下，数据结构性能要结合真实访问方式判断。"
      ]
    }
  ],
  "timeline": [
    {
      "key": "knowledge-0",
      "label": "问题"
    },
    {
      "key": "knowledge-1",
      "label": "概念"
    },
    {
      "key": "knowledge-2",
      "label": "方法"
    },
    {
      "key": "knowledge-3",
      "label": "总结"
    }
  ]
};

export const generatedDurationInFrames = generatedVideo.durationInFrames;
export const generatedAudioFile = generatedVideo.audioFile;
