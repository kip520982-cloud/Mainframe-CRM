import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';

export const isTrackerOverlayOpenState = createAtomState<boolean>({
  key: 'tracker-overlay/isTrackerOverlayOpenState',
  defaultValue: false,
});
