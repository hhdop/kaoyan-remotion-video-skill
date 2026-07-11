import React from 'react';
import {AbsoluteFill, Audio, useCurrentFrame, useVideoConfig} from 'remotion';
import {generatedVideo, type GeneratedPoint, type GeneratedStage} from './generatedContent';
import {chapterTransitionState, clamp01, cueState, drift, easeOutCubic, phaseProgress} from './motion';
import {getStageAt, getStageIndex, getVisibleTimelineItems} from './timeline';
import {palette, readableFontSize, shadows, toneToSurface} from './visualSystem';

type MainVideoProps = {
  audioSrc?: string;
};

type SceneProps = {
  stage: GeneratedStage;
  sec: number;
};

const DESIGN_WIDTH = 1280;
const DESIGN_HEIGHT = 720;
const stages = generatedVideo.stages;
const timeline = generatedVideo.timeline;

const pointText = (point: GeneratedPoint): string => point.shortText ?? point.text;

const PointMeter: React.FC<{point: GeneratedPoint; sec: number; style?: React.CSSProperties}> = ({
  point,
  sec,
  style,
}) => {
  const progress = phaseProgress(sec, point.cueStart, point.cueEnd);
  return (
    <div style={{...styles.meterTrack, ...style}}>
      <div style={{...styles.meterFill, transform: `scaleX(${progress})`}} />
    </div>
  );
};

