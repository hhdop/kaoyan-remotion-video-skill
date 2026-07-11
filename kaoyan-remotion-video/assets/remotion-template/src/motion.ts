export type CueWindow = {
  cueStart: number;
  cueEnd: number;
};

export type StageWindow = {
  start: number;
  end: number;
};

export const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

export const phaseProgress = (sec: number, start: number, end: number): number => {
  if (end <= start) return sec >= end ? 1 : 0;
  return clamp01((sec - start) / (end - start));
};

export const smoothstep = (value: number): number => {
  const progress = clamp01(value);
  return progress * progress * (3 - 2 * progress);
};

export const easeOutCubic = (value: number): number => 1 - Math.pow(1 - clamp01(value), 3);

export const easeInOutCubic = (value: number): number => {
  const progress = clamp01(value);
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
};

export const settlePulse = (
  localSeconds: number,
  impactSeconds = 0.28,
  durationSeconds = 0.72,
): number => {
  const elapsed = localSeconds - impactSeconds;
  if (elapsed <= 0 || elapsed >= durationSeconds) return 0;
  const progress = elapsed / durationSeconds;
  return Math.sin(progress * Math.PI * 3) * Math.exp(-progress * 4.2);
};

export const cueState = (
  cue: CueWindow,
  sec: number,
  leadSeconds = 0.1,
  enterSeconds = 0.28,
) => {
  const localSeconds = sec - cue.cueStart;
  const revealed = sec >= cue.cueStart;
  const active = revealed && sec < cue.cueEnd;
  const preparing = sec >= cue.cueStart - leadSeconds && !revealed;
  const enter = revealed ? easeOutCubic(phaseProgress(sec, cue.cueStart, cue.cueStart + enterSeconds)) : 0;

  return {
    active,
    done: sec >= cue.cueEnd,
    enter,
    hold: revealed ? smoothstep(phaseProgress(sec, cue.cueStart, cue.cueEnd)) : 0,
    localSeconds,
    preparing,
    revealed,
    settle: revealed ? settlePulse(localSeconds) : 0,
    visible: revealed,
  };
};

export const stageState = (
  stage: StageWindow,
  sec: number,
  leadSeconds = 0.1,
  enterSeconds = 0.42,
  holdAtEnd = false,
) => {
  const shellStart = stage.start - leadSeconds;
  const enter = easeOutCubic(phaseProgress(sec, shellStart, shellStart + enterSeconds));
  const exit = holdAtEnd ? 1 : 1 - smoothstep(phaseProgress(sec, stage.end - 0.24, stage.end));
  return {
    active: sec >= stage.start && sec < stage.end,
    enter,
    exit,
    localSeconds: sec - stage.start,
    preparing: sec >= shellStart && sec < stage.start,
    presence: Math.min(enter, exit),
  };
};

export const chapterTransitionState = (
  stage: StageWindow,
  sec: number,
  hasPrevious: boolean,
  durationSeconds = 0.28,
) => {
  const progress = phaseProgress(sec, stage.start, stage.start + durationSeconds);
  const current = sec >= stage.start ? smoothstep(progress) : 0;
  const previous = hasPrevious ? 1 - current : 0;
  const seam = hasPrevious ? Math.sin(current * Math.PI) : 0;
  return {current, previous, seam};
};

export const drift = (sec: number, seed = 0, amplitude = 1): number =>
  Math.sin(sec * 0.72 + seed * 1.91) * amplitude;
