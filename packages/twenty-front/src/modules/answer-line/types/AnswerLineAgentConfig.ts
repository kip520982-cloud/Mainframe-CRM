import {
  DEFAULT_ANSWER_LINE_GREETING,
  DEFAULT_ANSWER_LINE_INSTRUCTIONS,
} from '@/answer-line/constants/defaultAnswerLineInstructions';
import { GROK_VOICE_AGENT_ID } from '@/ai/voice/constants/grokVoiceAgent';

export type AnswerLineAgentConfig = {
  name: string;
  agentId: string;
  voice: string;
  greeting: string;
  instructions: string;
  consoleUrl: string;
};

export const DEFAULT_ANSWER_LINE_AGENT_CONFIG: AnswerLineAgentConfig = {
  name: 'Mainframe Answer Line',
  agentId: GROK_VOICE_AGENT_ID,
  voice: 'nejdfbmfnm3s', // Kieran S
  greeting: DEFAULT_ANSWER_LINE_GREETING,
  instructions: DEFAULT_ANSWER_LINE_INSTRUCTIONS,
  consoleUrl: 'https://console.x.ai/',
};
