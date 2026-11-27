export const C = {
  qizil: '#D7263D',
  sariq: '#F4C430',
  toqsariq: '#F77F00',
  jigar: '#8C5A3C',
  yashil: '#3BB273',
  pushti: '#FF6FA3',
  osmon: '#8ECAE6',
  krem: '#F6EBD9',
  tun: '#2A2350',
  ink: '#1A1A1A',
  white: '#FFFFFF',
  teal: '#2EC4B6',
  skin: '#C68642',
};

export type BgName = 'krem' | 'osmon' | 'toʻq sariq' | 'yashil' | 'jigarrang' | 'tun';

// mix two hex colours, t in [0,1]
export const mix = (a: string, b: string, t: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('');
};

export const W = 1920;
export const H = 1080;
export const FPS = 30;
