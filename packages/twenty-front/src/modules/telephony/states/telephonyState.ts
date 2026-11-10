import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';

export const telephonyDialerOpenState = createAtomState<boolean>({
  key: 'telephonyDialerOpenState',
  defaultValue: false,
});

export const telephonyCallStatusState = createAtomState<
  'idle' | 'dialing' | 'active'
>({
  key: 'telephonyCallStatusState',
  defaultValue: 'idle',
});

export const telephonyDialedNumberState = createAtomState<string>({
  key: 'telephonyDialedNumberState',
  defaultValue: '',
});
