import { DEFAULT_TRACKER_CONFIG } from '@/tracker-overlay/constants/DefaultTrackerConfig';
import { type TrackerConfig } from '@/tracker-overlay/types/TrackerConfig';
import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';
import { isPlainObject } from 'twenty-shared/utils';

const isValidTrackerConfig = (value: TrackerConfig): boolean =>
  isPlainObject(value) &&
  typeof value.label === 'string' &&
  typeof value.startDate === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value.startDate) &&
  typeof value.totalDays === 'number' &&
  value.totalDays > 0 &&
  Array.isArray(value.milestones);

export const trackerConfigState = createAtomState<TrackerConfig>({
  key: 'tracker-overlay/trackerConfigState',
  defaultValue: DEFAULT_TRACKER_CONFIG,
  useLocalStorage: true,
  localStorageOptions: { getOnInit: true },
  validateInitFn: isValidTrackerConfig,
});
