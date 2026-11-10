export type CardKind = 'signal' | 'objection' | 'say_this' | 'fact' | 'warning';

export type Card = {
  id: number;
  call_id: string;
  at: number;
  kind: CardKind;
  title: string;
  body: string;
  urgency: 1 | 2 | 3;
};

export type Play = { q: string; a: string };

export type Fact = {
  id: number;
  call_id: string;
  at: number;
  text: string;
};

export type Line = {
  id: number;
  call_id: string;
  at: number;
  speaker: 'you' | 'them';
  text: string;
};

export type Brief = {
  headline?: string;
  what_they_do?: string;
  person?: { role?: string; background?: string };
  likely_pains?: { pain: string; why: string }[];
  hooks?: string[];
  questions_to_ask?: string[];
  objections_expected?: { objection: string; response: string }[];
  dont_say?: string[];
  sources?: string[];
};

export type CallMode =
  | 'sales'
  | 'interview'
  | 'recruit_candidate'
  | 'recruit_client';

export const CALL_MODES: CallMode[] = [
  'sales',
  'interview',
  'recruit_candidate',
  'recruit_client',
];

export type CallRow = {
  id: string;
  created_at: string;
  user_id: number;
  mode: CallMode;
  prospect_name: string | null;
  company: string | null;
  website: string | null;
  linkedin: string | null;
  notes: string | null;
  cv: string | null;
  role_spec: string | null;
  brief: Brief | null;
  playbook: Play[] | null;
  brief_status: 'pending' | 'running' | 'ready' | 'failed';
  brief_error: string | null;
  status: 'draft' | 'live' | 'done';
  wrapup: Wrapup | null;
  started_at: string | null;
  ended_at: string | null;
};

export type Wrapup = {
  summary?: string;
  temperature?: string;
  objections_raised?: string[];
  commitments?: string[];
  next_steps?: string[];
  follow_up_email?: { subject: string; body: string };
  coaching?: string[];
  pitch?: { title?: string; body?: string };
};

export type Profile = {
  id: number;
  user_id: number;
  seller_name: string | null;
  company: string | null;
  offering: string | null;
  icp: string | null;
  pricing: string | null;
  differentiators: string | null;
  common_objections: string | null;
};
