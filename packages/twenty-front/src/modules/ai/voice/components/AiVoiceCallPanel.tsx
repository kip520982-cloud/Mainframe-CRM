import { useEffect } from 'react';
import {
  registerVoiceCallListener,
  setVoiceCallMuted as setCallMicrophoneMuted,
  stopVoiceCall,
} from '@/ai/voice/call/voiceCallRoom';
import {
  voiceCallAgentSpeakingState,
  voiceCallErrorState,
  voiceCallMutedState,
  voiceCallStatusState,
} from '@/ai/voice/call/voiceCallState';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import { useLingui } from '@lingui/react/macro';
import { styled } from '@linaria/react';
import { IconButton } from 'twenty-ui/components/input';
import { IconAlertCircle, IconMicrophone, IconPhone, IconX } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme';

const StyledPanel = styled.div`
  align-items: center;
  background-color: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.lg};
  bottom: ${themeCssVariables.spacing[6]};
  box-shadow: ${themeCssVariables.boxShadow.strong};
  display: flex;
  gap: ${themeCssVariables.spacing[4]};
  padding: ${themeCssVariables.spacing[4]} ${themeCssVariables.spacing[5]};
  position: fixed;
  right: ${themeCssVariables.spacing[6]};
  z-index: 1000;
`;

const StyledOrb = styled.div<{ isSpeaking: boolean; isConnecting: boolean }>`
  @keyframes mainframe-call-pulse {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.15);
    }
    100% {
      transform: scale(1);
    }
  }

  animation: ${({ isSpeaking, isConnecting }) =>
      isSpeaking || isConnecting ? 'mainframe-call-pulse 1.2s ease-in-out infinite' : 'none'};
  background-color: ${themeCssVariables.accent.primary};
  border-radius: 50%;
  height: 14px;
  width: 14px;
`;

const StyledStatus = styled.div`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.medium};
  margin-right: ${themeCssVariables.spacing[2]};
`;

const StyledErrorText = styled.div`
  color: ${themeCssVariables.color.red};
  font-size: ${themeCssVariables.font.size.sm};
  max-width: 300px;
  text-align: left;
`;

export const AiVoiceCallPanel = () => {
  const { t } = useLingui();
  const [voiceCallStatus, setVoiceCallStatus] = useAtomState(
    voiceCallStatusState,
  );
  const [voiceCallAgentSpeaking, setVoiceCallAgentSpeaking] = useAtomState(
    voiceCallAgentSpeakingState,
  );
  const [voiceCallMuted, setVoiceCallMuted] = useAtomState(
    voiceCallMutedState,
  );
  const [voiceCallError, setVoiceCallError] = useAtomState(
    voiceCallErrorState,
  );

  useEffect(() => {
    return registerVoiceCallListener({
      onStatusChange: setVoiceCallStatus,
      onAgentSpeakingChange: setVoiceCallAgentSpeaking,
      onErrorChange: setVoiceCallError,
    });
  }, [setVoiceCallStatus, setVoiceCallAgentSpeaking, setVoiceCallError]);

  if (voiceCallStatus === 'idle' && !voiceCallError) {
    return null;
  }

  if (voiceCallError) {
    const errorText =
      voiceCallError === 'mic_blocked'
        ? t`Chrome is blocking your microphone. Click the tune icon at the left of the address bar, set Microphone to Allow — and check Mac System Settings, Privacy & Security, Microphone, Chrome is switched on. Then press the call button again.`
        : voiceCallError === 'mic_not_found'
          ? t`No microphone was found on this Mac.`
          : voiceCallError === 'call_failed'
            ? t`Could not reach the call server. Try again in a minute.`
            : t`Microphone problem. Try reloading the page, then call again.`;

    return (
      <StyledPanel>
        <IconAlertCircle color="danger" />
        <StyledErrorText>{errorText}</StyledErrorText>
        <IconButton
          variant="ghost"
          size="sm"
          color="neutral"
          onClick={() => setVoiceCallError(null)}
          aria-label={t`Dismiss`}
        >
          <IconX />
        </IconButton>
      </StyledPanel>
    );
  }

  const statusLabel =
    voiceCallStatus === 'connecting'
      ? t`Connecting…`
      : voiceCallAgentSpeaking
        ? t`Assistant is speaking…`
        : t`Listening…`;

  const handleToggleMute = () => {
    const nextMuted = !voiceCallMuted;
    setVoiceCallMuted(nextMuted);
    void setCallMicrophoneMuted(nextMuted);
  };

  return (
    <StyledPanel>
      <StyledOrb
        isSpeaking={voiceCallAgentSpeaking}
        isConnecting={voiceCallStatus === 'connecting'}
      />
      <StyledStatus>{statusLabel}</StyledStatus>
      <IconButton
        variant="ghost"
        size="sm"
        color="neutral"
        onClick={handleToggleMute}
        aria-label={
          voiceCallMuted ? t`Unmute microphone` : t`Mute microphone`
        }
      >
        {voiceCallMuted ? (
          <IconMicrophone color="danger" />
        ) : (
          <IconMicrophone />
        )}
      </IconButton>
      <IconButton
        variant="ghost"
        size="sm"
        color="danger"
        onClick={stopVoiceCall}
        aria-label={t`End voice call`}
      >
        <IconPhone />
      </IconButton>
    </StyledPanel>
  );
};
