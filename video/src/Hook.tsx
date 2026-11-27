import React from 'react';
import {AbsoluteFill, Easing, interpolate, Sequence, useCurrentFrame} from 'remotion';
import hook from './data/hook.json';
import {SceneView} from './Scene';
import {C} from './theme';
import {MONT} from './fonts';

// STAGE 6 hook: fast cuts from key scenes, 6 px shake on hits, huge centre words slamming in (1.35 -> 1.0 over 3 frames).
const H: any = hook;
export const HOOK_FRAMES: number = H.frames;

export const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const hit = H.cues.map((c: any) => c.tin * 30);
  const sinceHit = Math.min(...hit.map((h: number) => (f >= h ? f - h : 999)));
  const shake = sinceHit < 6 ? 6 * (1 - sinceHit / 6) : 0;
  const sx = shake * Math.sin(f * 2.7), sy = shake * Math.cos(f * 3.1);
  const cue = H.cues.find((c: any) => t >= c.tin && t < c.tout);
  return (
    <AbsoluteFill style={{background: C.ink, overflow: 'hidden'}}>
      <AbsoluteFill style={{transform: `translate(${sx}px,${sy}px) scale(1.02)`}}>
        {H.cuts.map((c: any, i: number) => (
          <Sequence key={i} from={Math.round(c.start * 30)} durationInFrames={Math.round((c.end - c.start) * 30)}>
            <Sequence from={-Math.round(c.at * 30)}>
              <SceneView id={c.scene} bare />
            </Sequence>
          </Sequence>
        ))}
      </AbsoluteFill>
      <AbsoluteFill style={{background: 'rgba(26,26,26,0.25)'}} />
      {cue && (() => {
        const k = f - cue.tin * 30;
        const s = interpolate(k, [0, 3], [1.35, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
        const op = interpolate(k, [0, 2], [0, 1], {extrapolateRight: 'clamp'});
        const parts = cue.kw && cue.text.includes(cue.kw)
          ? [cue.text.slice(0, cue.text.indexOf(cue.kw)), <span key="k" style={{color: cue.kwColor === 'sariq' ? C.sariq : C.qizil}}>{cue.kw}</span>, cue.text.slice(cue.text.indexOf(cue.kw) + cue.kw.length)]
          : [cue.text];
        return (
          <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
            <div style={{transform: `scale(${s})`, opacity: op, fontFamily: MONT, fontWeight: 900, fontSize: 150, lineHeight: 1.05, color: C.white,
              textAlign: 'center', maxWidth: 1700, WebkitTextStroke: `16px ${C.ink}`, paintOrder: 'stroke fill'}}>{parts}</div>
          </AbsoluteFill>
        );
      })()}
    </AbsoluteFill>
  );
};
