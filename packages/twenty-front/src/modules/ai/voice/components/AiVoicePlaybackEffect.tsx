import { useEffect } from 'react';

import { voiceModeEnabledState } from '@/ai/voice/states/voiceModeState';
import { writeVoiceModeEnabledToStorage } from '@/ai/voice/utils/voiceStorage';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';

// Headphones auto-read is gone. DeepSeek replies stay text; Grok is speech-to-speech only.
export const AiVoicePlaybackEffect = () => {
  const setVoiceModeEnabled = useSetAtomState(voiceModeEnabledState);

  useEffect(() => {
    setVoiceModeEnabled(false);
    writeVoiceModeEnabledToStorage(false);
  }, [setVoiceModeEnabled]);

  return null;
};
