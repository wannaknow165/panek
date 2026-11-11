import React from 'react';
import { useBoosteraRealtime } from '../services/boosteraApi';
import { ProgramCompositorView } from './ProgramCompositorView';

/**
 * Clean Feed Receiver (§18 & §19):
 * Strictly 1080×1920 (9:16 portrait) Program Output with ZERO buttons,
 * ZERO logos, ZERO borders, ZERO UI controls, and ZERO debug indicators.
 * Designed for OBS Browser Source / BOOSTERA Virtual Camera -> TikTok LIVE Studio.
 */
export const CleanProgramFeedPage: React.FC = () => {
  const { program } = useBoosteraRealtime();

  return (
    <div className="w-screen h-screen bg-black overflow-hidden flex items-center justify-center m-0 p-0">
      <div className="h-full aspect-[9/16] max-w-full bg-black overflow-hidden">
        <ProgramCompositorView program={program} cleanFeedMode />
      </div>
    </div>
  );
};
