import { startVoiceCall, stopVoiceCall } from '@/ai/voice/call/voiceCallRoom';
import { GROK_VOICE_AGENT_ID } from '@/ai/voice/constants/grokVoiceAgent';
import { voiceCallStatusState } from '@/ai/voice/call/voiceCallState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useLingui } from '@lingui/react/macro';
import { IconButton } from 'twenty-ui/components/input';
import { IconPhone } from 'twenty-ui/icon';

export const AiVoiceCallButton = () => {
  const { t } = useLingui();
  const voiceCallStatus = useAtomStateValue(voiceCallStatusState);

  if (voiceCallStatus !== 'idle') {
    return null;
  }

  const handleStartCall = () => {
    void startVoiceCall({ agentId: GROK_VOICE_AGENT_ID }).catch(() => {
      stopVoiceCall();
    });
  };

  return (
    <IconButton
      variant="ghost"
      size="sm"
      color="neutral"
      onClick={handleStartCall}
      aria-label={t`Start voice call with assistant`}
    >
      <IconPhone />
    </IconButton>
  );
};
