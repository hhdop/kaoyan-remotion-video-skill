import React from 'react';
import {Composition, staticFile} from 'remotion';
import {generatedAudioFile, generatedDurationInFrames, generatedVideo} from './generatedContent';
import {MainVideo} from './Video';

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="Main"
        component={MainVideo}
        durationInFrames={generatedDurationInFrames}
        fps={generatedVideo.fps}
        width={1280}
        height={720}
        defaultProps={{
          audioSrc: staticFile(generatedAudioFile),
        }}
      />
      <Composition
        id="Main4K"
        component={MainVideo}
        durationInFrames={generatedDurationInFrames}
        fps={generatedVideo.fps}
        width={3840}
        height={2160}
        defaultProps={{
          audioSrc: staticFile(generatedAudioFile),
        }}
      />
    </>
  );
};
