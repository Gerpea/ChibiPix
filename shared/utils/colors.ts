export const hexToInt = (hex: string): number => {
  if (hex === 'transparent') return 0;
  const cleaned = hex.replace('#', '');
  return parseInt(cleaned + (cleaned.length === 6 ? 'FF' : ''), 16);
};

export const intToHex = (color: number): string => {
  if (color === 0) return 'transparent';
  return `#${(color >>> 0).toString(16).padStart(8, '0')}`;
};

export const adjustColorOpacity = (color: number, opacity: number): number => {
  if (color === 0) return 0;
  const normalizedOpacity = opacity / 100;
  const r = (color >> 24) & 0xff;
  const g = (color >> 16) & 0xff;
  const b = (color >> 8) & 0xff;
  const a = Math.round(normalizedOpacity * 255);
  return (r << 24) | (g << 16) | (b << 8) | a;
};

export const rgbaToHex = (
  r: number,
  g: number,
  b: number,
  a: number
): string => {
  if (
    r < 0 ||
    r > 255 ||
    g < 0 ||
    g > 255 ||
    b < 0 ||
    b > 255 ||
    a < 0 ||
    a > 1
  ) {
    throw new Error('RGBA values out of range');
  }

  const rHex = r.toString(16).padStart(2, '0');
  const gHex = g.toString(16).padStart(2, '0');
  const bHex = b.toString(16).padStart(2, '0');
  const aHex = Math.round(a * 255)
    .toString(16)
    .padStart(2, '0');

  return `#${rHex}${gHex}${bHex}${aHex}`.toUpperCase();
};
