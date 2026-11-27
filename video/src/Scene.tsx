import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {Bg} from './components/Bg';
import {Chip, Labels, LabelPos, ScenarioTag, Subtitles} from './components/Overlay';
import {Host} from './components/Host';
import {Icon} from './components/Icons';
import {MapView, camFor, centroid, toScreen, useCam, Cam, project} from './components/MapView';
import {Art} from './components/Art';
import {Chart} from './components/Charts';
import {C} from './theme';
import {MONT} from './fonts';
import {DEFS, SceneDef, Anchor} from './defs';
import script from './data/script.json';
import timing from './data/timing.json';

const SC: Record<number, any> = {};
for (const s of (script as any).scenes) SC[s.id] = s;
export const T: Record<string, any> = (timing as any).scenes;

const OVERVIEW: Cam = {s: 1.18, x: 960, y: 560};

// generic push-in camera for non-map scenes: 1.0 -> 1.05 around focal point
const usePush = (frames: number, fx = 960, fy = 500, amt = 0.05) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [0, frames], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.sin)});
  return {s: 1 + amt * t, fx, fy};
};

const placeBoxes = (anchors: [number, number][], forceSide?: 'left' | 'right'): [number, number][] => {
  const used: Record<string, number[]> = {left: [], right: []};
  return anchors.map((a) => {
    const side = forceSide ?? (a[0] > 1000 ? 'left' : 'right');
    const x = side === 'right' ? Math.min(1640, Math.max(a[0] + 360, 1380)) : Math.max(280, Math.min(a[0] - 360, 540));
    let y = Math.max(190, Math.min(760, a[1] - 60));
    for (const u of used[side]) if (Math.abs(u - y) < 86) y = u + 86;
    y = Math.min(780, y);
    used[side].push(y);
    return [x, y];
  });
};

