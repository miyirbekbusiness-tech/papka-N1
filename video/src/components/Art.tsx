import React from 'react';
import {Easing, interpolate, useCurrentFrame} from 'remotion';
import {C, mix} from '../theme';
import {Icon} from './Icons';

const k = C.ink;
const S = {stroke: k, strokeWidth: 5, strokeLinejoin: 'round' as const};

// Generic illustrated settings (no real landmarks, no real people).
export const Art: React.FC<{name: string; frames: number; cueStart: (i: number) => number}> = ({name, frames, cueStart}) => {
  const f = useCurrentFrame();
  const at = (i: number, d = 10) => interpolate(f, [cueStart(i), cueStart(i) + d], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  if (name === 'cotton') {
    const aral = at(2, 14);
    return (
      <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
        {Array.from({length: 4}).map((_, r) =>
          Array.from({length: 11}).map((_, c) => <Icon key={r + '-' + c} name="cotton" x={120 + c * 170 + (r % 2) * 85} y={640 + r * 90} size={110 + r * 12} />)
        )}
        <g opacity={aral} transform={`translate(${1300 - 60 * (1 - aral)},170)`}>
          <rect x={0} y={0} width={480} height={380} rx={20} fill={C.krem} {...S} />
          <path d="M80 80 Q160 30 260 60 Q380 90 400 200 Q390 320 260 330 Q140 340 90 250 Q50 160 80 80 Z" fill={mix(C.osmon, C.white, 0.4)} stroke={C.osmon} strokeWidth={6} strokeDasharray="14 10" />
          <path d={`M${170 + 20 * aral} 150 Q220 120 270 150 Q300 190 270 240 Q230 270 ${190 + 10 * aral} 240 Q150 200 ${170 + 20 * aral} 150 Z M300 110 Q330 100 340 130 Q330 160 300 150 Z`} fill={C.osmon} {...S} strokeWidth={4} />
          <text x={240} y={360} textAnchor="middle" fontFamily="Montserrat" fontWeight={900} fontSize={30} fill={k}>1960 → bugun</text>
        </g>
      </svg>
    );
  }
  if (name === 'night') {
    return (
      <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
        {[[100, 520, 180], [300, 440, 150], [470, 560, 200], [700, 380, 170], [900, 500, 220], [1150, 420, 160], [1330, 540, 210], [1560, 460, 180]].map(([x, y, w], i) => (
          <g key={i}>
            <rect x={x} y={y} width={w} height={900 - y} fill={mix(C.tun, C.ink, 0.35)} {...S} strokeWidth={3} />
            {Array.from({length: Math.floor((900 - y) / 70)}).map((_, j) => (
              <rect key={j} x={x + 25} y={y + 30 + j * 70} width={w - 50} height={18} fill={(i + j) % 3 === 0 ? C.sariq : mix(C.tun, C.white, 0.15)} />
            ))}
          </g>
        ))}
        <g opacity={at(2, 16)} transform="translate(1280,140)">
          <rect x={0} y={0} width={420} height={150} rx={16} fill={C.krem} {...S} />
          <text x={210} y={95} textAnchor="middle" fontFamily="Montserrat" fontWeight={900} fontSize={54} fill={k}>31-avgust</text>
        </g>
      </svg>
    );
  }
  if (name === 'village') {
    const walk = interpolate(f, [cueStart(1), frames], [0, 380], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
    return (
      <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
        {[[140, 520], [420, 560], [1500, 540]].map(([x, y], i) => (
          <g key={i}>
            <rect x={x} y={y} width={220} height={200} fill={C.krem} {...S} />
            <path d={`M${x - 20} ${y} L${x + 110} ${y - 90} L${x + 240} ${y} Z`} fill={C.jigar} {...S} />
            <rect x={x + 85} y={y + 110} width={50} height={90} fill={C.jigar} {...S} />
          </g>
        ))}
        <Icon name="bus" x={1250} y={700} size={220} />
        {[0, 1, 2].map((i) => <Icon key={i} name="backpack" x={720 + i * 110 + walk} y={720} size={90} />)}
        <g opacity={at(2, 12)}><rect x={760} y={560} width={200} height={20} fill={C.jigar} {...S} /><rect x={780} y={580} width={14} height={60} fill={k} /><rect x={926} y={580} width={14} height={60} fill={k} /></g>
      </svg>
    );
  }
  if (name === 'classroom') {
    return (
      <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
        <rect x={320} y={130} width={1080} height={430} rx={14} fill={mix(C.yashil, C.ink, 0.45)} stroke={k} strokeWidth={10} />
        <text x={860} y={330} textAnchor="middle" fontFamily="Montserrat" fontWeight={900} fontSize={120} fill={C.white}>11 yil</text>
        <text x={860} y={450} textAnchor="middle" fontFamily="Montserrat" fontWeight={800} fontSize={54} fill={C.sariq} opacity={at(1)}>umumiy standart</text>
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <rect x={300 + i * 380} y={700} width={300} height={30} fill={C.jigar} {...S} />
            <g opacity={at(1)}><Icon name="book" x={450 + i * 380} y={660} size={110} /></g>
          </g>
        ))}
      </svg>
    );
  }
  if (name === 'mosque') {
    return (
      <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
        <g fill={mix(C.tun, C.ink, 0.45)} {...S} strokeWidth={4}>
          <rect x={560} y={560} width={620} height={340} />
          <path d="M640 560 Q870 260 1100 560 Z" />
          <rect x={1240} y={300} width={70} height={600} />
          <path d="M1230 300 L1275 210 L1320 300 Z" />
          <rect x={430} y={420} width={60} height={480} />
          <path d="M420 420 L460 340 L500 420 Z" />
        </g>
        {[700, 820, 940, 1060].map((x) => <path key={x} d={`M${x} 900 V760 Q${x + 35} 700 ${x + 70} 760 V900`} fill={C.sariq} opacity={0.85} />)}
        <g opacity={at(2, 14)} transform="translate(1380,560)">
          <rect x={0} y={0} width={420} height={130} rx={60} fill={C.krem} {...S} />
          <text x={210} y={84} textAnchor="middle" fontFamily="Montserrat" fontWeight={900} fontSize={40} fill={k}>vijdon erkinligi</text>
        </g>
      </svg>
    );
  }
  if (name === 'domes') {
    return (
      <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
        <rect x={420} y={420} width={1080} height={400} fill={mix(C.krem, C.toqsariq, 0.2)} {...S} />
        <path d="M820 820 V560 Q960 400 1100 560 V820 Z" fill={C.jigar} {...S} />
        {[[560, 420], [1360, 420]].map(([x, y]) => <path key={x} d={`M${x - 110} ${y} Q${x} ${y - 230} ${x + 110} ${y} Z`} fill={C.osmon} {...S} />)}
        {[0, 1, 2, 3].map((i) => <Icon key={i} name="person" x={200 + i * 120} y={760} size={110} />)}
        <g opacity={at(1, 12)}><Icon name="doc" x={1650} y={600} size={200} /><Icon name="stamp" x={1650} y={760} size={140} /></g>
      </svg>
    );
  }
  if (name === 'archive') {
    const road = at(1, 20);
    return (
      <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
        <g opacity={1 - road * 0.85}>
          <Icon name="book" x={960} y={460} size={520} />
        </g>
        <g opacity={road}>
          <path d={`M0 820 Q960 ${700 - 40 * road} 1920 820 V900 Q960 780 0 900 Z`} fill={mix(C.ink, C.white, 0.3)} {...S} />
          <Icon name="truck" x={500 + 300 * road} y={760} size={180} />
          <Icon name="bus" x={1400 - 200 * road} y={760} size={170} />
          <Icon name="market" x={300} y={560} size={170} />
          <Icon name="shop" x={1620} y={560} size={170} />
        </g>
      </svg>
    );
  }
  return null;
};
