import { useEffect, useState } from 'react';
import { IconButton } from 'twenty-ui/components/input';
import { IconHeadphones } from 'twenty-ui/icon';

import { type VoiceOption } from '@/ai/voice/types/VoiceOption';
import { fetchVoiceOptions } from '@/ai/voice/utils/fetchVoiceOptions';
import {
  voiceModeEnabledState,
  voiceSelectionState,
} from '@/ai/voice/states/voiceModeState';
import { Select } from '@/ui/input/components/Select';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import { useLingui } from '@lingui/react/macro';

export const AiVoiceModeButton = () => {
  const { t } = useLingui();
  const [voiceModeEnabled, setVoiceModeEnabled] = useAtomState(
    voiceModeEnabledState,
  );
  const [voiceSelection, setVoiceSelection] = useAtomState(voiceSelectionState);
  const [voiceOptions, setVoiceOptions] = useState<VoiceOption[]>([]);

  useEffect(() => {
    if (!voiceModeEnabled || voiceOptions.length > 0) {
      return;
    }

    fetchVoiceOptions()
      .then(setVoiceOptions)
      .catch(() => {
        // voice list is a nicety; the toggle still works with the server default
      });
  }, [voiceModeEnabled, voiceOptions.length]);

  return (
    <>
      <IconButton
        variant="ghost"
        size="sm"
        color={voiceModeEnabled ? 'accent' : 'neutral'}
        onClick={() => setVoiceModeEnabled((current) => !current)}
        aria-label={
          voiceModeEnabled
            ? t`Turn voice replies off`
            : t`Turn voice replies on`
        }
      >
        <IconHeadphones />
      </IconButton>
      {voiceModeEnabled && voiceOptions.length > 0 && (
        <Select<string>
          dropdownId="ai-voice-selection"
          selectSizeVariant="small"
          options={voiceOptions.map((voice) => ({
            value: voice.id,
            label: voice.title,
          }))}
          value={voiceSelection ?? voiceOptions[0].id}
          onChange={(value) => setVoiceSelection(value)}
        />
      )}
    </>
  );
};