export const SceneView: React.FC<{id: number}> = ({id}) => {
  const s = SC[id];
  const t = T[String(id)];
  const def: SceneDef = DEFS[id];
  const f = useCurrentFrame();
  const frames = t.frames;
  const cueStart = (i: number) => (t.cues[Math.min(i, t.cues.length - 1)]?.tin ?? 0) * 30;
  const appear = (i: number, dur = 8) => interpolate(f, [cueStart(i), cueStart(i) + dur], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.6))});

  // ----- camera & content
  let content: React.ReactNode = null;
  let toScr: (p: [number, number]) => [number, number] = (p) => p;
  const isMap = def.kind === 'map';
  const fromCam = isMap ? (def.from === undefined ? OVERVIEW : def.from === null ? OVERVIEW : camFor(def.from, def.pad ?? 0.55)) : OVERVIEW;
  let toCam = isMap ? (def.focus ? camFor(def.focus, def.pad ?? 0.55) : {...OVERVIEW, s: OVERVIEW.s * 1.05}) : OVERVIEW;
  if (isMap && def.focus && def.from !== undefined && JSON.stringify(def.from) === JSON.stringify(def.focus)) toCam = {...toCam, s: toCam.s * 1.05};
  const cam = useCam(fromCam, toCam, frames);
  const push = usePush(frames, def.focal?.[0] ?? 960, def.focal?.[1] ?? 500, def.push ?? 0.05);

  const anchorPt = (a: Anchor): [number, number] => {
    if (typeof a === 'string') return isMap ? toScreen(centroid(a), cam) : [960, 500];
    if (a.length === 2 && typeof a[0] === 'number' && Math.abs(a[0]) <= 180 && def.lonlat) return toScreen(project(a as [number, number]), cam);
    const p = a as [number, number];
    return isMap ? p : [(p[0] - push.fx) * push.s + push.fx, (p[1] - push.fy) * push.s + push.fy];
  };

  if (isMap) {
    content = (
      <MapView cam={cam} fills={def.fills} dashed={def.dashed} thick={def.thick}
        overlay={(c) => (
          <g>
            {(def.icons ?? []).map((ic, i) => {
              const p = typeof ic.at === 'string' ? toScreen(centroid(ic.at), c) : (ic.at as [number, number]);
              const a = appear(ic.cue ?? 0);
              return <g key={i} opacity={Math.min(1, a * 2)}><Icon name={ic.icon} x={p[0] + (ic.dx ?? 0)} y={p[1] + (ic.dy ?? 0)} size={(ic.size ?? 110) * a} /></g>;
            })}
          </g>
        )} />
    );
  } else {
    content = (
      <div style={{position: 'absolute', inset: 0, transform: `scale(${push.s})`, transformOrigin: `${push.fx}px ${push.fy}px`}}>
        {def.kind === 'art' && <Art name={def.art!} frames={frames} cueStart={cueStart} />}
        {def.kind === 'chart' && <Chart spec={def.chart!} cueStart={cueStart} frames={frames} />}
        {(def.kind === 'icons' || def.kind === 'host' || def.kind === 'timeline' || def.kind === 'art' || def.kind === 'chart') && (
          <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
            {(def.icons ?? []).map((ic, i) => {
              const a = appear(ic.cue ?? 0);
              const p = ic.at as [number, number];
              return <g key={i} opacity={Math.min(1, a * 2)}><Icon name={ic.icon} x={p[0]} y={p[1]} size={(ic.size ?? 170) * a} rot={ic.rot} /></g>;
            })}
          </svg>
        )}
        {def.kind === 'timeline' && <Timeline pins={def.pins!} cueStart={cueStart} />}
        {def.texts?.map((tx, i) => {
          const a = appear(tx.cue ?? 0);
          return <div key={i} style={{position: 'absolute', left: tx.at[0], top: tx.at[1], transform: `translate(-50%,-50%) scale(${a})`, fontFamily: MONT, fontWeight: 900,
            fontSize: tx.size ?? 64, color: tx.color ?? C.ink, whiteSpace: 'nowrap', WebkitTextStroke: tx.stroke ? `10px ${C.ink}` : undefined, paintOrder: 'stroke fill'}}>{tx.text}</div>;
        })}
        {def.host && <Host expr={def.host.expr} x={def.host.x} y={def.host.y} scale={def.host.scale ?? 1} flip={def.host.flip} point={def.host.point} />}
        {def.host2 && <Host expr={def.host2.expr} x={def.host2.x} y={def.host2.y} scale={def.host2.scale ?? 1} flip={def.host2.flip} />}
      </div>
    );
  }
  if (isMap && def.host) content = <>{content}<Host expr={def.host.expr} x={def.host.x} y={def.host.y} scale={def.host.scale ?? 1} flip={def.host.flip} point={def.host.point} /></>;

  // ----- labels
  const anchors: [number, number][] = s.labels.map((_: any, i: number) => anchorPt(def.anchors?.[i] ?? [960, 500]));
  const boxesAt0 = placeBoxes(anchors.map((a: [number, number]) => a), def.labelSide);
  const labels: LabelPos[] = s.labels.map((l: any, i: number) => ({text: l.text, t: t.label_t[i] + 0.0, anchor: anchors[i], box: def.boxes?.[i] ?? boxesAt0[i]}));

  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <Bg name={s.bg} />
      {content}
      <Labels items={labels} />
      <Chip type={s.type} />
      {s.type === 'TAXMIN' && isMap && <ScenarioTag />}
      <Subtitles cues={s.cues} times={t.cues} />
    </AbsoluteFill>
  );
};

const Timeline: React.FC<{pins: {label: string; cue: number; x: number}[]; cueStart: (i: number) => number}> = ({pins, cueStart}) => {
  const f = useCurrentFrame();
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
      <line x1={180} y1={560} x2={1740} y2={560} stroke={C.ink} strokeWidth={8} strokeLinecap="round" />
      {pins.map((p, i) => {
        const a = interpolate(f, [cueStart(p.cue), cueStart(p.cue) + 8], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.8))});
        return (
          <g key={i} transform={`translate(${p.x},560) scale(${a})`}>
            <circle r={26} fill={C.qizil} stroke={C.ink} strokeWidth={6} />
            <rect x={-110} y={-150} width={220} height={84} rx={14} fill={C.white} stroke={C.ink} strokeWidth={5} />
            <text y={-94} textAnchor="middle" fontFamily="Montserrat" fontWeight={900} fontSize={46} fill={C.ink}>{p.label}</text>
          </g>
        );
      })}
    </svg>
  );
};
