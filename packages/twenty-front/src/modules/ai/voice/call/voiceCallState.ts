import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';

export type VoiceCallStatus = 'idle' | 'connecting' | 'active';

export const voiceCallStatusState = createAtomState<VoiceCallStatus>({
  key: 'voiceCallStatusState',
  defaultValue: 'idle',
});

export const voiceCallAgentSpeakingState = createAtomState<boolean>({
  key: 'voiceCallAgentSpeakingState',
  defaultValue: false,
});

export const voiceCallMutedState = createAtomState<boolean>({
  key: 'voiceCallMutedState',
  defaultValue: false,
});

export const voiceCallErrorState = createAtomState<string | null>({
  key: 'voiceCallErrorState',
  defaultValue: null,
});
