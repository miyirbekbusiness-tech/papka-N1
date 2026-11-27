import React from 'react';
import {interpolate, useCurrentFrame, Easing} from 'remotion';
import {C} from '../theme';
import {INTER, MONT} from '../fonts';

export const Chip: React.FC<{type: 'FAKT' | 'TAXMIN'}> = ({type}) => (
  <div style={{position: 'absolute', left: 40, top: 40, background: type === 'FAKT' ? C.yashil : C.toqsariq, color: C.white,
    fontFamily: MONT, fontWeight: 900, fontSize: 30, padding: '8px 20px', borderRadius: 10, border: `3px solid ${C.ink}`,
    WebkitTextStroke: `4px ${C.ink}`, paintOrder: 'stroke fill', letterSpacing: 2}}>{type}</div>
);

export const ScenarioTag: React.FC = () => (
  <div style={{position: 'absolute', right: 40, top: 40, background: C.white, color: C.ink, fontFamily: MONT, fontWeight: 800,
    fontSize: 24, padding: '8px 16px', borderRadius: 8, border: `3px dashed ${C.toqsariq}`, letterSpacing: 1}}>TAXMINIY SSENARIY</div>
);

export type LabelPos = {text: string; t: number; anchor: [number, number]; box: [number, number]};

// Pink tag with a 2px leader line. Pops in over 4 frames (ease-out-back) after the word is spoken; box never moves.
export const Labels: React.FC<{items: LabelPos[]}> = ({items}) => {
  const f = useCurrentFrame();
  return (
    <>
      <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
        {items.map((l, i) => {
          const p = interpolate(f, [l.t * 30, l.t * 30 + 4], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          if (p <= 0) return null;
          return (
            <g key={i} opacity={Math.min(1, p * 1.5)}>
              <line x1={l.box[0]} y1={l.box[1]} x2={l.box[0] + (l.anchor[0] - l.box[0]) * p} y2={l.box[1] + (l.anchor[1] - l.box[1]) * p} stroke={C.ink} strokeWidth={2} />
              <circle cx={l.anchor[0]} cy={l.anchor[1]} r={6 * p} fill={C.pushti} stroke={C.ink} strokeWidth={2} />
            </g>
          );
        })}
      </svg>
      {items.map((l, i) => {
        const s = interpolate(f, [l.t * 30, l.t * 30 + 4], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(2.2))});
        if (s <= 0) return null;
        return (
          <div key={i} style={{position: 'absolute', left: l.box[0], top: l.box[1], transform: `translate(-50%,-50%) scale(${s})`,
            background: C.pushti, color: C.white, fontFamily: INTER, fontWeight: 700, fontSize: 26, padding: '8px 16px', borderRadius: 10,
            border: `2px solid ${C.ink}`, whiteSpace: 'nowrap', WebkitTextStroke: `3px ${C.ink}`, paintOrder: 'stroke fill'}}>{l.text}</div>
        );
      })}
    </>
  );
};

export type CueT = {tin: number; tout: number};

// Bottom subtitles. Keyword in sariq. Fades <= 3 frames.
export const Subtitles: React.FC<{cues: {sub: string; kw: string | null}[]; times: CueT[]; big?: boolean}> = ({cues, times}) => {
  const f = useCurrentFrame();
  const t = f / 30;
  const i = times.findIndex((c) => t >= c.tin && t < c.tout);
  if (i < 0) return null;
  const c = cues[i];
  const fin = times[i].tin * 30, fout = times[i].tout * 30;
  const op = Math.min(interpolate(f, [fin, fin + 3], [0, 1], {extrapolateRight: 'clamp'}), interpolate(f, [fout - 3, fout], [1, 0], {extrapolateLeft: 'clamp'}));
  let parts: React.ReactNode[] = [c.sub];
  if (c.kw) {
    const k = c.sub.indexOf(c.kw);
    if (k >= 0) parts = [c.sub.slice(0, k), <span key="k" style={{color: C.sariq}}>{c.kw}</span>, c.sub.slice(k + c.kw.length)];
  }
  return (
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 120, display: 'flex', justifyContent: 'center', opacity: op}}>
      <div style={{maxWidth: 1500, textAlign: 'center', fontFamily: MONT, fontWeight: 800, fontSize: 54, lineHeight: 1.18, color: C.white, textWrap: 'balance' as any,
        WebkitTextStroke: `12px ${C.ink}`, paintOrder: 'stroke fill'}}>{parts}</div>
    </div>
  );
};
