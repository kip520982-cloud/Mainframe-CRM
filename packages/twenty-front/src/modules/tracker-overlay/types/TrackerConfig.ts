export type TrackerMilestone = {
  id: string;
  name: string;
  offsetDays: number;
  note: string;
};

export type TrackerConfig = {
  label: string;
  startDate: string;
  totalDays: number;
  milestones: TrackerMilestone[];
};
