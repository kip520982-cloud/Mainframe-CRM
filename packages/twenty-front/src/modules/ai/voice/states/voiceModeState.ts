import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';

export const voiceModeEnabledState = createAtomState<boolean>({
  key: 'ai/voiceModeEnabledState',
  defaultValue: false,
});

export const voiceSelectionState = createAtomState<string | null>({
  key: 'ai/voiceSelectionState',
  defaultValue: null,
});
