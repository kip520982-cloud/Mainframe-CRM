import { type TrackerConfig } from '@/tracker-overlay/types/TrackerConfig';

export const DEFAULT_TRACKER_CONFIG: TrackerConfig = {
  label: 'Thai ED Visa',
  startDate: new Date().toISOString().slice(0, 10),
  totalDays: 365,
  milestones: [
    { id: 'change', name: 'Change to ED visa', offsetDays: 0, note: '฿12,000' },
    { id: 'ext-1', name: '1st Extension', offsetDays: 90, note: '฿3,500 / ฿5,000' },
    { id: 'ext-2', name: '2nd Extension', offsetDays: 125, note: '฿5,000' },
    { id: 'ext-3', name: '3rd Extension', offsetDays: 215, note: '฿5,000' },
    { id: 'ext-4', name: '4th Extension', offsetDays: 270, note: '฿5,000' },
    { id: 'done', name: 'Year complete', offsetDays: 365, note: '' },
  ],
};
