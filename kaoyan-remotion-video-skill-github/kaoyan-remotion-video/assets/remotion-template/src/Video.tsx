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
import {generatedVideo, type GeneratedPoint, type GeneratedStage} from './generatedContent';

const stages = generatedVideo.stages;
const timeline = generatedVideo.timeline;
const audioDurationSeconds = generatedVideo.durationSeconds;
const visualLeadSeconds = 0.1;

const palette = {
  bg: '#f4eddf',
  ink: '#263648',
  muted: '#756f64',
  grid: '#ded3bd',
  card: '#fff9ec',
  yellow: '#f0bd32',
  red: '#ef3b2d',
  shadow: 'rgba(38,54,72,0.46)',
};

const getStage = (sec: number) =>
  stages.find((stage) => sec >= stage.start && sec < stage.end) ?? stages[stages.length - 1];

const getStageIndex = (stage: GeneratedStage) => stages.findIndex((item) => item.key === stage.key);

const clampProgress = (value: number, input: [number, number], output: [number, number]) =>
  interpolate(value, input, output, {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

const cueProgress = (sec: number, start: number, duration = 0.48) =>
  interpolate(sec, [start, start + duration], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

const cueHoldProgress = (sec: number, point: GeneratedPoint) =>
  interpolate(sec, [point.cueStart, point.cueEnd], [0.08, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

const pop = (frame: number, startSeconds: number, fps: number) =>
  spring({
    frame: Math.max(0, frame - startSeconds * fps),
    fps,
    config: {damping: 16, stiffness: 170, mass: 0.72},
    durationInFrames: 18,
  });

const fontSizeFor = (text: string, large: number, medium: number, small: number) => {
  if (text.length > 32) {
    return small;
  }
  if (text.length > 20) {
    return medium;
  }
  return large;
};

const hasSubjectList = (stage: GeneratedStage) =>
  stage.points.length >= 4 && /数据结构|组成原理|操作系统|计算机网络/.test(stage.points.map((point) => point.text).join(' '));

const splitCompare = (text: string) => {
  const [from, to] = text.split(/→|->|调整为|改为/).map((part) => part.trim());
  return {
    from: from || '原专业课',
    to: to || text,
  };
};

const CompareVisual: React.FC<{stage: GeneratedStage; beat: number}> = ({stage, beat}) => {
  const {from, to} = splitCompare(stage.main);

  return (
    <div style={styles.compare}>
      <div style={styles.oldBox}>
        <span style={styles.boxLabel}>原方向</span>
        <strong style={styles.compareStrong}>{from.includes('885') ? '885' : '原科目'}</strong>
        <small style={styles.compareSmall}>{from.replace(/^885\s*/, '')}</small>
      </div>
      <div style={styles.arrow}>→</div>
      <div style={{...styles.newBox, transform: `scale(${clampProgress(beat, [0, 1], [0.98, 1.03])})`}}>
        <span style={styles.boxLabel}>调整后</span>
        <strong style={styles.compareStrong}>{to.includes('408') ? '408' : '新方向'}</strong>
        <small style={styles.compareSmall}>{to.replace(/^408\s*/, '')}</small>
      </div>
    </div>
  );
};

const SubjectGrid: React.FC<{stage: GeneratedStage; sec: number}> = ({stage, sec}) => (
  <div style={styles.subjectGrid}>
    {stage.points.slice(0, 4).map((point, index) => {
      const active = sec >= point.cueStart;
      const entry = cueProgress(sec, point.cueStart, 0.5);
      const hold = cueHoldProgress(sec, point);
      return (
        <div
          key={point.text}
          style={{
            ...styles.subjectCard,
            opacity: clampProgress(entry, [0, 1], [0.42, 1]),
            transform: `translateY(${clampProgress(entry, [0, 1], [24, 0])}px)`,
            backgroundColor: active ? palette.yellow : palette.card,
          }}
        >
          <div style={styles.subjectIndex}>{index + 1}</div>
          <div>{point.shortText ?? point.text}</div>
          <div style={styles.subjectMeter}>
            <span style={{...styles.subjectMeterFill, transform: `scaleX(${active ? hold : 0})`}} />
          </div>
        </div>
      );
    })}
  </div>
);

const PointStack: React.FC<{stage: GeneratedStage; sec: number}> = ({stage, sec}) => {
  return (
    <div style={styles.pointStack}>
      {stage.points.slice(0, 4).map((point, index) => {
        const active = sec >= point.cueStart;
        const entry = cueProgress(sec, point.cueStart + index * 0.025, 0.5);
        const hold = cueHoldProgress(sec, point);
        return (
          <div
            key={`${point.text}-${index}`}
            style={{
              ...styles.pointRow,
              opacity: clampProgress(entry, [0, 1], [0.45, 1]),
              transform: `translateX(${clampProgress(entry, [0, 1], [18, 0])}px)`,
              backgroundColor: active ? palette.yellow : palette.card,
              fontSize: fontSizeFor(point.shortText ?? point.text, 19, 17, 15),
            }}
          >
            <span style={styles.check}>{active ? '✓' : index + 1}</span>
            <span style={styles.pointCopy}>{point.shortText ?? point.text}</span>
            <span style={styles.pointMeter}>
              <span style={{...styles.pointMeterFill, transform: `scaleX(${active ? hold : 0})`}} />
            </span>
          </div>
        );
      })}
    </div>
  );
};

const StageVisual: React.FC<{stage: GeneratedStage; sec: number; beat: number}> = ({stage, sec, beat}) => {
  if (stage.main.includes('→') || stage.label === '变化') {
    return <CompareVisual stage={stage} beat={beat} />;
  }

  if (hasSubjectList(stage)) {
    return <SubjectGrid stage={stage} sec={sec} />;
  }

  return <PointStack stage={stage} sec={sec} />;
};

export const MainVideo: React.FC<{audioSrc: string}> = ({audioSrc}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const sec = frame / fps;
  const displaySec = sec + visualLeadSeconds;
  const stage = getStage(displaySec);
  const stageIndex = getStageIndex(stage);
  const stageFrame = Math.max(0, frame - (stage.start - visualLeadSeconds) * fps);
  const stageIn = pop(frame, stage.start - visualLeadSeconds, fps);
  const beat = pop(frame, stage.start + 0.18 - visualLeadSeconds, fps);
  const canvasScale = Math.min(width / 1280, height / 720);
  const progress = clampProgress(displaySec, [0, audioDurationSeconds], [0, 1]);
  const titleY = clampProgress(stageIn, [0, 1], [20, 0]);
  const titleOpacity = clampProgress(stageIn, [0, 1], [0, 1]);
  const sweepOpacity = clampProgress(stageFrame, [0, 14], [0.75, 0]);

  return (
    <AbsoluteFill style={styles.root}>
      <Audio src={audioSrc} />
      <div style={{...styles.canvas, transform: `scale(${canvasScale})`}}>
        <div style={styles.paperFrame} />
        <div style={styles.topBar}>
          <div>
            <div style={styles.brand}>{generatedVideo.brand}</div>
            <div style={styles.meta}>{generatedVideo.meta}</div>
          </div>
          <div style={styles.badge}>{generatedVideo.badge}</div>
        </div>

        <div style={{...styles.sweep, opacity: sweepOpacity}} />

        <main style={styles.card}>
          <div style={styles.leftRail}>
            <div style={styles.stageCode}>{stage.label}</div>
            <div style={styles.stageNumber}>{String(stageIndex + 1).padStart(2, '0')}</div>
          </div>

          <section style={{...styles.content, opacity: titleOpacity, transform: `translateY(${titleY}px)`}}>
            <div style={styles.kicker}>{stage.kicker}</div>
            <h1 style={{...styles.title, fontSize: fontSizeFor(stage.title, 36, 32, 28)}}>{stage.title}</h1>
            <div
              style={{
                ...styles.mainLine,
                fontSize: fontSizeFor(stage.main, 24, 21, 18),
                transform: `scale(${clampProgress(beat, [0, 1], [0.985, 1])})`,
              }}
            >
              {stage.main}
            </div>
            <StageVisual stage={stage} sec={displaySec} beat={beat} />
          </section>
        </main>

        <div style={styles.timeline}>
          <div style={styles.track}>
            <div style={{...styles.fill, transform: `scaleX(${progress})`}} />
          </div>
          {timeline.map((item, index) => {
            const active = index <= stageIndex;
            return (
              <div key={item.key} style={styles.timeItem}>
                <div style={{...styles.dot, backgroundColor: active ? palette.yellow : palette.card}} />
                <span
                  style={{
                    ...styles.timeLabel,
                    color: active ? palette.yellow : palette.card,
                    fontSize: timeline.length > 5 ? 15 : 17,
                  }}
                >
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const styles: Record<string, React.CSSProperties> = {
  root: {
    backgroundColor: palette.bg,
    alignItems: 'center',
    justifyContent: 'center',
    display: 'flex',
    overflow: 'hidden',
    color: palette.ink,
    fontFamily: '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", Arial, sans-serif',
  },
  canvas: {
    width: 1280,
    height: 720,
    position: 'relative',
    overflow: 'hidden',
    transformOrigin: 'center center',
    backgroundColor: palette.bg,
    backgroundImage: `linear-gradient(${palette.grid} 1px, transparent 1px), linear-gradient(90deg, ${palette.grid} 1px, transparent 1px), linear-gradient(rgba(222,211,189,0.52) 1px, transparent 1px), linear-gradient(90deg, rgba(222,211,189,0.52) 1px, transparent 1px)`,
    backgroundSize: '34px 34px, 34px 34px, 8px 8px, 8px 8px',
  },
  paperFrame: {
    position: 'absolute',
    left: 38,
    right: 38,
    top: 42,
    bottom: 66,
    border: `4px solid ${palette.ink}`,
    boxShadow: `12px 12px 0 ${palette.shadow}`,
  },
  topBar: {
    position: 'absolute',
    left: 70,
    right: 74,
    top: 70,
    height: 112,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    display: 'inline-flex',
    height: 58,
    alignItems: 'center',
    padding: '0 24px',
    backgroundColor: palette.ink,
    color: '#fffaf0',
    border: `4px solid ${palette.ink}`,
    boxShadow: `6px 6px 0 ${palette.shadow}`,
    fontSize: 32,
    fontWeight: 950,
  },
  meta: {
    display: 'inline-flex',
    height: 38,
    alignItems: 'center',
    marginTop: 10,
    padding: '0 16px',
    backgroundColor: palette.yellow,
    border: `4px solid ${palette.ink}`,
    boxShadow: `5px 5px 0 ${palette.shadow}`,
    fontSize: 19,
    fontWeight: 900,
  },
  badge: {
    width: 96,
    height: 96,
    display: 'grid',
    placeItems: 'center',
    backgroundColor: palette.card,
    border: `4px solid ${palette.ink}`,
    boxShadow: `6px 6px 0 ${palette.shadow}`,
    fontSize: 24,
    fontWeight: 950,
  },
  sweep: {
    position: 'absolute',
    left: 56,
    right: 56,
    top: 204,
    height: 7,
    backgroundColor: palette.yellow,
  },
  card: {
    position: 'absolute',
    left: 152,
    right: 152,
    top: 218,
    height: 378,
    backgroundColor: palette.card,
    border: `4px solid ${palette.ink}`,
    boxShadow: `10px 10px 0 ${palette.shadow}`,
    display: 'flex',
    overflow: 'hidden',
  },
  leftRail: {
    width: 154,
    backgroundColor: palette.ink,
    color: '#fffaf0',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: 24,
    boxSizing: 'border-box',
  },
  stageCode: {
    fontSize: 34,
    fontWeight: 950,
  },
  stageNumber: {
    color: palette.yellow,
    fontSize: 58,
    lineHeight: 1,
    fontWeight: 950,
  },
  content: {
    flex: 1,
    padding: '26px 34px 24px',
    boxSizing: 'border-box',
  },
  kicker: {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: 30,
    padding: '2px 10px',
    backgroundColor: palette.yellow,
    border: `3px solid ${palette.ink}`,
    boxShadow: '4px 4px 0 rgba(38,54,72,0.28)',
    fontSize: 18,
    fontWeight: 900,
  },
  title: {
    margin: '12px 0 10px',
    lineHeight: 1.12,
    letterSpacing: 0,
    fontWeight: 950,
  },
  mainLine: {
    minHeight: 50,
    display: 'flex',
    alignItems: 'center',
    padding: '0 16px',
    backgroundColor: '#ffffff',
    border: `4px solid ${palette.ink}`,
    boxShadow: '5px 5px 0 rgba(38,54,72,0.3)',
    lineHeight: 1.15,
    fontWeight: 900,
    transformOrigin: 'left center',
  },
  pointStack: {
    marginTop: 14,
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: 8,
  },
  pointRow: {
    height: 38,
    display: 'grid',
    gridTemplateColumns: '24px 1fr 94px',
    alignItems: 'center',
    gap: 12,
    padding: '0 14px',
    border: `3px solid ${palette.ink}`,
    boxShadow: '4px 4px 0 rgba(38,54,72,0.24)',
    fontWeight: 850,
    transition: 'none',
  },
  pointCopy: {
    minWidth: 0,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  },
  pointMeter: {
    height: 7,
    border: `2px solid ${palette.ink}`,
    backgroundColor: 'rgba(255,255,255,0.55)',
    overflow: 'hidden',
  },
  pointMeterFill: {
    display: 'block',
    width: '100%',
    height: '100%',
    backgroundColor: palette.ink,
    transformOrigin: 'left center',
  },
  check: {
    width: 24,
    height: 24,
    display: 'grid',
    placeItems: 'center',
    backgroundColor: palette.ink,
    color: '#fffaf0',
    fontSize: 15,
    fontWeight: 950,
    flex: '0 0 auto',
  },
  compare: {
    marginTop: 18,
    display: 'grid',
    gridTemplateColumns: '1fr 52px 1fr',
    alignItems: 'center',
    gap: 12,
  },
  oldBox: {
    height: 122,
    border: `4px solid ${palette.ink}`,
    backgroundColor: '#ffffff',
    padding: 14,
    boxShadow: '5px 5px 0 rgba(38,54,72,0.24)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 4,
    boxSizing: 'border-box',
  },
  newBox: {
    height: 122,
    border: `4px solid ${palette.ink}`,
    backgroundColor: palette.yellow,
    padding: 14,
    boxShadow: `6px 6px 0 ${palette.shadow}`,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 4,
    boxSizing: 'border-box',
    transformOrigin: 'center center',
  },
  boxLabel: {
    fontSize: 16,
    fontWeight: 900,
    color: palette.muted,
  },
  compareStrong: {
    fontSize: 40,
    lineHeight: 1,
    fontWeight: 950,
  },
  compareSmall: {
    fontSize: 17,
    lineHeight: 1.18,
    fontWeight: 850,
  },
  arrow: {
    textAlign: 'center',
    fontSize: 42,
    fontWeight: 950,
    color: palette.ink,
  },
  subjectGrid: {
    marginTop: 18,
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 10,
  },
  subjectCard: {
    height: 104,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 10,
    padding: '0 10px',
    backgroundColor: palette.yellow,
    border: `4px solid ${palette.ink}`,
    boxShadow: '5px 5px 0 rgba(38,54,72,0.28)',
    fontSize: 20,
    lineHeight: 1.15,
    fontWeight: 900,
    transition: 'none',
  },
  subjectIndex: {
    width: 28,
    height: 28,
    display: 'grid',
    placeItems: 'center',
    backgroundColor: palette.ink,
    color: '#fffaf0',
    fontSize: 16,
    fontWeight: 950,
  },
  subjectMeter: {
    height: 7,
    border: `2px solid ${palette.ink}`,
    backgroundColor: 'rgba(255,255,255,0.58)',
    overflow: 'hidden',
  },
  subjectMeterFill: {
    display: 'block',
    width: '100%',
    height: '100%',
    backgroundColor: palette.ink,
    transformOrigin: 'left center',
  },
  timeline: {
    position: 'absolute',
    left: 54,
    right: 54,
    bottom: 16,
    height: 52,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 34px',
    boxSizing: 'border-box',
    backgroundColor: 'rgba(38,54,72,0.62)',
    border: `3px solid rgba(38,54,72,0.55)`,
  },
  track: {
    position: 'absolute',
    left: 34,
    right: 34,
    bottom: 8,
    height: 6,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,249,236,0.35)',
  },
  fill: {
    width: '100%',
    height: '100%',
    backgroundColor: palette.yellow,
    transformOrigin: 'left center',
  },
  timeItem: {
    zIndex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 14,
    height: 14,
    border: `2px solid ${palette.ink}`,
  },
  timeLabel: {
    fontWeight: 900,
    whiteSpace: 'nowrap',
  },
};
