import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {BgName, C, mix} from '../theme';

// Flat mood backgrounds. Slow 2% drift on decorative shapes so nothing is fully static.
export const Bg: React.FC<{name: BgName}> = ({name}) => {
  const f = useCurrentFrame();
  const drift = Math.sin(f / 90) * 12;
  if (name === 'krem')
    return (
      <AbsoluteFill style={{background: C.krem}}>
        <svg width={1920} height={1080}>
          {Array.from({length: 13}).map((_, i) => (
            <line key={i} x1={i * 160 + drift} y1={0} x2={i * 160 + drift} y2={1080} stroke={mix(C.krem, C.jigar, 0.08)} strokeWidth={2} />
          ))}
        </svg>
      </AbsoluteFill>
    );
  if (name === 'osmon')
    return (
      <AbsoluteFill style={{background: C.osmon}}>
        <svg width={1920} height={1080}>
          {[[260, 170, 1], [1500, 120, 0.8], [980, 260, 0.6]].map(([x, y, s], i) => (
            <g key={i} transform={`translate(${x + drift * (i + 1)},${y}) scale(${s})`} fill={C.white}>
              <ellipse cx={0} cy={0} rx={110} ry={38} />
              <ellipse cx={-50} cy={-22} rx={55} ry={40} />
              <ellipse cx={40} cy={-30} rx={65} ry={48} />
            </g>
          ))}
          <rect x={0} y={960} width={1920} height={120} fill={mix(C.osmon, C.white, 0.35)} />
        </svg>
      </AbsoluteFill>
    );
  if (name === 'toʻq sariq')
    return (
      <AbsoluteFill style={{background: C.toqsariq}}>
        <svg width={1920} height={1080}>
          <rect x={0} y={0} width={1920} height={360} fill={mix(C.toqsariq, C.sariq, 0.35)} />
          <circle cx={1560 + drift} cy={330} r={150} fill={C.sariq} />
          <rect x={0} y={820} width={1920} height={260} fill={mix(C.toqsariq, C.jigar, 0.55)} />
          <rect x={0} y={760} width={1920} height={60} fill={mix(C.toqsariq, C.jigar, 0.3)} />
        </svg>
      </AbsoluteFill>
    );
  if (name === 'yashil')
    return (
      <AbsoluteFill style={{background: mix(C.osmon, C.white, 0.2)}}>
        <svg width={1920} height={1080}>
          <path d={`M0 560 Q 480 ${500 + drift} 960 560 T 1920 540 V1080 H0Z`} fill={mix(C.yashil, C.white, 0.25)} />
          <path d={`M0 720 Q 640 ${660 - drift} 1280 720 T 1920 700 V1080 H0Z`} fill={C.yashil} />
          {Array.from({length: 7}).map((_, i) => (
            <path key={i} d={`M${-200 + i * 330} 1080 L${300 + i * 260} 720`} stroke={mix(C.yashil, C.ink, 0.15)} strokeWidth={4} />
          ))}
        </svg>
      </AbsoluteFill>
    );
  if (name === 'jigarrang')
    return (
      <AbsoluteFill style={{background: C.jigar}}>
        <svg width={1920} height={1080}>
          <rect x={90 + drift / 2} y={70} width={1740} height={940} rx={18} fill={mix(C.krem, C.jigar, 0.12)} stroke={C.ink} strokeWidth={4} />
          {Array.from({length: 9}).map((_, i) => (
            <line key={i} x1={150} x2={1770} y1={150 + i * 95} y2={150 + i * 95} stroke={mix(C.krem, C.jigar, 0.3)} strokeWidth={2} />
          ))}
        </svg>
      </AbsoluteFill>
    );
  // tun
  return (
    <AbsoluteFill style={{background: C.tun}}>
      <svg width={1920} height={1080}>
        <circle cx={1620 + drift} cy={190} r={80} fill={C.krem} />
        <circle cx={1655 + drift} cy={170} r={70} fill={C.tun} />
        <rect x={0} y={900} width={1920} height={180} fill={mix(C.tun, C.ink, 0.4)} />
      </svg>
    </AbsoluteFill>
  );
};

export const isDark = (b: BgName) => b === 'tun' || b === 'jigarrang';
