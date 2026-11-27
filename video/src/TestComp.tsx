import React from 'react';
import {AbsoluteFill} from 'remotion';
import {ensureFonts} from './fonts';
import {MapView, camFor, USSR} from './components/MapView';
import {Bg} from './components/Bg';
import {Host} from './components/Host';
import {Chip, Subtitles} from './components/Overlay';
ensureFonts();
export const TestComp: React.FC = () => (
  <AbsoluteFill>
    <Bg name="krem" />
    <MapView cam={camFor(null)} fills={{RUS: '#D7263D'}} />
    <Host expr="happy" x={1450} y={420} scale={0.9} />
    <Chip type="FAKT" />
    <Subtitles cues={[{sub: 'Bu respublikalarda qariyb 287 million odam yashagan.', kw: '287 million'}]} times={[{tin: 0, tout: 5}]} />
  </AbsoluteFill>
);
