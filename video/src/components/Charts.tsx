import React from 'react';
import {Easing, interpolate, useCurrentFrame} from 'remotion';
import {C, mix} from '../theme';
import {Icon} from './Icons';

const k = C.ink;
const S = {stroke: k, strokeWidth: 5, strokeLinejoin: 'round' as const};
const T = (x: number, y: number, s: string, size = 40, color = k, anchor: 'middle' | 'start' | 'end' = 'middle') => (
  <text x={x} y={y} textAnchor={anchor} fontFamily="Montserrat" fontWeight={900} fontSize={size} fill={color}>{s}</text>
);

export type ChartSpec =
  | {type: 'bars'; items: {label: string; value: number; color: string; cue: number; text: string}[]; max: number; x0?: number}
  | {type: 'hbars'; items: {label: string; value: number; hi?: boolean}[]; max: number; cue: number}
  | {type: 'pie'; parts: {value: number; color: string}[]; cue: number}
  | {type: 'donut'; parts: {value: number; color: string; label: string}[]; cue: number}
  | {type: 'line'; pts: number[]; labels: string[]; cue: number; color: string; down?: boolean}
  | {type: 'people'; rows: {n: number; hi: number; cue: number; title: string}[]}
  | {type: 'flow'; total: string; share: number; cue: number; cue2: number}
  | {type: 'oil'; cue: number; cue2: number};

