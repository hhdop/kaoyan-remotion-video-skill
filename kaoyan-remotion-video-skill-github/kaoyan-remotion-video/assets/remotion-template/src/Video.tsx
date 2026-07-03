import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

type StageKey = 'intro' | 'june' | 'july' | 'august' | 'strengthen' | 'papers' | 'summary';

type Section = {
  start: number;
  end: number;
  stage: StageKey;
  title: string;
  kicker: string;
  texts: string[];
};

type Cue = {
  start: number;
  end: number;
  stage: StageKey;
  title: string;
  kicker: string;
  text: string;
  sectionIndex: number;
  cueIndexInSection: number;
};

const sections: Section[] = [
  {
    start: 0,
    end: 7.15,
    stage: 'intro',
    title: '暑假前408一轮没过完，还有救吗？',
    kicker: '来得及，但7月必须这样补',
    texts: [
      '暑假前408一轮还没过完还来得及吗？',
      '先别急着问来不来得及。',
      '你现在最重要的是判断自己到底慢到什么程度。',
    ],
  },
  {
    start: 7.15,
    end: 39.95,
    stage: 'june',
    title: '6月底自查',
    kicker: '偏慢不等于没救',
    texts: [
      '这条视频直接按时间线做一遍408进度自查。',
      '看完你至少能知道三件事。',
      '现在应该学到哪，你目前算不算偏慢。',
      '如果已经慢了，接下来怎么补。',
      '先看现在这个时间点。',
      '如果到6月底，408基础一轮还没过完。',
      '客观讲，整体已经偏慢了。',
      '但偏慢不等于没救，关键看你是哪一种情况。',
      '如果你只差一门，或者只剩部分章节，7月集中补完就行。',
      '如果你现在只学完一门，或者四门都学得很零散。',
      '那7月必须明显加速。',
      '如果你课听了不少，但题基本没做。',
      '那问题不是进度，而是有效复习不足。',
      '接下来要优先补基础选择题。',
    ],
  },
  {
    start: 39.95,
    end: 64.3,
    stage: 'july',
    title: '7月底前，基础一轮尽量结束',
    kicker: '基础阶段抓三件事',
    texts: [
      '408到7月底比较合理的底线是。',
      '四门基础知识至少过完一轮。',
      '课后选择题要跟上。',
      '这里注意，不是让你把笔记写得很漂亮。',
      '也不是让你现在死磕大题。',
      '基础阶段最重要的是三件事。',
      '第一，主干知识过完。',
      '第二，没学完一章，立刻做对应选择题。',
      '第三，四门可以交叉推进，别一门拖太久。',
      '如果你现在偏慢，别再频繁换课、换书、换资料。',
      '固定一套资料，把剩下的科目和章节先补完。',
    ],
  },
  {
    start: 64.3,
    end: 81.9,
    stage: 'august',
    title: '8月初：回顾，不是重听',
    kicker: '查漏补缺',
    texts: [
      '到8月初，不是重新精听一遍基础课。',
      '这个阶段的任务是回顾。',
      '把第一轮遗忘的内容重新捡起来。',
      '把典型错题重新做一遍。',
      '重点看基础笔记、辅导书、错题。',
      '错题不要只看答案，最好遮住答案重新做。',
      '如果你7月底才勉强过完一轮，那也别慌。',
      '先用一到两周补漏洞，再进入强化。',
    ],
  },
  {
    start: 81.9,
    end: 106.1,
    stage: 'strengthen',
    title: '8月中旬到10月初：进入强化',
    kicker: '听课、做题、复盘连起来',
    texts: [
      '8月中旬到10月初，重点进入强化。',
      '这个阶段不能只听课。',
      '正确节奏应该是，听强化课、记方法。',
      '做对应题型，再复盘薄弱模块。',
      '这时候高频大题要开始练专题。',
      '训练也要启动，但不要盲目刷偏题。',
      '每天最好留半小时到一小时，滚动回顾基础知识。',
      '如果发现自己某个模块不会，就用题目反推知识点。',
      '哪里弱补哪里，不要全盘重学。',
      '10月中旬之后，就不能一直停留在强化题里了。',
    ],
  },
  {
    start: 106.1,
    end: 135.2,
    stage: 'papers',
    title: '10月中旬后：启动成套真题',
    kicker: '复盘比数量更重要',
    texts: [
      '这个阶段要启动成套真题训练。',
      '真题尽量按照正式考试时间做。',
      '练的是整张卷子的节奏。',
      '做完以后，复盘比刷题数量更重要。',
      '如果你强化题还没刷完，也不要等全部刷完再碰真题。',
      '后期最怕的不是题没刷够，而是一直不进入真题状态。',
      '知识点忘了，就回书本补章节。',
      '解题方法不会，就对照解析总结思路。',
      '11月中下旬开始，真题要二刷。',
      '但二刷不是背答案。',
      '你要检查的是，第一次错的题，现在能不能独立做出来。',
      '考前最后两周，重点回归书本、错题和笔记。',
    ],
  },
  {
    start: 135.2,
    end: 157.81,
    stage: 'summary',
    title: '慢了不可怕，可怕的是没计划地学',
    kicker: '当前目标：7月底收尾基础',
    texts: [
      '这个时候，不要大量换新资料。',
      '也不要突然刷一堆陌生难题。',
      '优先保真题、保高频、保主干内容。',
      '越到后期越要稳住已经能拿得分。',
      '所以暑假前一轮没过完确实偏慢。',
      '但现在真正该做的不是焦虑。',
      '而是把目标压到7月底。',
      '408四门基础一轮必须收尾。',
      '基础选择题必须补上。',
      '如果你现在还在反复换资料，反复听课不怎么做题。',
      '这才是最需要立刻调整的地方。',
    ],
  },
];

