import React from 'react';
import {Composition, staticFile} from 'remotion';
import {MainVideo} from './Video';

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="Main"
        component={MainVideo}
        durationInFrames={4735}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{
          audioSrc: staticFile('voice.mp3'),
        }}
      />
      <Composition
        id="Main4K"
        component={MainVideo}
        durationInFrames={4735}
        fps={30}
        width={3840}
        height={2160}
        defaultProps={{
          audioSrc: staticFile('voice.mp3'),
        }}
      />
    </>
  );
};