export const Chart: React.FC<{spec: ChartSpec; cueStart: (i: number) => number; frames: number}> = ({spec, cueStart}) => {
  const f = useCurrentFrame();
  const at = (i: number, d = 14) => interpolate(f, [cueStart(i), cueStart(i) + d], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const svg = (ch: React.ReactNode) => <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>{ch}</svg>;
  if (spec.type === 'bars') {
    const x0 = spec.x0 ?? 960 - (spec.items.length * 260) / 2 + 40;
    return svg(<g>
      <line x1={x0 - 60} y1={800} x2={x0 + spec.items.length * 260} y2={800} {...S} strokeWidth={6} />
      {spec.items.map((it, i) => {
        const h = (560 * it.value) / spec.max * at(it.cue, 18);
        const x = x0 + i * 260;
        return <g key={i}><rect x={x} y={800 - h} width={180} height={h} fill={it.color} {...S} />
          {at(it.cue) > 0.5 && T(x + 90, 790 - h - 18, it.text, 40)}
          {T(x + 90, 850, it.label, 34)}</g>;
      })}
    </g>);
  }
  if (spec.type === 'hbars') {
    const a = at(spec.cue, 30);
    return svg(<g>{spec.items.map((it, i) => {
      const y = 120 + i * 47;
      const w = (980 * it.value) / spec.max * Math.min(1, a * 1.2 - i * 0.012);
      return <g key={i}>{T(560, y + 32, it.label, 28, k, 'end')}
        <rect x={580} y={y + 6} width={Math.max(0, w)} height={34} fill={it.hi ? C.yashil : mix(C.osmon, C.white, 0.2)} {...S} strokeWidth={3} />
      </g>;
    })}</g>);
  }
  if (spec.type === 'pie' || spec.type === 'donut') {
    const a = at(spec.cue, 24);
    const parts = spec.parts as {value: number; color: string}[];
    const tot = parts.reduce((s: number, p) => s + p.value, 0);
    let acc = 0;
    const cx = 800, cy = 470, r = 300;
    return svg(<g>
      <circle cx={cx} cy={cy} r={r} fill={mix(C.krem, C.white, 0.4)} {...S} strokeWidth={6} />
      {parts.map((p, i) => {
        const a0 = (acc / tot) * Math.PI * 2 * a - Math.PI / 2;
        acc += p.value;
        const a1 = (acc / tot) * Math.PI * 2 * a - Math.PI / 2;
        const large = a1 - a0 > Math.PI ? 1 : 0;
        const d = `M${cx} ${cy} L${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)} A${r} ${r} 0 ${large} 1 ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)} Z`;
        return <path key={i} d={d} fill={p.color} {...S} strokeWidth={4} />;
      })}
      {spec.type === 'donut' && <circle cx={cx} cy={cy} r={150} fill={C.krem} {...S} strokeWidth={4} />}
    </g>);
  }
  if (spec.type === 'line') {
    const a = at(spec.cue, 30);
    const n = spec.pts.length;
    const mx = Math.max(...spec.pts) * 1.2;
    const P = spec.pts.map((v, i) => [380 + (i * 1100) / (n - 1), 760 - (v / mx) * 480]);
    const shown = Math.max(2, Math.ceil(a * n));
    return svg(<g>
      <line x1={340} y1={780} x2={1540} y2={780} {...S} strokeWidth={6} />
      <polyline points={P.slice(0, shown).map((p) => p.join(',')).join(' ')} fill="none" stroke={spec.color} strokeWidth={14} strokeLinejoin="round" strokeLinecap="round" />
      {P.slice(0, shown).map((p, i) => <g key={i}><circle cx={p[0]} cy={p[1]} r={16} fill={C.white} {...S} />{spec.labels[i] && T(p[0], p[1] - 34, spec.labels[i], 40)}</g>)}
    </g>);
  }
  if (spec.type === 'people') {
    return svg(<g>{spec.rows.map((r, ri) => {
      const a = at(r.cue, 20);
      const y = 300 + ri * 280;
      const size = Math.min(100, 1500 / r.n);
      return <g key={ri}>{T(960, y - 80, r.title, 44)}
        {Array.from({length: r.n}).map((_, i) => {
          const s = Math.min(1, Math.max(0, a * r.n - i));
          return <g key={i} opacity={s}><g transform={`translate(${960 - (r.n * size) / 2 + i * size + size / 2},${y + 40})`}>
            <circle cx={0} cy={-28} r={size * 0.2} fill={i === r.hi ? C.yashil : C.white} {...S} strokeWidth={3} />
            <path d={`M${-size * 0.3} 30 Q${-size * 0.3} -6 0 -6 Q${size * 0.3} -6 ${size * 0.3} 30 Z`} fill={i === r.hi ? C.yashil : C.white} {...S} strokeWidth={3} /></g></g>;
        })}</g>;
    })}</g>);
  }
  if (spec.type === 'flow') {
    const a = at(spec.cue, 20), b = at(spec.cue2, 20);
    return svg(<g>
      <path d={`M240 480 H${240 + 900 * a}`} stroke={C.sariq} strokeWidth={120} />
      <path d={`M240 480 H${240 + 900 * a * spec.share * b}`} stroke={C.osmon} strokeWidth={120} />
      <path d={`M${240 + 900 * a} 400 L${300 + 900 * a} 480 L${240 + 900 * a} 560 Z`} fill={C.sariq} {...S} />
      <rect x={240} y={420} width={900 * a} height={120} fill="none" {...S} />
      {a > 0.9 && T(690, 640, spec.total, 64)}
      <Icon name="envelope" x={1400} y={480} size={220} />
    </g>);
  }
  if (spec.type === 'oil') {
    const a = at(spec.cue, 30), b = at(spec.cue2, 14);
    return svg(<g>
      <Icon name="barrel" x={520} y={480} size={300} />
      <path d={`M760 300 L${760 + 320 * a} ${300 + 300 * a}`} stroke={C.qizil} strokeWidth={18} strokeLinecap="round" />
      <path d={`M${760 + 320 * a - 40} ${300 + 300 * a + 10} L${760 + 320 * a + 14} ${300 + 300 * a + 14} L${760 + 320 * a + 10} ${300 + 300 * a - 40}`} fill="none" stroke={C.qizil} strokeWidth={18} strokeLinecap="round" />
      <g opacity={b}>
        <rect x={1240} y={280} width={420} height={460} fill={mix(C.krem, C.jigar, 0.2)} {...S} />
        {[400, 540, 680].map((y) => <rect key={y} x={1240} y={y} width={420} height={14} fill={C.jigar} {...S} strokeWidth={3} />)}
      </g>
    </g>);
  }
  return null;
};
