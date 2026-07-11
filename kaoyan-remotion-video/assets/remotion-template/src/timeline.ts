export type TimelineStage = {
  key: string;
  label: string;
  start: number;
  end: number;
};

export type TimelineItem = {
  key: string;
  label: string;
};

export const visualLeadSeconds = 0.1;

export const getStageAt = <T extends TimelineStage>(stages: readonly T[], sec: number): T => {
  if (stages.length === 0) {
    throw new Error('The generated timeline has no stages.');
  }

  let current = stages[0];
  for (const stage of stages) {
    if (sec < stage.start) break;
    current = stage;
  }
  return current;
};

export const getStageIndex = <T extends TimelineStage>(stages: readonly T[], active: T): number =>
  Math.max(0, stages.findIndex((stage) => stage.key === active.key));

export const getVisibleTimelineItems = <T extends TimelineItem>(
  timeline: readonly T[],
  activeKey: string,
  collapseThreshold = 5,
): readonly T[] => {
  if (timeline.length <= collapseThreshold) return timeline;
  const active = timeline.find((item) => item.key === activeKey);
  return active ? [active] : timeline.slice(0, 1);
};