const audioDurationSeconds = 157.81;

const makeCues = () => {
  return sections.flatMap((section, sectionIndex) => {
    const weights = section.texts.map((text) => Math.max(10, text.length));
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let cursor = section.start;

    return section.texts.map((text, cueIndexInSection) => {
      const isLast = cueIndexInSection === section.texts.length - 1;
      const duration = ((section.end - section.start) * weights[cueIndexInSection]) / totalWeight;
      const start = cursor;
      const end = isLast ? Math.min(section.end, audioDurationSeconds) : cursor + duration;
      cursor = end;

      return {
        start,
        end,
        stage: section.stage,
        title: section.title,
        kicker: section.kicker,
        text,
        sectionIndex,
        cueIndexInSection,
      };
    });
  });
};

const cues: Cue[] = makeCues();

const timeline = [
  {label: '6月底', key: 'june'},
  {label: '7月底', key: 'july'},
  {label: '8月初', key: 'august'},
  {label: '8-10月', key: 'strengthen'},
  {label: '10月后', key: 'papers'},
  {label: '11月后', key: 'summary'},
] as const;

const palette = {
  bg: '#f4eddf',
  ink: '#263648',
  muted: '#756f64',
  line: '#53606c',
  card: '#fff9ec',
  blue: '#263648',
  yellow: '#f0bd32',
  softBlue: '#fff9ec',
  paleYellow: '#f0bd32',
  grid: '#ded3bd',
  red: '#ef3b2d',
  shadow: 'rgba(38,54,72,0.58)',
};

const visualLeadSeconds = 0.1;
const sectionTransitionSeconds = 0.52;

