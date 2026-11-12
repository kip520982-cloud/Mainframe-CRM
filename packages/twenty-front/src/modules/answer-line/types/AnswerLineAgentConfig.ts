import { DEFAULT_ANSWER_LINE_INSTRUCTIONS } from '@/answer-line/constants/defaultAnswerLineInstructions';

export type AnswerLineAgentConfig = {
  name: string;
  agentId: string;
  voice: string;
  instructions: string;
  consoleUrl: string;
};

// Empty agentId on purpose: CRM owns persona/job via instructions + Kieran voice.
// Paste an xAI Voice Agent Builder id later if you want that trained agent instead.
export const DEFAULT_ANSWER_LINE_AGENT_CONFIG: AnswerLineAgentConfig = {
  name: 'Mainframe Answer Line',
  agentId: '',
  voice: 'nejdfbmfnm3s', // Kieran S
  instructions: DEFAULT_ANSWER_LINE_INSTRUCTIONS,
  consoleUrl: 'https://console.x.ai/',
};
