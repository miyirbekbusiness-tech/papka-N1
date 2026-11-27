import React from 'react';
import {AbsoluteFill, useCurrentFrame, interpolate} from 'remotion';
import {ensureFonts, MONT} from './fonts';
import {geoPath, geoMercator} from 'd3-geo';
import {feature} from 'topojson-client';
import world from 'world-atlas/countries-50m.json';
ensureFonts(); const fontFamily = MONT;
const countries: any = feature(world as any, (world as any).objects.countries);
const uz = countries.features.find((f: any) => f.id === '860');
export const TestComp: React.FC = () => {
  const f = useCurrentFrame();
  const proj = geoMercator().fitSize([800, 600], uz);
  const path = geoPath(proj);
  return (
    <AbsoluteFill style={{background: '#F6EBD9', alignItems: 'center', justifyContent: 'center'}}>
      <svg width={800} height={600} style={{transform: `scale(${interpolate(f, [0, 60], [1, 1.04])})`}}>
        <path d={path(uz) || ''} fill="#3BB273" stroke="#1A1A1A" strokeWidth={3} />
      </svg>
      <div style={{position: 'absolute', bottom: 120, fontFamily, fontWeight: 800, fontSize: 54, color: '#fff', WebkitTextStroke: '6px #1A1A1A', paintOrder: 'stroke fill'}}>Oʻzbekiston — test</div>
    </AbsoluteFill>
  );
};
