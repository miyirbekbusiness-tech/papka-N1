import React from 'react';
import {C, mix} from '../theme';

const k = C.ink;
const S = {stroke: k, strokeWidth: 5, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const};

// Flat icons drawn in a 120x120 box centred at (60,60).
export const ICONS: Record<string, React.ReactNode> = {
  coin: <g><circle cx={60} cy={60} r={44} fill={C.sariq} {...S} /><circle cx={60} cy={60} r={30} fill="none" {...S} strokeWidth={3} /></g>,
  newcoin: <g><circle cx={60} cy={60} r={48} fill={C.white} {...S} /><circle cx={60} cy={60} r={34} fill={C.krem} {...S} strokeWidth={3} /><text x={60} y={72} textAnchor="middle" fontSize={34} fontWeight={900} fontFamily="Montserrat" fill={k}>?</text></g>,
  euro: <g><circle cx={60} cy={60} r={44} fill={C.osmon} {...S} /><text x={60} y={76} textAnchor="middle" fontSize={48} fontWeight={900} fontFamily="Montserrat" fill={k}>€</text></g>,
  som: <g><rect x={10} y={30} width={100} height={60} rx={8} fill={C.yashil} {...S} /><circle cx={60} cy={60} r={16} fill={C.krem} {...S} strokeWidth={3} /></g>,
  note: <g><rect x={10} y={30} width={100} height={60} rx={8} fill={C.white} {...S} /><circle cx={60} cy={60} r={16} fill={C.krem} {...S} strokeWidth={3} /><text x={60} y={68} textAnchor="middle" fontSize={22} fontWeight={900} fontFamily="Montserrat" fill={k}>?</text></g>,
  shield: <path d="M60 12 L100 28 V60 Q100 94 60 110 Q20 94 20 60 V28 Z" fill={C.osmon} {...S} />,
  market: <g><rect x={18} y={56} width={84} height={46} fill={C.krem} {...S} /><path d="M10 56 L22 22 H98 L110 56 Z" fill={C.qizil} {...S} /><path d="M38 22 L32 56 M60 22 V56 M82 22 L88 56" {...S} strokeWidth={3} /></g>,
  lock: <g><path d="M36 54 V38 Q36 16 60 16 Q84 16 84 38 V54" fill="none" {...S} strokeWidth={8} /><rect x={24} y={52} width={72} height={56} rx={8} fill={C.sariq} {...S} /><circle cx={60} cy={78} r={7} fill={k} /></g>,
  card: <g><rect x={10} y={28} width={100} height={64} rx={10} fill={C.osmon} {...S} /><rect x={10} y={42} width={100} height={12} fill={k} /></g>,
  container: <g><rect x={10} y={34} width={100} height={56} fill={C.qizil} {...S} />{[30, 50, 70, 90].map((x) => <line key={x} x1={x} y1={40} x2={x} y2={84} {...S} strokeWidth={3} />)}</g>,
  plane: <path d="M14 66 L50 58 L72 18 H84 L74 58 L104 56 Q112 60 104 64 L74 66 L84 102 H72 L50 70 L14 72 Z" fill={C.white} {...S} />,
  book: <g><path d="M60 30 Q36 18 12 24 V96 Q36 90 60 102 Q84 90 108 96 V24 Q84 18 60 30 Z" fill={C.white} {...S} /><line x1={60} y1={30} x2={60} y2={102} {...S} />{[44, 58, 72].map((y) => <line key={y} x1={22} y1={y} x2={50} y2={y + 4} {...S} strokeWidth={3} />)}</g>,
  tiles: <g>{['Oʻ', 'Gʻ', 'Sh', 'Ch'].map((t, i) => <g key={t} transform={`translate(${(i % 2) * 56 + 4},${Math.floor(i / 2) * 56 + 4})`}><rect width={52} height={52} rx={6} fill={C.krem} {...S} strokeWidth={4} /><text x={26} y={36} textAnchor="middle" fontSize={24} fontWeight={900} fontFamily="Montserrat" fill={k}>{t}</text></g>)}</g>,
  cyr: <g>{['Ў', 'Ғ', 'Ш', 'Ч'].map((t, i) => <g key={t} transform={`translate(${(i % 2) * 56 + 4},${Math.floor(i / 2) * 56 + 4})`}><rect width={52} height={52} rx={6} fill={mix(C.krem, C.jigar, 0.25)} {...S} strokeWidth={4} /><text x={26} y={36} textAnchor="middle" fontSize={24} fontWeight={900} fontFamily="Montserrat" fill={k}>{t}</text></g>)}</g>,
  passport: <g><rect x={26} y={12} width={68} height={96} rx={8} fill={C.qizil} {...S} /><circle cx={60} cy={52} r={16} fill="none" stroke={C.sariq} strokeWidth={4} /><rect x={40} y={80} width={40} height={6} fill={C.sariq} /></g>,
  idcard: <g><rect x={10} y={28} width={100} height={64} rx={10} fill={C.white} {...S} /><circle cx={36} cy={56} r={12} fill={C.skin} {...S} strokeWidth={3} /><line x1={56} y1={50} x2={98} y2={50} {...S} strokeWidth={4} /><line x1={56} y1={66} x2={90} y2={66} {...S} strokeWidth={4} /></g>,
  train: <g><rect x={20} y={18} width={80} height={72} rx={14} fill={C.toqsariq} {...S} /><rect x={32} y={30} width={56} height={24} rx={4} fill={C.osmon} {...S} strokeWidth={3} /><circle cx={40} cy={74} r={6} fill={k} /><circle cx={80} cy={74} r={6} fill={k} /><path d="M30 104 L40 90 M90 104 L80 90" {...S} /></g>,
  truck: <g><rect x={8} y={34} width={66} height={48} fill={C.sariq} {...S} /><path d="M74 48 H98 L112 64 V82 H74 Z" fill={C.osmon} {...S} /><circle cx={30} cy={88} r={11} fill={k} /><circle cx={92} cy={88} r={11} fill={k} /></g>,
  shop: <g><rect x={24} y={54} width={72} height={52} fill={C.krem} {...S} /><path d="M16 54 L26 30 H94 L104 54 Z" fill={C.yashil} {...S} /><rect x={50} y={74} width={20} height={32} fill={C.jigar} {...S} strokeWidth={3} /></g>,
  bigstore: <g><rect x={6} y={20} width={108} height={88} fill={mix(C.ink, C.white, 0.35)} {...S} />{[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => <rect key={r + '' + c} x={16 + c * 25} y={30 + r * 24} width={16} height={14} fill={C.sariq} />))}</g>,
  balance: <g><line x1={60} y1={20} x2={60} y2={100} {...S} /><line x1={18} y1={34} x2={102} y2={34} {...S} /><path d="M8 70 L18 34 L28 70 Z M92 70 L102 34 L112 70 Z" fill="none" {...S} strokeWidth={3} /><path d="M4 70 H32 Q18 86 4 70 Z M88 70 H116 Q102 86 88 70 Z" fill={C.sariq} {...S} strokeWidth={3} /><rect x={40} y={100} width={40} height={8} fill={k} /></g>,
  compass: <g><circle cx={60} cy={60} r={46} fill={C.white} {...S} /><path d="M60 22 L70 60 L60 98 L50 60 Z" fill={C.qizil} {...S} strokeWidth={3} /></g>,
  cotton: <g><path d="M60 110 V70" {...S} stroke={C.jigar} strokeWidth={6} />{[[60, 46], [40, 60], [80, 60], [48, 36], [72, 36]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={18} fill={C.white} {...S} strokeWidth={4} />)}</g>,
  barrel: <g><rect x={26} y={16} width={68} height={92} rx={10} fill={C.ink} {...S} /><line x1={26} y1={44} x2={94} y2={44} stroke={C.sariq} strokeWidth={5} /><line x1={26} y1={80} x2={94} y2={80} stroke={C.sariq} strokeWidth={5} /></g>,
  derrick: <g><path d="M60 10 L30 108 M60 10 L90 108 M40 76 H80 M48 46 H72" {...S} /><rect x={16} y={104} width={88} height={8} fill={k} /></g>,
  flame: <path d="M60 108 Q24 100 30 66 Q36 40 60 14 Q62 46 76 52 Q86 34 84 30 Q100 56 92 82 Q84 104 60 108 Z" fill={C.osmon} {...S} />,
  valve: <g><circle cx={60} cy={60} r={42} fill="none" {...S} strokeWidth={8} /><line x1={60} y1={18} x2={60} y2={102} {...S} /><line x1={18} y1={60} x2={102} y2={60} {...S} /><circle cx={60} cy={60} r={12} fill={C.qizil} {...S} /></g>,
  thermo: <g><rect x={48} y={10} width={24} height={76} rx={12} fill={C.white} {...S} /><circle cx={60} cy={92} r={18} fill={C.qizil} {...S} /><rect x={55} y={40} width={10} height={50} fill={C.qizil} /></g>,
  envelope: <g><rect x={12} y={30} width={96} height={64} rx={6} fill={C.krem} {...S} /><path d="M12 34 L60 70 L108 34" fill="none" {...S} /></g>,
  tag: <g><path d="M14 52 L52 14 H104 V66 L66 104 Z" fill={C.sariq} {...S} /><circle cx={84} cy={34} r={8} fill={C.white} {...S} strokeWidth={3} /></g>,
  bread: <path d="M16 70 Q16 36 60 36 Q104 36 104 70 V88 H16 Z" fill={mix(C.toqsariq, C.krem, 0.4)} {...S} />,
  doc: <g><path d="M26 10 H80 L100 30 V110 H26 Z" fill={C.white} {...S} />{[44, 62, 80].map((y) => <line key={y} x1={40} y1={y} x2={86} y2={y} {...S} strokeWidth={4} />)}</g>,
  check: <g><circle cx={60} cy={60} r={46} fill={C.yashil} {...S} /><path d="M38 62 L54 78 L84 44" fill="none" stroke={C.white} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" /></g>,
  cross: <g><circle cx={60} cy={60} r={46} fill={C.qizil} {...S} /><path d="M42 42 L78 78 M78 42 L42 78" stroke={C.white} strokeWidth={10} strokeLinecap="round" /></g>,
  bubble: <g><path d="M14 24 H106 V84 H50 L28 104 V84 H14 Z" fill={C.white} {...S} /><text x={60} y={64} textAnchor="middle" fontSize={19} fontWeight={900} fontFamily="Montserrat" fill={k}>Ha / Yoʻq</text></g>,
  question: <g><circle cx={60} cy={60} r={48} fill={C.sariq} {...S} /><text x={60} y={82} textAnchor="middle" fontSize={66} fontWeight={900} fontFamily="Montserrat" fill={k}>?</text></g>,
  gate: <g><rect x={10} y={20} width={14} height={90} fill={C.jigar} {...S} /><rect x={96} y={20} width={14} height={90} fill={C.jigar} {...S} />{[34, 50, 66, 82].map((x) => <line key={x} x1={x} y1={30} x2={x} y2={104} {...S} />)}<line x1={24} y1={50} x2={96} y2={50} {...S} /><line x1={24} y1={86} x2={96} y2={86} {...S} /></g>,
  person: <g><circle cx={60} cy={34} r={20} fill={C.skin} {...S} strokeWidth={4} /><path d="M24 110 Q24 62 60 62 Q96 62 96 110 Z" fill={C.osmon} {...S} strokeWidth={4} /></g>,
  baby: <g><circle cx={60} cy={60} r={26} fill={C.skin} {...S} strokeWidth={4} /><path d="M30 110 Q30 84 60 84 Q90 84 90 110 Z" fill={C.pushti} {...S} strokeWidth={4} /></g>,
  wheel: <g><circle cx={60} cy={60} r={44} fill="none" {...S} strokeWidth={9} /><circle cx={60} cy={60} r={10} fill={k} /><path d="M60 60 L22 46 M60 60 L98 46 M60 60 V102" {...S} strokeWidth={7} /></g>,
  building: <g><path d="M14 46 L60 14 L106 46 Z" fill={C.krem} {...S} /><rect x={20} y={46} width={80} height={56} fill={C.white} {...S} />{[32, 52, 72, 88].map((x) => <rect key={x} x={x - 4} y={54} width={8} height={40} fill={k} />)}<rect x={10} y={102} width={100} height={8} fill={k} /></g>,
  stamp: <g><rect x={14} y={30} width={92} height={60} rx={8} fill="none" stroke={C.qizil} strokeWidth={6} /><path d="M40 60 L54 74 L82 46" fill="none" stroke={C.qizil} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" /></g>,
  pin: <g><path d="M60 110 Q24 64 24 46 A36 36 0 0 1 96 46 Q96 64 60 110 Z" fill={C.qizil} {...S} /><circle cx={60} cy={46} r={13} fill={C.white} {...S} strokeWidth={3} /></g>,
  table: <g><ellipse cx={60} cy={66} rx={52} ry={26} fill={C.jigar} {...S} /><rect x={54} y={90} width={12} height={20} fill={k} /></g>,
  backpack: <g><rect x={26} y={30} width={68} height={78} rx={18} fill={C.toqsariq} {...S} /><path d="M44 30 Q44 12 60 12 Q76 12 76 30" fill="none" {...S} /><rect x={38} y={62} width={44} height={28} rx={6} fill={mix(C.toqsariq, C.ink, 0.15)} {...S} strokeWidth={3} /></g>,
  bus: <g><rect x={8} y={26} width={104} height={64} rx={12} fill={C.sariq} {...S} />{[20, 46, 72].map((x) => <rect key={x} x={x} y={36} width={22} height={20} fill={C.osmon} {...S} strokeWidth={3} />)}<circle cx={32} cy={92} r={10} fill={k} /><circle cx={88} cy={92} r={10} fill={k} /></g>,
  university: <g><path d="M10 44 L60 14 L110 44 Z" fill={C.osmon} {...S} /><rect x={18} y={44} width={84} height={56} fill={C.white} {...S} />{[34, 54, 74, 90].map((x) => <rect key={x} x={x - 5} y={52} width={10} height={40} fill={C.osmon} {...S} strokeWidth={2} />)}</g>,
  puzzle: <path d="M20 20 H50 Q50 6 60 6 Q70 6 70 20 H100 V50 Q114 50 114 60 Q114 70 100 70 V100 H20 Z" fill={C.pushti} {...S} />,
  sun: <g><circle cx={60} cy={60} r={30} fill={C.sariq} {...S} />{[0, 45, 90, 135, 180, 225, 270, 315].map((a) => <line key={a} x1={60 + 40 * Math.cos((a * Math.PI) / 180)} y1={60 + 40 * Math.sin((a * Math.PI) / 180)} x2={60 + 54 * Math.cos((a * Math.PI) / 180)} y2={60 + 54 * Math.sin((a * Math.PI) / 180)} {...S} />)}</g>,
  wheat: <g><path d="M60 112 V30" {...S} stroke={C.jigar} />{[30, 46, 62, 78].map((y) => <g key={y}><ellipse cx={48} cy={y} rx={12} ry={7} fill={C.sariq} {...S} strokeWidth={3} transform={`rotate(-30 48 ${y})`} /><ellipse cx={72} cy={y} rx={12} ry={7} fill={C.sariq} {...S} strokeWidth={3} transform={`rotate(30 72 ${y})`} /></g>)}</g>,
  mountain: <path d="M4 104 L44 34 L64 64 L80 44 L116 104 Z" fill={mix(C.osmon, C.ink, 0.25)} {...S} />,
  signature: <g><rect x={14} y={14} width={92} height={92} rx={8} fill={C.white} {...S} /><path d="M26 78 Q40 50 52 74 Q62 92 74 62 Q82 46 94 70" fill="none" {...S} strokeWidth={4} /></g>,
  chip: <g><rect x={20} y={26} width={80} height={68} rx={10} fill={C.pushti} {...S} /></g>,
};

export const Icon: React.FC<{name: string; x: number; y: number; size?: number; rot?: number}> = ({name, x, y, size = 160, rot = 0}) => (
  <g transform={`translate(${x - size / 2},${y - size / 2}) scale(${size / 120}) rotate(${rot} 60 60)`}>{ICONS[name] ?? ICONS.question}</g>
);