const smoothProgress = (frame: number, start: number, end: number) => {
  return interpolate(frame, [start, end], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
};

const currentCue = (sec: number) => {
  return cues.find((cue) => sec >= cue.start && sec < cue.end) ?? cues[cues.length - 1];
};

const cueStartIncludes = (snippet: string) => {
  return cues.find((cue) => cue.text.includes(snippet))?.start ?? 999;
};

const currentSection = (sec: number) => {
  return sections.find((section) => sec >= section.start && sec < section.end) ?? sections[sections.length - 1];
};

const activeTimelineIndex = (stage: StageKey) => {
  if (stage === 'intro') {
    return -1;
  }
  if (stage === 'summary') {
    return timeline.length - 1;
  }
  return timeline.findIndex((item) => item.key === stage);
};

const timelineProgress = (sec: number) => {
  return interpolate(sec, [sections[1].start, sections[sections.length - 1].end], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
};

const entranceSpring = (frame: number, start: number, fps: number, offset = 8) => {
  return spring({
    fps,
    frame: Math.max(0, frame - start * fps + offset),
    config: {damping: 18, stiffness: 120, mass: 0.82},
    durationInFrames: 22,
  });
};

const beatSpring = (frame: number, start: number, fps: number) => {
  return spring({
    fps,
    frame: Math.max(0, frame - start * fps + 6),
    config: {damping: 16, stiffness: 190, mass: 0.7},
    durationInFrames: 10,
  });
};

const itemStyle = (active: boolean, pulse: boolean, beat: number): React.CSSProperties => ({
  opacity: active ? interpolate(pulse ? beat : 1, [0, 1], [0.56, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 0.56,
  transform: `translate(${active ? 0 : 10}px, ${active ? interpolate(pulse ? beat : 1, [0, 1], [14, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 14}px) scale(${pulse ? interpolate(beat, [0, 0.7, 1], [0.985, 1.025, 1]) : 1})`,
  backgroundColor: active ? palette.yellow : palette.card,
  borderColor: palette.ink,
  boxShadow: active ? `7px 7px 0 ${palette.shadow}` : '5px 5px 0 rgba(38,54,72,0.28)',
});

const CheckCards: React.FC<{sec: number; beat: number}> = ({sec, beat}) => {
  const cards = [
    {at: cueStartIncludes('只差一门'), title: '只差一门', body: '7月集中补完'},
    {at: cueStartIncludes('只学完一门'), title: '只学完一门', body: '7月必须加速'},
    {at: cueStartIncludes('课听了不少'), title: '只听课不做题', body: '优先补选择题'},
  ];

  return (
    <div style={styles.grid3}>
      {cards.map((card) => {
        const active = sec >= card.at;
        const pulse = sec >= card.at && sec < card.at + 1.2;
        return (
          <div key={card.title} style={{...styles.smallCard, ...itemStyle(active, pulse, beat)}}>
            <ActiveMark active={active} pulse={pulse} beat={beat} />
            <div style={styles.smallTitle}>{card.title}</div>
            <div style={styles.smallBody}>{card.body}</div>
          </div>
        );
      })}
    </div>
  );
};

const JulyCards: React.FC<{sec: number; beat: number}> = ({sec, beat}) => {
  const cards = [
    {at: cueStartIncludes('四门基础知识'), text: '四门基础过完'},
    {at: cueStartIncludes('课后选择题'), text: '课后选择题跟上'},
    {at: cueStartIncludes('死磕大题'), text: '不要死磕大题'},
  ];

  return (
    <div style={styles.grid3}>
      {cards.map((card, index) => {
        const active = sec >= card.at;
        const pulse = sec >= card.at && sec < card.at + 1.2;
        return (
          <div key={card.text} style={{...styles.smallCard, ...itemStyle(active, pulse, beat)}}>
            <ActiveMark active={active} pulse={pulse} beat={beat} />
            <div style={styles.badge}>{index + 1}</div>
            <div style={styles.smallBody}>{card.text}</div>
          </div>
        );
      })}
    </div>
  );
};

const AugustReview: React.FC<{sec: number; beat: number}> = ({sec, beat}) => {
  const cards = [
    {at: cueStartIncludes('基础笔记'), title: '笔记', body: '主干知识回看'},
    {at: cueStartIncludes('典型错题'), title: '错题', body: '遮住答案重做'},
    {at: cueStartIncludes('辅导书'), title: '辅导书', body: '补薄弱章节'},
  ];

  return (
    <div style={styles.iconRow}>
      {cards.map((card) => {
        const active = sec >= card.at;
        const pulse = sec >= card.at && sec < card.at + 1.2;
        return (
          <div key={card.title} style={{...styles.iconCard, ...itemStyle(active, pulse, beat)}}>
            <ActiveMark active={active} pulse={pulse} beat={beat} />
            <div style={{...styles.iconBox, backgroundColor: active ? palette.blue : '#b9c6d8'}}>{card.title.slice(0, 1)}</div>
            <div style={styles.smallTitle}>{card.title}</div>
            <div style={styles.note}>{card.body}</div>
          </div>
        );
      })}
    </div>
  );
};

const StrengthenFlow: React.FC<{sec: number; beat: number}> = ({sec, beat}) => {
  const items = [
    {at: cueStartIncludes('听强化课'), text: '听强化课', key: '强化'},
    {at: cueStartIncludes('做对应题型'), text: '做对应题型', key: '题型'},
    {at: cueStartIncludes('复盘薄弱模块'), text: '复盘薄弱模块', key: '复盘'},
  ];

  return (
    <div style={styles.flow}>
      {items.map((item, index) => {
        const active = sec >= item.at;
        return (
          <React.Fragment key={item.text}>
            <div
              style={{
                ...styles.flowNode,
                backgroundColor: active ? palette.blue : palette.softBlue,
                color: active ? '#fff' : palette.ink,
                transform: `scale(${active && sec >= item.at && sec < item.at + 1.2 ? interpolate(beat, [0, 0.7, 1], [0.98, 1.035, 1]) : 1})`,
              }}
            >
              <div style={styles.flowKey}>{item.key}</div>
              <div>{item.text}</div>
            </div>
            {index < items.length - 1 ? <div style={styles.arrow}>→</div> : null}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const PaperCards: React.FC<{sec: number; beat: number}> = ({sec, beat}) => {
  const cards = [
    {at: cueStartIncludes('正式考试时间'), title: '试卷', body: '按正式考试时间做'},
    {at: cueStartIncludes('整张卷子'), title: '计时器', body: '练整张卷子的节奏'},
    {at: cueStartIncludes('复盘比刷题数量'), title: '复盘卡', body: '复盘比数量更重要'},
  ];

  return (
    <div style={styles.grid3}>
      {cards.map((card) => {
        const active = sec >= card.at;
        const pulse = sec >= card.at && sec < card.at + 1.2;
        return (
          <div key={card.title} style={{...styles.smallCard, ...itemStyle(active, pulse, beat)}}>
            <ActiveMark active={active} pulse={pulse} beat={beat} />
            <div style={styles.smallTitle}>{card.title}</div>
            <div style={styles.smallBody}>{card.body}</div>
          </div>
        );
      })}
    </div>
  );
};

const SummaryPanel: React.FC<{cue: Cue; beat: number}> = ({cue, beat}) => {
  const finalGoal = cue.text.includes('7月底') || cue.text.includes('必须收尾') || cue.text.includes('必须补上');
  return (
    <div style={styles.summaryBox}>
      <div style={{...styles.summaryText, transform: `scale(${finalGoal ? interpolate(beat, [0, 1], [0.98, 1.03]) : 1})`}}>
        当前目标：7月底前完成408基础一轮
      </div>
      <div style={styles.summarySub}>基础选择题必须补上</div>
    </div>
  );
};

const IntroPanel: React.FC<{cue: Cue; beat: number}> = ({cue, beat}) => {
  const showAnswer = cue.cueIndexInSection >= 1;
  return (
    <div style={styles.hookBox}>
      <div style={{...styles.hookStamp, transform: `rotate(-4deg) scale(${interpolate(beat, [0, 0.6, 1], [0.88, 1.08, 1])})`}}>
        还来得及
      </div>
      <div style={{...styles.alertBadge, transform: `scale(${interpolate(beat, [0, 0.65, 1], [0.95, 1.08, 1])})`}}>
        6月底自查
      </div>
      <div style={styles.hookQuestion}>一轮没过完</div>
      <div
        style={{
          ...styles.hookAnswer,
          opacity: showAnswer ? 1 : 0.36,
          transform: `translateY(${showAnswer ? 0 : 12}px) scale(${interpolate(beat, [0, 0.65, 1], [0.96, 1.04, 1])})`,
        }}
      >
        还有救，但7月必须补
      </div>
    </div>
  );
};

const stageMarks: Record<StageKey, string> = {
  intro: '自查',
  june: '06',
  july: '07',
  august: '08',
  strengthen: '8-10',
  papers: '10+',
  summary: '11+',
};

const ActiveMark: React.FC<{active: boolean; pulse: boolean; beat: number}> = ({active, pulse, beat}) => {
  if (!active) {
    return null;
  }

  return (
    <div
      style={{
        ...styles.activeMark,
        transform: `rotate(-8deg) scale(${pulse ? interpolate(beat, [0, 0.65, 1], [0.84, 1.12, 1]) : 1})`,
      }}
    >
      ✓
    </div>
  );
};

const MainPanel: React.FC<{cue: Cue; sec: number; beat: number}> = ({cue, sec, beat}) => {
  if (cue.stage === 'june') {
    return <CheckCards sec={sec} beat={beat} />;
  }
  if (cue.stage === 'july') {
    return <JulyCards sec={sec} beat={beat} />;
  }
  if (cue.stage === 'august') {
    return <AugustReview sec={sec} beat={beat} />;
  }
  if (cue.stage === 'strengthen') {
    return <StrengthenFlow sec={sec} beat={beat} />;
  }
  if (cue.stage === 'papers') {
    return <PaperCards sec={sec} beat={beat} />;
  }
  if (cue.stage === 'summary') {
    return <SummaryPanel cue={cue} beat={beat} />;
  }
  return <IntroPanel cue={cue} beat={beat} />;
};

export const MainVideo: React.FC<{audioSrc: string}> = ({audioSrc}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const canvasScale = Math.min(width / 1280, height / 720);
  const sec = frame / fps;
  const displaySec = sec + visualLeadSeconds;
  const cue = currentCue(displaySec);
  const section = sections[cue.sectionIndex];
  const sectionStart = cues.find((item) => item.sectionIndex === cue.sectionIndex)?.start ?? section.start;

  const sectionEntry = entranceSpring(frame, sectionStart - visualLeadSeconds, fps);
  const cueBeat = beatSpring(frame, cue.start - visualLeadSeconds, fps);
  const sectionBeat = beatSpring(frame, sectionStart - visualLeadSeconds, fps);
  const cardOpacity = interpolate(sectionEntry, [0, 1], [0, 1]);
  const cardY = interpolate(sectionEntry, [0, 1], [24, 0]);
  const sectionFlash = interpolate(sectionBeat, [0, 0.35, 1], [0, 0.85, 0]);
  const sweepX = interpolate(sectionBeat, [0, 1], [-24, 124]);
  const transitionFrames = sectionTransitionSeconds * fps;
  const sectionFrame = Math.max(0, frame - (sectionStart - visualLeadSeconds) * fps);
  const transitionProgress = smoothProgress(sectionFrame, 0, transitionFrames);
  const previousCue = cue.sectionIndex > 0 ? currentCue(Math.max(0, sectionStart - 0.02)) : null;
  const isSectionTransition = previousCue !== null && sectionFrame < transitionFrames;
  const currentLayerOpacity = isSectionTransition
    ? interpolate(transitionProgress, [0.24, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})
    : 1;
  const previousLayerOpacity = isSectionTransition
    ? interpolate(transitionProgress, [0, 0.46], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})
    : 0;
  const currentLayerY = isSectionTransition ? interpolate(transitionProgress, [0.2, 1], [24, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 0;
  const previousLayerY = isSectionTransition ? interpolate(transitionProgress, [0, 0.55], [0, -18], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 0;
  const currentLayerScale = isSectionTransition ? interpolate(transitionProgress, [0.2, 1], [0.988, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 1;
  const previousLayerScale = isSectionTransition ? interpolate(transitionProgress, [0, 0.55], [1, 0.994], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 1;
  const currentWatermarkOpacity = cue.stage === 'intro' ? 0 : currentLayerOpacity * 0.1;
  const previousWatermarkOpacity = previousCue && previousCue.stage !== 'intro' ? previousLayerOpacity * 0.08 : 0;
  const activeIndex = activeTimelineIndex(cue.stage);
  const progress = timelineProgress(displaySec);

  const renderSectionLayer = (
    layerCue: Cue,
    layerSec: number,
    beat: number,
    layerStyle: React.CSSProperties,
  ) => (
    <div style={{...styles.sectionLayer, ...layerStyle}}>
      <div style={styles.kicker}>{layerCue.kicker}</div>
      <h1 style={{...styles.title, transform: `translateX(${interpolate(sectionBeat, [0, 1], [-10, 0])}px)`}}>
        {layerCue.title}
      </h1>
      <MainPanel cue={layerCue} sec={layerSec} beat={beat} />
    </div>
  );

  return (
    <AbsoluteFill style={styles.root}>
      <Audio src={audioSrc} />
      <div style={{...styles.canvas, transform: `scale(${canvasScale})`}}>
      <div style={styles.paperFrame} />
      <div style={styles.topBar}>
        <div style={styles.headerStack}>
          <div style={styles.brand}>408考研进度自查</div>
          <div style={styles.meta}>暑假前自查 / 7月补进度</div>
        </div>
        <div style={styles.avatarBadge}>408</div>
      </div>

      <div
        style={{
          ...styles.stageSweep,
          opacity: sectionFlash,
          transform: `translateX(${sweepX}%)`,
        }}
      />

      <div style={styles.timeline}>
        <div style={styles.timelineTrack}>
          <div style={{...styles.timelineFill, transform: `scaleX(${progress})`}} />
        </div>
        {timeline.map((item, index) => {
          const active = index <= activeIndex;
          const current = index === activeIndex;
          return (
            <div key={item.key} style={{...styles.timeItem, opacity: active ? 1 : 0.76}}>
              <div
                style={{
                  ...styles.dot,
                  backgroundColor: active ? palette.yellow : '#fff9ec',
                  transform: `scale(${current ? interpolate(sectionBeat, [0, 0.65, 1], [1, 1.25, 1.12]) : active ? 1.08 : 1})`,
                }}
              />
              <div style={{...styles.timeLabel, color: active ? palette.yellow : '#fff9ec', fontWeight: active ? 900 : 700}}>
                {item.label}
              </div>
              {index < timeline.length - 1 ? <div style={styles.timeLine} /> : null}
            </div>
          );
        })}
      </div>

      <main style={{...styles.card, opacity: cardOpacity, transform: `translateY(${cardY}px)`}}>
        {previousCue ? (
          <div
            style={{
              ...styles.stageWatermark,
              opacity: previousWatermarkOpacity,
              transform: `translateY(${previousLayerY}px) scale(${previousLayerScale})`,
            }}
          >
            {stageMarks[previousCue.stage]}
          </div>
        ) : null}
        <div
          style={{
            ...styles.stageWatermark,
            opacity: currentWatermarkOpacity,
            transform: `translateY(${currentLayerY}px) scale(${currentLayerScale})`,
          }}
        >
          {stageMarks[cue.stage]}
        </div>
        <div
          style={{
            ...styles.stageAccent,
            opacity: interpolate(sectionBeat, [0, 1], [0.35, 1]),
            transform: `scaleY(${interpolate(sectionBeat, [0, 1], [0.35, 1])})`,
          }}
        />
        {previousCue
          ? renderSectionLayer(previousCue, Math.max(0, sectionStart - 0.02), 1, {
              opacity: previousLayerOpacity,
              transform: `translateY(${previousLayerY}px) scale(${previousLayerScale})`,
            })
          : null}
        {renderSectionLayer(cue, displaySec, cueBeat, {
          opacity: currentLayerOpacity,
          transform: `translateY(${currentLayerY}px) scale(${currentLayerScale})`,
        })}
      </main>
      </div>
    </AbsoluteFill>
  );
};

const styles: Record<string, React.CSSProperties> = {
  root: {
    backgroundColor: palette.bg,
    color: palette.ink,
    fontFamily: '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", Arial, sans-serif',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    display: 'flex',
  },
  canvas: {
    width: 1280,
    height: 720,
    position: 'relative',
    backgroundColor: palette.bg,
    backgroundImage: `linear-gradient(${palette.grid} 1px, transparent 1px), linear-gradient(90deg, ${palette.grid} 1px, transparent 1px), linear-gradient(rgba(222,211,189,0.48) 1px, transparent 1px), linear-gradient(90deg, rgba(222,211,189,0.48) 1px, transparent 1px)`,
    backgroundSize: '34px 34px, 34px 34px, 8px 8px, 8px 8px',
    overflow: 'hidden',
    transformOrigin: 'center center',
  },
  paperFrame: {
    position: 'absolute',
    left: 36,
    top: 48,
    right: 36,
    bottom: 62,
    border: `4px solid ${palette.ink}`,
    boxShadow: '12px 12px 0 rgba(38,54,72,0.44)',
    pointerEvents: 'none',
    zIndex: 0,
  },
  topBar: {
    position: 'absolute',
    top: 70,
    left: 68,
    right: 78,
    height: 104,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 0,
    borderBottom: 'none',
    boxSizing: 'border-box',
    zIndex: 5,
  },
  headerStack: {
    width: 500,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  brand: {
    height: 58,
    display: 'flex',
    alignItems: 'center',
    padding: '0 22px',
    backgroundColor: palette.ink,
    color: '#fffaf0',
    border: `4px solid ${palette.ink}`,
    boxShadow: '6px 6px 0 rgba(38,54,72,0.5)',
    fontSize: 31,
    fontWeight: 900,
  },
  meta: {
    height: 38,
    display: 'flex',
    alignItems: 'center',
    padding: '0 16px',
    backgroundColor: palette.yellow,
    border: `4px solid ${palette.ink}`,
    boxShadow: '6px 6px 0 rgba(38,54,72,0.48)',
    color: palette.ink,
    fontFamily: '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", Arial, sans-serif',
    fontSize: 19,
    fontWeight: 900,
  },
  avatarBadge: {
    width: 136,
    height: 136,
    borderRadius: 999,
    border: `4px solid ${palette.ink}`,
    display: 'grid',
    placeItems: 'center',
    backgroundColor: '#fff9ec',
    color: palette.ink,
    fontSize: 35,
    fontWeight: 950,
    boxShadow: '7px 7px 0 rgba(38,54,72,0.38)',
  },
  timeline: {
    position: 'absolute',
    left: 52,
    right: 52,
    bottom: 16,
    height: 52,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 28px',
    backgroundColor: 'rgba(38,54,72,0.58)',
    borderTop: '3px solid rgba(38,54,72,0.64)',
    borderLeft: '3px solid rgba(38,54,72,0.42)',
    borderRight: '3px solid rgba(38,54,72,0.42)',
    boxShadow: 'none',
    zIndex: 5,
  },
  timelineTrack: {
    position: 'absolute',
    left: 38,
    right: 38,
    bottom: 9,
    height: 6,
    backgroundColor: 'rgba(255,249,236,0.36)',
    overflow: 'hidden',
    zIndex: 0,
  },
  timelineFill: {
    width: '100%',
    height: '100%',
    backgroundColor: palette.yellow,
    transformOrigin: 'left center',
  },
  stageSweep: {
    position: 'absolute',
    top: 176,
    left: '-28%',
    width: '32%',
    height: 6,
    borderRadius: 0,
    background: palette.yellow,
    zIndex: 6,
  },
  timeItem: {
    display: 'flex',
    alignItems: 'center',
    position: 'relative',
    zIndex: 1,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 0,
    border: `2px solid ${palette.ink}`,
    boxShadow: 'none',
  },
  timeLabel: {
    fontSize: 16,
    marginLeft: 8,
    whiteSpace: 'nowrap',
    color: '#fff9ec',
  },
  timeLine: {
    width: 62,
    height: 3,
    margin: '0 13px',
    borderRadius: 0,
    backgroundColor: 'rgba(255,249,236,0.5)',
  },
  card: {
    position: 'absolute',
    left: 230,
    top: 248,
    width: 820,
    height: 316,
    margin: 0,
    backgroundColor: palette.card,
    border: `4px solid ${palette.ink}`,
    borderRadius: 0,
    boxShadow: '9px 9px 0 rgba(38,54,72,0.48)',
    padding: 0,
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: 22,
    overflow: 'hidden',
  },
  stageAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 0,
    backgroundColor: palette.yellow,
    transformOrigin: 'center top',
  },
  stageWatermark: {
    position: 'absolute',
    right: 22,
    bottom: -18,
    color: palette.blue,
    fontSize: 104,
    fontWeight: 950,
    lineHeight: 1,
    pointerEvents: 'none',
    zIndex: 0,
  },
  sectionLayer: {
    position: 'absolute',
    left: 28,
    right: 28,
    top: 26,
    bottom: 26,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    transformOrigin: 'center center',
    willChange: 'opacity, transform',
    zIndex: 2,
  },
  kicker: {
    alignSelf: 'flex-start',
    minHeight: 28,
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 9px 3px',
    backgroundColor: palette.yellow,
    border: `3px solid ${palette.ink}`,
    boxShadow: '4px 4px 0 rgba(38,54,72,0.32)',
    color: palette.ink,
    fontSize: 18,
    fontWeight: 900,
    lineHeight: 1,
    whiteSpace: 'nowrap',
  },
  title: {
    margin: 0,
    fontSize: 35,
    lineHeight: 1.12,
    color: palette.ink,
    letterSpacing: 0,
    transformOrigin: 'left center',
  },
  grid3: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 14,
    flex: 1,
    alignItems: 'stretch',
  },
  smallCard: {
    position: 'relative',
    borderRadius: 0,
    border: `4px solid ${palette.ink}`,
    padding: '18px 18px 16px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: 14,
    overflow: 'hidden',
  },
  activeMark: {
    position: 'absolute',
    right: 16,
    top: 14,
    width: 24,
    height: 24,
    borderRadius: 0,
    display: 'grid',
    placeItems: 'center',
    backgroundColor: palette.red,
    border: `4px solid ${palette.ink}`,
    color: '#fff9ec',
    fontSize: 14,
    fontWeight: 950,
    boxShadow: '4px 4px 0 rgba(38,54,72,0.36)',
  },
  smallTitle: {
    fontSize: 20,
    fontWeight: 900,
    color: palette.blue,
  },
  smallBody: {
    fontSize: 22,
    lineHeight: 1.22,
    fontWeight: 800,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 0,
    display: 'grid',
    placeItems: 'center',
    backgroundColor: palette.yellow,
    border: `3px solid ${palette.ink}`,
    color: palette.ink,
    fontFamily: 'Consolas, "Courier New", monospace',
    fontSize: 19,
    fontWeight: 900,
  },
  iconRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 14,
  },
  iconCard: {
    position: 'relative',
    minHeight: 166,
    borderRadius: 0,
    border: `4px solid ${palette.ink}`,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 0,
    border: `4px solid ${palette.ink}`,
    display: 'grid',
    placeItems: 'center',
    color: '#fff',
    fontSize: 26,
    fontWeight: 900,
  },
  note: {
    fontSize: 17,
    color: palette.muted,
    fontWeight: 700,
  },
  flow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    flex: 1,
  },
  flowNode: {
    width: 188,
    height: 118,
    borderRadius: 0,
    border: `4px solid ${palette.ink}`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    fontWeight: 900,
    gap: 10,
    boxShadow: '6px 6px 0 rgba(38,54,72,0.42)',
  },
  flowKey: {
    fontSize: 28,
    color: palette.yellow,
  },
  arrow: {
    fontSize: 32,
    color: palette.muted,
    fontWeight: 900,
  },
  questionBox: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  questionBubble: {
    fontSize: 31,
    fontWeight: 900,
    color: palette.blue,
    backgroundColor: palette.softBlue,
    borderRadius: 18,
    padding: '28px 34px',
  },
  answerLine: {
    fontSize: 28,
    fontWeight: 800,
  },
  hookBox: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: '120px 1fr 1fr',
    alignItems: 'center',
    gap: 14,
  },
  hookStamp: {
    position: 'absolute',
    right: 30,
    top: 22,
    padding: '7px 12px',
    borderRadius: 0,
    backgroundColor: palette.yellow,
    border: `4px solid ${palette.ink}`,
    color: palette.ink,
    fontSize: 20,
    fontWeight: 950,
    boxShadow: '5px 5px 0 rgba(38,54,72,0.4)',
    zIndex: 2,
  },
  alertBadge: {
    height: 86,
    borderRadius: 0,
    display: 'grid',
    placeItems: 'center',
    backgroundColor: palette.paleYellow,
    border: `4px solid ${palette.ink}`,
    color: palette.blue,
    fontSize: 21,
    fontWeight: 900,
    boxShadow: '5px 5px 0 rgba(38,54,72,0.38)',
  },
  hookQuestion: {
    height: 92,
    borderRadius: 0,
    display: 'grid',
    placeItems: 'center',
    backgroundColor: palette.blue,
    color: '#fff',
    border: `4px solid ${palette.ink}`,
    fontSize: 29,
    fontWeight: 950,
    boxShadow: '5px 5px 0 rgba(38,54,72,0.42)',
  },
  hookAnswer: {
    height: 92,
    borderRadius: 0,
    display: 'grid',
    placeItems: 'center',
    backgroundColor: palette.yellow,
    color: palette.ink,
    border: `4px solid ${palette.ink}`,
    fontSize: 23,
    fontWeight: 950,
    boxShadow: '5px 5px 0 rgba(38,54,72,0.4)',
  },
  summaryBox: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 0,
    backgroundColor: palette.yellow,
    border: `4px solid ${palette.ink}`,
    boxShadow: '7px 7px 0 rgba(38,54,72,0.42)',
    gap: 14,
  },
  summaryText: {
    fontSize: 30,
    fontWeight: 900,
    color: palette.ink,
  },
  summarySub: {
    fontSize: 22,
    fontWeight: 900,
    color: palette.ink,
  },
};
