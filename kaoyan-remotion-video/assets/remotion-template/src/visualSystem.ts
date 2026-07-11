export const palette = {
  background: '#eadfc9',
  backgroundDeep: '#dfd1b8',
  ink: '#263648',
  muted: '#68645a',
  grid: '#cbbd9f',
  card: '#eddfc7',
  surface: '#f1e6d2',
  paper: '#e7d8be',
  yellow: '#d9a31d',
  yellowSoft: '#efd079',
  red: '#b94d3b',
  green: '#4f7f6b',
  blue: '#51728f',
  lightInk: '#f6ecd9',
  shadow: 'rgba(38, 54, 72, 0.18)',
  shadowStrong: 'rgba(38, 54, 72, 0.28)',
} as const;

export const majorSurfaces = {
  background: palette.background,
  card: palette.card,
  paper: palette.paper,
  surface: palette.surface,
} as const;

const expandHex = (hex: string): string => {
  const value = hex.replace('#', '');
  if (value.length === 3) return value.split('').map((part) => `${part}${part}`).join('');
  return value;
};

export const relativeLuminance = (hex: string): number => {
  const value = expandHex(hex);
  if (!/^[0-9a-f]{6}$/i.test(value)) {
    throw new Error(`Expected a six-digit hex color, received: ${hex}`);
  }
  const channels = [0, 2, 4].map((offset) => {
    const channel = Number.parseInt(value.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
};

export type SurfaceTone = 'neutral' | 'old' | 'new' | 'urgent' | 'subject';

export const toneToSurface = (tone: SurfaceTone = 'neutral') => {
  if (tone === 'old') return {accent: palette.muted, surface: palette.paper};
  if (tone === 'new') return {accent: palette.green, surface: palette.card};
  if (tone === 'urgent') return {accent: palette.red, surface: palette.card};
  if (tone === 'subject') return {accent: palette.blue, surface: palette.surface};
  return {accent: palette.yellow, surface: palette.card};
};

export const readableFontSize = (
  text: string,
  preferred = 34,
  minimum = 22,
  comfortableCharacters = 18,
): number => {
  const normalizedLength = Array.from(text.trim()).length;
  if (normalizedLength <= comfortableCharacters) return preferred;
  const reduction = Math.ceil((normalizedLength - comfortableCharacters) / 4) * 2;
  return Math.max(minimum, preferred - reduction);
};

export const shadows = {
  card: `8px 9px 0 ${palette.shadow}`,
  floating: `0 14px 28px ${palette.shadowStrong}`,
  small: `4px 5px 0 ${palette.shadow}`,
} as const;

