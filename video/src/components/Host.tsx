import React from 'react';
import {useCurrentFrame} from 'remotion';
import {C, mix} from '../theme';

export type Expr = 'surprised' | 'thinking' | 'worried' | 'happy';

// Recurring host boy. Teal hoodie, round eyes. Drawn in a 400x520 box, origin top-left.
export const Host: React.FC<{expr: Expr; x: number; y: number; scale?: number; flip?: boolean; point?: boolean}> = ({expr, x, y, scale = 1, flip, point}) => {
  const f = useCurrentFrame();
  const blink = f % 96 > 90;
  const bob = Math.sin(f / 18) * 4;
  const ink = C.ink;
  const eyeR = expr === 'surprised' ? 30 : 26;
  const pupilDy = expr === 'thinking' ? -8 : expr === 'worried' ? 4 : 0;
  const pupilDx = expr === 'thinking' ? 8 : 0;
  const brow = {surprised: [-22, -22], thinking: [-10, -20], worried: [-8, -8], happy: [-16, -16]}[expr];
  const browTilt = expr === 'worried' ? 10 : expr === 'thinking' ? -6 : 0;
  const mouth = {
    surprised: <ellipse cx={200} cy={268} rx={18} ry={22} fill={ink} />,
    thinking: <path d="M178 270 Q200 262 222 266" stroke={ink} strokeWidth={6} fill="none" strokeLinecap="round" />,
    worried: <path d="M176 276 Q200 258 224 276" stroke={ink} strokeWidth={6} fill="none" strokeLinecap="round" />,
    happy: <path d="M170 258 Q200 296 230 258 Z" fill={ink} stroke={ink} strokeWidth={4} strokeLinejoin="round" />,
  }[expr];
  return (
    <svg width={400 * scale} height={520 * scale} viewBox="0 0 400 520"
      style={{position: 'absolute', left: x, top: y + bob, transform: flip ? 'scaleX(-1)' : undefined, overflow: 'visible'}}>
      {/* body / hoodie */}
      <path d="M70 520 Q70 360 200 350 Q330 360 330 520 Z" fill={C.teal} stroke={ink} strokeWidth={6} />
      <path d="M140 362 Q200 420 260 362" fill={mix(C.teal, ink, 0.18)} stroke={ink} strokeWidth={5} />
      <line x1={185} y1={395} x2={180} y2={460} stroke={ink} strokeWidth={4} />
      <line x1={215} y1={395} x2={220} y2={460} stroke={ink} strokeWidth={4} />
      <rect x={140} y={455} width={120} height={50} rx={14} fill={mix(C.teal, ink, 0.12)} stroke={ink} strokeWidth={4} />
      {point && <path d="M300 420 L380 330" stroke={C.teal} strokeWidth={34} strokeLinecap="round" />}
      {point && <circle cx={384} cy={322} r={20} fill={C.skin} stroke={ink} strokeWidth={5} />}
      {/* neck + head */}
      <rect x={176} y={300} width={48} height={60} fill={C.skin} stroke={ink} strokeWidth={5} />
      <circle cx={200} cy={200} r={120} fill={C.skin} stroke={ink} strokeWidth={6} />
      <circle cx={84} cy={212} r={22} fill={C.skin} stroke={ink} strokeWidth={5} />
      <circle cx={316} cy={212} r={22} fill={C.skin} stroke={ink} strokeWidth={5} />
      {/* hair */}
      <path d="M84 170 Q90 70 200 72 Q320 70 318 172 Q290 120 240 128 Q200 100 160 130 Q110 120 84 170 Z" fill={ink} />
      {/* eyes */}
      {[150, 250].map((cx, i) => (
        <g key={cx}>
          {blink ? (
            <line x1={cx - eyeR} y1={205} x2={cx + eyeR} y2={205} stroke={ink} strokeWidth={6} strokeLinecap="round" />
          ) : (
            <>
              <circle cx={cx} cy={205} r={eyeR} fill={C.white} stroke={ink} strokeWidth={5} />
              <circle cx={cx + pupilDx} cy={208 + pupilDy} r={13} fill={ink} />
              <circle cx={cx + pupilDx + 5} cy={202 + pupilDy} r={4} fill={C.white} />
            </>
          )}
          <line x1={cx - 26} y1={168 + brow[i] + (i === 0 ? browTilt : -browTilt) * 0.5} x2={cx + 26}
            y2={168 + brow[i] + (i === 0 ? -browTilt : browTilt) * 0.5} stroke={ink} strokeWidth={7} strokeLinecap="round" />
        </g>
      ))}
      {/* cheeks + mouth */}
      <circle cx={118} cy={252} r={14} fill={mix(C.skin, C.qizil, 0.35)} />
      <circle cx={282} cy={252} r={14} fill={mix(C.skin, C.qizil, 0.35)} />
      {mouth}
      {expr === 'thinking' && <path d="M300 120 q20 -20 40 0 q20 20 -10 30 v14" stroke={ink} strokeWidth={8} fill="none" strokeLinecap="round" />}
      {expr === 'thinking' && <circle cx={330} cy={186} r={6} fill={ink} />}
      {expr === 'worried' && <path d="M318 130 q8 18 0 26 q-8 -8 0 -26" fill={C.osmon} stroke={ink} strokeWidth={3} />}
    </svg>
  );
};
