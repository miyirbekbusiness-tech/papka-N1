import React from 'react';
import {Composition, Series} from 'remotion';
import {TestComp} from './TestComp';
import {SceneView, T} from './Scene';
import {ensureFonts} from './fonts';
import {Hook, HOOK_FRAMES} from './Hook';

ensureFonts();
const IDS = Object.keys(T).map(Number).sort((a, b) => a - b);
const total = HOOK_FRAMES + IDS.reduce((s, id) => s + T[String(id)].frames, 0);

const Main: React.FC = () => (
  <Series>
    {HOOK_FRAMES > 0 && <Series.Sequence durationInFrames={HOOK_FRAMES}><Hook /></Series.Sequence>}
    {IDS.map((id) => (
      <Series.Sequence key={id} durationInFrames={T[String(id)].frames}><SceneView id={id} /></Series.Sequence>
    ))}
  </Series>
);

export const Root: React.FC = () => (
  <>
    <Composition id="Main" component={Main} durationInFrames={total} fps={30} width={1920} height={1080} />
    <Composition id="Scene" component={SceneView as any} durationInFrames={600} fps={30} width={1920} height={1080} defaultProps={{id: 2}}
      calculateMetadata={({props}: any) => ({durationInFrames: T[String(props.id)].frames})} />
    <Composition id="Test" component={TestComp} durationInFrames={60} fps={30} width={1920} height={1080} />
  </>
);
