import React from 'react';
import {Easing, interpolate, useCurrentFrame} from 'remotion';
import {geoConicEqualArea, geoPath} from 'd3-geo';
import {feature} from 'topojson-client';
import world from 'world-atlas/countries-50m.json';
import {C, mix} from '../theme';

export const ID: Record<string, string> = {
  RUS: '643', UKR: '804', BLR: '112', UZB: '860', KAZ: '398', GEO: '268', AZE: '031', LTU: '440', MDA: '498', LVA: '428',
  KGZ: '417', TJK: '762', ARM: '051', TKM: '795', EST: '233', AFG: '004', CHN: '156', MNG: '496', IRN: '364', TUR: '792',
};
export const USSR = ['RUS', 'UKR', 'BLR', 'UZB', 'KAZ', 'GEO', 'AZE', 'LTU', 'MDA', 'LVA', 'KGZ', 'TJK', 'ARM', 'TKM', 'EST'];
export const NAME_UZ: Record<string, string> = {RUS: 'Rossiya', UKR: 'Ukraina', BLR: 'Belarus', UZB: 'Oʻzbekiston', KAZ: 'Qozogʻiston',
  GEO: 'Gruziya', AZE: 'Ozarbayjon', LTU: 'Litva', MDA: 'Moldova', LVA: 'Latviya', KGZ: 'Qirgʻiziston', TJK: 'Tojikiston',
  ARM: 'Armaniston', TKM: 'Turkmaniston', EST: 'Estoniya', AFG: 'Afgʻoniston', CHN: 'Xitoy'};

const all: any = feature(world as any, (world as any).objects.countries);
const byId: Record<string, any> = {};
for (const ft of all.features) byId[ft.id] = ft;
const ussrFc = {type: 'FeatureCollection', features: USSR.map((k) => byId[ID[k]])};
const proj = geoConicEqualArea().rotate([-75, 0]).parallels([42, 62]).fitExtent([[150, 150], [1770, 860]], ussrFc as any);
const path = geoPath(proj);
// clip box in lon/lat to keep only the region (Europe → Pacific)
const regionIds = all.features.filter((ft: any) => {
  const [[x0, y0], [x1, y1]] = path.bounds(ft);
  return isFinite(x0) && x1 > -600 && x0 < 2600 && y1 > -500 && y0 < 1700 && ft.id !== '010';
});
const D: Record<string, string> = {};
for (const ft of regionIds) D[ft.id] = path(ft) || '';
export const centroid = (k: string): [number, number] => path.centroid(byId[ID[k]]) as [number, number];
export const bounds = (keys: string[]) => {
  const bs = keys.map((k) => path.bounds(byId[ID[k]]));
  return [[Math.min(...bs.map((b) => b[0][0])), Math.min(...bs.map((b) => b[0][1]))], [Math.max(...bs.map((b) => b[1][0])), Math.max(...bs.map((b) => b[1][1]))]];
};
export const project = (lonlat: [number, number]) => proj(lonlat) as [number, number];

export type Cam = {s: number; x: number; y: number}; // screen = (p - [x,y]) * s + [960,540]
export const camFor = (keys: string[] | null, pad = 0.55): Cam => {
  if (!keys) return {s: 1, x: 960, y: 505};
  const [[x0, y0], [x1, y1]] = bounds(keys);
  const s = Math.max(1, Math.min(7, Math.min((1920 * pad) / (x1 - x0), (1080 * pad) / (y1 - y0))));
  return {s, x: (x0 + x1) / 2, y: (y0 + y1) / 2};
};
export const toScreen = (p: [number, number], c: Cam): [number, number] => [(p[0] - c.x) * c.s + 960, (p[1] - c.y) * c.s + 540];

export const useCam = (from: Cam, to: Cam, frames: number): Cam => {
  const f = useCurrentFrame();
  const t = interpolate(f, [0, frames], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
  const ls = Math.exp(Math.log(from.s) + (Math.log(to.s) - Math.log(from.s)) * t);
  return {s: ls, x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t};
};

export const MapView: React.FC<{cam: Cam; fills?: Record<string, string>; dimOthers?: boolean; dashed?: string[]; thick?: Record<string, string>;
  overlay?: (cam: Cam) => React.ReactNode; base?: string; sea?: string}> = ({cam, fills = {}, dashed = [], thick = {}, overlay, base, sea}) => {
  const ussrIds = new Set(USSR.map((k) => ID[k]));
  const fillOf = (id: string) => {
    const k = Object.keys(ID).find((key) => ID[key] === id);
    if (k && fills[k]) return fills[k];
    if (id === ID.UZB) return C.yashil;
    if (ussrIds.has(id)) return base || mix(C.krem, C.white, 0.5);
    return mix(C.krem, C.jigar, 0.18);
  };
  const sw = 1.6 / cam.s;
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
      <rect x={0} y={0} width={1920} height={1080} fill={sea ?? mix(C.osmon, C.white, 0.45)} />
      <g transform={`translate(960,540) scale(${cam.s}) translate(${-cam.x},${-cam.y})`}>
        {Object.entries(D).map(([id, d]) => (
          <path key={id} d={d} fill={fillOf(id)} stroke={C.ink} strokeWidth={ussrIds.has(id) ? sw * 1.6 : sw} strokeLinejoin="round" />
        ))}
        {dashed.map((k) => (
          <path key={'d' + k} d={D[ID[k]]} fill="none" stroke={C.ink} strokeWidth={sw * 4} strokeDasharray={`${12 / cam.s} ${8 / cam.s}`} />
        ))}
        {Object.entries(thick).map(([k, col]) => (
          <path key={'t' + k} d={D[ID[k]]} fill="none" stroke={col} strokeWidth={sw * 6} />
        ))}
      </g>
      {overlay && overlay(cam)}
    </svg>
  );
};
