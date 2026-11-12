export type AnswerLineAgentConfig = {
  name: string;
  agentId: string;
  voice: string;
  instructions: string;
  consoleUrl: string;
};

export const DEFAULT_ANSWER_LINE_AGENT_CONFIG: AnswerLineAgentConfig = {
  name: 'Mainframe Answer Line',
  agentId: 'agent_DBLHdNt3ZyJnL864',
  voice: 'eve',
  instructions:
    'You are the Mainframe Answer Line. Greet callers warmly, qualify the enquiry, capture a callback number if needed, and keep answers concise.',
  consoleUrl: 'https://console.x.ai/',
};