const PlanningScene: React.FC<SceneProps> = ({stage, sec}) => {
  return (
    <div style={styles.planningScene}>
      <div style={styles.planningAxis}>
        <span style={styles.axisStart}>开始</span>
        <span style={styles.axisEnd}>推进</span>
      </div>
      <div style={styles.trackStack}>
        {stage.points.slice(0, 4).map((point, index) => {
          const state = cueState(point, sec);
          if (!state.visible) return null;
          const tones = toneToSurface(point.tone);
          const settleScale = 1 + state.settle * 0.012;
          return (
            <div
              key={`${point.text}-${index}`}
              style={{
                ...styles.trackRow,
                top: index * 58,
                backgroundColor: tones.surface,
                borderLeftColor: tones.accent,
                opacity: state.enter,
                transform: `translateX(${(1 - state.enter) * 24}px) scale(${settleScale})`,
              }}
            >
              <span style={{...styles.trackNumber, backgroundColor: tones.accent}}>{index + 1}</span>
              <span style={{...styles.trackCopy, fontSize: readableFontSize(pointText(point), 20, 16, 22)}}>
                {pointText(point)}
              </span>
              <PointMeter point={point} sec={sec} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

const splitExplicitComparison = (text: string): [string, string] | null => {
  const parts = text.split('→').map((part) => part.trim()).filter(Boolean);
  if (parts.length !== 2) return null;
  return [parts[0], parts[1]];
};

const NewsScene: React.FC<SceneProps> = ({stage, sec}) => {
  const comparison = splitExplicitComparison(stage.main);
  if (comparison) {
    const move = easeOutCubic(phaseProgress(sec, stage.start + 0.08, stage.start + 0.48));
    const confirm = easeOutCubic(phaseProgress(sec, stage.start + 0.32, stage.start + 0.7));
    return (
      <div style={styles.compareScene}>
        <div
          style={{
            ...styles.compareBox,
            opacity: move,
            transform: `translateX(${(1 - move) * -28}px)`,
          }}
        >
          <span style={styles.compareLabel}>调整前</span>
          <strong style={{...styles.compareValue, fontSize: readableFontSize(comparison[0], 31, 20, 12)}}>
            {comparison[0]}
          </strong>
        </div>
        <div style={styles.compareRail}>
          <span style={{...styles.compareArrow, transform: `translateX(${(1 - move) * -18}px)`}}>→</span>
        </div>
        <div
          style={{
            ...styles.compareBox,
            ...styles.compareBoxConfirmed,
            opacity: confirm,
            transform: `translateX(${(1 - confirm) * 34}px) scale(${0.97 + confirm * 0.03})`,
          }}
        >
          <span style={styles.compareLabel}>调整后</span>
          <strong style={{...styles.compareValue, fontSize: readableFontSize(comparison[1], 31, 20, 12)}}>
            {comparison[1]}
          </strong>
          <span style={{...styles.confirmMark, transform: `scale(${confirm})`}}>已确认</span>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.newsStack}>
      {stage.points.slice(0, 4).map((point, index) => {
        const state = cueState(point, sec);
        if (!state.visible) return null;
        const tones = toneToSurface(point.tone);
        return (
          <div
            key={`${point.text}-${index}`}
            style={{
              ...styles.newsRow,
              opacity: state.enter,
              transform: `translateY(${(1 - state.enter) * 18}px)`,
              borderTopColor: tones.accent,
            }}
          >
            <span style={{...styles.newsPin, backgroundColor: tones.accent}} />
            <span style={{...styles.newsCopy, fontSize: readableFontSize(pointText(point), 20, 16, 24)}}>
              {pointText(point)}
            </span>
            <PointMeter point={point} sec={sec} style={{gridColumn: 2}} />
          </div>
        );
      })}
    </div>
  );
};

const KnowledgeScene: React.FC<SceneProps> = ({stage, sec}) => {
  const visiblePoints = stage.points.slice(0, 4).filter((point) => cueState(point, sec).visible);
  return (
    <div
      style={{
        ...styles.knowledgeScene,
        justifyContent: visiblePoints.length === 1 ? 'center' : 'space-between',
      }}
    >
      {visiblePoints.length > 1 ? <div style={styles.conceptLine} /> : null}
      {visiblePoints.map((point, index) => {
        const state = cueState(point, sec);
        const tones = toneToSurface(point.tone);
        const nodeWidth = stage.points.length <= 3 ? 260 : 194;
        return (
          <div
            key={`${point.text}-${index}`}
            style={{
              ...styles.conceptNode,
              width: nodeWidth,
              backgroundColor: tones.surface,
              borderBottomColor: tones.accent,
              opacity: state.enter,
              transform: `translateY(${(1 - state.enter) * 26}px) rotate(${(1 - state.enter) * 1.2}deg)`,
            }}
          >
            <span style={{...styles.conceptIndex, color: tones.accent}}>{String(index + 1).padStart(2, '0')}</span>
            <span style={{...styles.conceptCopy, fontSize: readableFontSize(pointText(point), 19, 15, 19)}}>
              {pointText(point)}
            </span>
            <PointMeter point={point} sec={sec} />
          </div>
        );
      })}
    </div>
  );
};

const StageScene: React.FC<SceneProps> = ({stage, sec}) => {
  if (generatedVideo.profile === 'planning') return <PlanningScene stage={stage} sec={sec} />;
  if (generatedVideo.profile === 'news') return <NewsScene stage={stage} sec={sec} />;
  return <KnowledgeScene stage={stage} sec={sec} />;
};

const StageContentPanel: React.FC<
  SceneProps & {clipPath: string; opacity: number; driftSeed: number; zIndex: number}
> = ({stage, sec, clipPath, opacity, driftSeed, zIndex}) => {
  const quietDrift = drift(sec, driftSeed, 1.5);
  return (
    <section
      style={{
        ...styles.stageContent,
        clipPath,
        opacity,
        zIndex,
      }}
    >
      <div style={styles.kickerRow}>
        <span style={styles.kicker}>{stage.kicker}</span>
      </div>
      <h1 style={{...styles.title, fontSize: readableFontSize(stage.title, 38, 26, 17)}}>{stage.title}</h1>
      <div style={{...styles.mainLine, fontSize: readableFontSize(stage.main, 24, 18, 30)}}>
        <span style={styles.mainAccent} />
        <span>{stage.main}</span>
      </div>
      <div style={{...styles.sceneViewport, transform: `translateX(${quietDrift}px)`}}>
        <StageScene stage={stage} sec={sec} />
      </div>
    </section>
  );
};

export const MainVideo: React.FC<MainVideoProps> = ({audioSrc}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const sec = frame / fps;
  const stage = getStageAt(stages, sec);
  const stageIndex = getStageIndex(stages, stage);
  const previousStage = stageIndex > 0 ? stages[stageIndex - 1] : null;
  const transition = chapterTransitionState(stage, sec, previousStage !== null);
  const previousSec = previousStage ? Math.max(previousStage.start, previousStage.end - 1 / fps) : 0;
  const canvasScale = Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
  const videoProgress = clamp01(sec / generatedVideo.durationSeconds);
  const visibleTimeline = getVisibleTimelineItems(timeline, stage.key);

  return (
    <AbsoluteFill style={styles.root}>
      {audioSrc ? <Audio src={audioSrc} /> : null}
      <div style={{...styles.canvas, transform: `scale(${canvasScale})`}}>
        <div style={styles.outerFrame} />
        <header style={styles.header}>
          <div style={styles.identity}>
            <div style={{...styles.brand, fontSize: readableFontSize(generatedVideo.brand, 27, 19, 13)}}>
              {generatedVideo.brand}
            </div>
            <div style={{...styles.meta, fontSize: readableFontSize(generatedVideo.meta, 17, 14, 20)}}>
              {generatedVideo.meta}
            </div>
          </div>
          <div style={styles.badge}>{generatedVideo.badge}</div>
        </header>

        <main style={styles.stageCard}>
          <aside style={styles.leftRail}>
            <div>
              <div style={styles.stageLabel}>{stage.label}</div>
              <div style={styles.railRule} />
            </div>
            <div style={styles.stageCount}>
              <strong style={styles.stageCountStrong}>{String(stageIndex + 1).padStart(2, '0')}</strong>
              <span>/ {String(stages.length).padStart(2, '0')}</span>
            </div>
          </aside>

          <div style={styles.contentStack}>
            {previousStage && transition.previous > 0.001 ? (
              <StageContentPanel
                stage={previousStage}
                sec={previousSec}
                clipPath={`inset(0 0 0 ${transition.current * 100}%)`}
                opacity={1}
                driftSeed={stageIndex}
                zIndex={1}
              />
            ) : null}
            <StageContentPanel
              stage={stage}
              sec={sec}
              clipPath={previousStage ? `inset(0 ${(1 - transition.current) * 100}% 0 0)` : 'inset(0)'}
              opacity={previousStage ? 1 : transition.current}
              driftSeed={stageIndex + 1}
              zIndex={2}
            />
            {previousStage && transition.current < 0.999 ? (
              <div
                style={{
                  ...styles.transitionSeam,
                  left: `${transition.current * 100}%`,
                  opacity: transition.seam,
                }}
              />
            ) : null}
          </div>
        </main>

        <footer style={styles.timeline}>
          <div style={styles.timelineTrack}>
            <div style={{...styles.timelineFill, transform: `scaleX(${videoProgress})`}} />
          </div>
          <div style={styles.timelineLabels}>
            {visibleTimeline.map((item) => {
              const active = item.key === stage.key;
              return (
                <div key={item.key} style={styles.timelineItem}>
                  <span style={{...styles.timelineDot, backgroundColor: active ? palette.yellow : palette.paper}} />
                  <span style={{...styles.timelineLabel, color: active ? palette.lightInk : palette.backgroundDeep}}>
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
          <div style={styles.timeCode}>{Math.floor(sec).toString().padStart(3, '0')}s</div>
        </footer>
      </div>
    </AbsoluteFill>
  );
};

const styles: Record<string, React.CSSProperties> = {
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    display: 'flex',
    overflow: 'hidden',
    backgroundColor: palette.backgroundDeep,
    color: palette.ink,
    fontFamily: '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", Arial, sans-serif',
  },
  canvas: {
    width: DESIGN_WIDTH,
    height: DESIGN_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
    transformOrigin: 'center center',
    backgroundColor: palette.background,
    backgroundImage: `linear-gradient(rgba(81, 114, 143, 0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(81, 114, 143, 0.10) 1px, transparent 1px)`,
    backgroundSize: '40px 40px, 40px 40px',
  },
  outerFrame: {
    position: 'absolute',
    left: 40,
    right: 40,
    top: 34,
    bottom: 66,
    border: `4px solid ${palette.ink}`,
    boxShadow: shadows.card,
    pointerEvents: 'none',
  },
  header: {
    position: 'absolute',
    left: 68,
    right: 70,
    top: 58,
    height: 86,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  identity: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    maxWidth: 980,
    minWidth: 0,
  },
  brand: {
    minHeight: 48,
    maxWidth: 470,
    display: 'flex',
    alignItems: 'center',
    boxSizing: 'border-box',
    padding: '6px 20px',
    backgroundColor: palette.ink,
    color: palette.lightInk,
    border: `3px solid ${palette.ink}`,
    boxShadow: shadows.small,
    lineHeight: 1.18,
    fontWeight: 950,
  },
  meta: {
    minHeight: 38,
    maxWidth: 410,
    display: 'flex',
    alignItems: 'center',
    boxSizing: 'border-box',
    padding: '5px 12px',
    backgroundColor: palette.paper,
    border: `3px solid ${palette.ink}`,
    lineHeight: 1.2,
    fontWeight: 850,
  },
  badge: {
    width: 78,
    height: 78,
    display: 'grid',
    placeItems: 'center',
    boxSizing: 'border-box',
    backgroundColor: palette.surface,
    border: `4px solid ${palette.ink}`,
    boxShadow: shadows.small,
    fontSize: 23,
    fontWeight: 950,
  },
  stageCard: {
    position: 'absolute',
    left: 64,
    right: 64,
    top: 158,
    height: 452,
    display: 'flex',
    overflow: 'hidden',
    backgroundColor: palette.card,
    border: `4px solid ${palette.ink}`,
    boxShadow: shadows.card,
  },
  leftRail: {
    width: 148,
    flex: '0 0 148px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    boxSizing: 'border-box',
    padding: '25px 22px 22px',
    backgroundColor: palette.ink,
    color: palette.lightInk,
  },
  stageLabel: {
    fontSize: 29,
    lineHeight: 1.16,
    fontWeight: 950,
    wordBreak: 'break-word',
  },
  railRule: {
    width: 48,
    height: 6,
    marginTop: 14,
    backgroundColor: palette.yellow,
  },
  stageCount: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 5,
    color: palette.yellowSoft,
  },
  stageCountStrong: {
    fontSize: 48,
  },
  contentStack: {
    position: 'relative',
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  stageContent: {
    position: 'absolute',
    inset: 0,
    boxSizing: 'border-box',
    padding: '22px 30px 20px',
    transformOrigin: 'center top',
    backgroundColor: palette.card,
  },
  transitionSeam: {
    position: 'absolute',
    zIndex: 3,
    top: 0,
    bottom: 0,
    width: 6,
    transform: 'translateX(-3px)',
    backgroundColor: palette.yellow,
    boxShadow: shadows.small,
    pointerEvents: 'none',
  },
  kickerRow: {
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  kicker: {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: 26,
    padding: '1px 9px',
    boxSizing: 'border-box',
    backgroundColor: palette.yellow,
    border: `2px solid ${palette.ink}`,
    fontSize: 15,
    lineHeight: 1.15,
    fontWeight: 900,
  },
  title: {
    minHeight: 46,
    maxHeight: 86,
    margin: '10px 0 8px',
    display: 'flex',
    alignItems: 'center',
    lineHeight: 1.15,
    letterSpacing: 0,
    fontWeight: 950,
    overflowWrap: 'anywhere',
  },
  mainLine: {
    minHeight: 58,
    maxHeight: 78,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    boxSizing: 'border-box',
    padding: '9px 16px 9px 12px',
    backgroundColor: palette.surface,
    border: `3px solid ${palette.ink}`,
    boxShadow: shadows.small,
    lineHeight: 1.24,
    fontWeight: 900,
    overflowWrap: 'anywhere',
  },
  mainAccent: {
    width: 8,
    alignSelf: 'stretch',
    flex: '0 0 8px',
    backgroundColor: palette.yellow,
  },
  sceneViewport: {
    position: 'relative',
    height: 220,
    marginTop: 13,
  },
  planningScene: {
    position: 'relative',
    height: '100%',
    display: 'grid',
    gridTemplateColumns: '92px 1fr',
    gap: 14,
  },
  planningAxis: {
    position: 'relative',
    borderRight: `3px solid ${palette.ink}`,
    color: palette.muted,
    fontSize: 13,
    fontWeight: 850,
  },
  axisStart: {
    position: 'absolute',
    right: 12,
    top: 6,
  },
  axisEnd: {
    position: 'absolute',
    right: 12,
    bottom: 6,
  },
  trackStack: {
    position: 'relative',
    height: '100%',
  },
  trackRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 50,
    display: 'grid',
    gridTemplateColumns: '32px minmax(0, 1fr) 118px',
    alignItems: 'center',
    gap: 12,
    boxSizing: 'border-box',
    padding: '6px 13px 6px 10px',
    border: `2px solid ${palette.ink}`,
    borderLeftWidth: 8,
    boxShadow: shadows.small,
    transformOrigin: 'left center',
  },
  trackNumber: {
    width: 27,
    height: 27,
    display: 'grid',
    placeItems: 'center',
    color: palette.ink,
    border: `2px solid ${palette.ink}`,
    fontSize: 14,
    fontWeight: 950,
  },
  trackCopy: {
    minWidth: 0,
    lineHeight: 1.15,
    overflowWrap: 'anywhere',
    fontWeight: 900,
  },
  meterTrack: {
    height: 9,
    overflow: 'hidden',
    backgroundColor: palette.backgroundDeep,
    border: `2px solid ${palette.ink}`,
  },
  meterFill: {
    width: '100%',
    height: '100%',
    backgroundColor: palette.yellow,
    transformOrigin: 'left center',
  },
  compareScene: {
    height: '100%',
    display: 'grid',
    gridTemplateColumns: '1fr 92px 1fr',
    alignItems: 'center',
    gap: 12,
  },
  compareBox: {
    position: 'relative',
    height: 152,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 12,
    boxSizing: 'border-box',
    padding: '18px 20px',
    backgroundColor: palette.paper,
    border: `3px solid ${palette.ink}`,
    boxShadow: shadows.card,
  },
  compareBoxConfirmed: {
    backgroundColor: palette.surface,
    borderBottom: `8px solid ${palette.green}`,
  },
  compareLabel: {
    color: palette.muted,
    fontSize: 15,
    fontWeight: 850,
  },
  compareValue: {
    lineHeight: 1.15,
    overflowWrap: 'anywhere',
    fontWeight: 950,
  },
  compareRail: {
    position: 'relative',
    height: 6,
    backgroundColor: palette.ink,
  },
  compareArrow: {
    position: 'absolute',
    right: -4,
    top: -30,
    fontSize: 46,
    lineHeight: 1,
    fontWeight: 950,
  },
  confirmMark: {
    position: 'absolute',
    right: 10,
    top: 10,
    padding: '3px 7px',
    color: palette.lightInk,
    backgroundColor: palette.green,
    border: `2px solid ${palette.ink}`,
    fontSize: 12,
    fontWeight: 950,
  },
  newsStack: {
    height: '100%',
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gridAutoRows: '98px',
    gap: 12,
  },
  newsRow: {
    display: 'grid',
    gridTemplateColumns: '14px minmax(0, 1fr)',
    gridTemplateRows: '1fr auto',
    gap: '7px 10px',
    boxSizing: 'border-box',
    padding: '13px 14px 11px',
    backgroundColor: palette.paper,
    border: `2px solid ${palette.ink}`,
    borderTopWidth: 7,
    boxShadow: shadows.small,
  },
  newsPin: {
    width: 12,
    height: 12,
    marginTop: 5,
    border: `2px solid ${palette.ink}`,
  },
  newsCopy: {
    lineHeight: 1.18,
    overflowWrap: 'anywhere',
    fontWeight: 900,
  },
  knowledgeScene: {
    position: 'relative',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  conceptLine: {
    position: 'absolute',
    left: 28,
    right: 28,
    top: '50%',
    height: 5,
    backgroundColor: palette.ink,
  },
  conceptNode: {
    position: 'relative',
    zIndex: 1,
    height: 150,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    boxSizing: 'border-box',
    padding: '13px 14px 12px',
    border: `3px solid ${palette.ink}`,
    borderBottomWidth: 8,
    boxShadow: shadows.card,
    transformOrigin: 'center bottom',
  },
  conceptIndex: {
    fontSize: 17,
    lineHeight: 1,
    fontWeight: 950,
  },
  conceptCopy: {
    lineHeight: 1.2,
    overflowWrap: 'anywhere',
    fontWeight: 900,
  },
  timeline: {
    position: 'absolute',
    left: 64,
    right: 64,
    bottom: 15,
    height: 50,
    display: 'grid',
    gridTemplateColumns: '1fr 80px',
    alignItems: 'center',
    boxSizing: 'border-box',
    padding: '10px 18px 5px',
    backgroundColor: palette.ink,
    border: `3px solid ${palette.ink}`,
  },
  timelineTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 6,
    overflow: 'hidden',
    backgroundColor: palette.backgroundDeep,
  },
  timelineFill: {
    width: '100%',
    height: '100%',
    backgroundColor: palette.yellow,
    transformOrigin: 'left center',
  },
  timelineLabels: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    gap: 18,
    minWidth: 0,
  },
  timelineItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    minWidth: 0,
  },
  timelineDot: {
    width: 10,
    height: 10,
    flex: '0 0 10px',
    border: `1px solid ${palette.backgroundDeep}`,
  },
  timelineLabel: {
    fontSize: 14,
    lineHeight: 1.1,
    whiteSpace: 'nowrap',
    fontWeight: 850,
  },
  timeCode: {
    justifySelf: 'end',
    color: palette.yellowSoft,
    fontSize: 14,
    fontWeight: 900,
  },
};
