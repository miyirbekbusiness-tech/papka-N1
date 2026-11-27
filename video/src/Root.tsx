import React from 'react';
import {Composition} from 'remotion';
import {TestComp} from './TestComp';
export const Root: React.FC = () => (
  <>
    <Composition id="Test" component={TestComp} durationInFrames={60} fps={30} width={1920} height={1080} />
  </>
);
