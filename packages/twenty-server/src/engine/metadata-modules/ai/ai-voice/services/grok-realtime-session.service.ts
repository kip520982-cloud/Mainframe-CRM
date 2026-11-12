import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

import { type GrokSessionInput } from 'src/engine/metadata-modules/ai/ai-voice/dtos/grok-session.input';

type GrokClientSecretResponse = {
  value?: string;
  expires_at?: number;
  error?: unknown;
};

export type GrokRealtimeSession = {
  value: string;
  expiresAt: number;
  model: string;
  voice: string;
  agentId: string | null;
  instructions: string | null;
  channel: 'assistant' | 'answer-line';
};

const DEFAULT_ASSISTANT_INSTRUCTIONS =
  'You are the Mainframe CRM voice assistant. Keep replies short, clear, and conversational.';

const DEFAULT_ANSWER_LINE_INSTRUCTIONS =
  'You are the Mainframe Answer Line. Greet callers warmly, qualify the enquiry, capture a callback number if needed, and keep answers concise.';

@Injectable()
export class GrokRealtimeSessionService {
  private readonly logger = new Logger(GrokRealtimeSessionService.name);

  async createBrowserSession(
    input: GrokSessionInput = {},
  ): Promise<GrokRealtimeSession> {
    const apiKey = process.env.XAI_API_KEY || process.env.GROK_VOICE_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException('Grok voice is not configured');
    }

    const channel = input.channel ?? 'assistant';
    const model = process.env.GROK_VOICE_MODEL || 'grok-voice-latest';
    const voice =
      input.voice?.trim() ||
      process.env.GROK_VOICE ||
      'nejdfbmfnm3s'; // Kieran S custom voice

    const envAgentId =
      channel === 'answer-line'
        ? process.env.GROK_ANSWER_LINE_AGENT_ID || process.env.GROK_AGENT_ID
        : process.env.GROK_AGENT_ID;

    const agentId = input.agentId?.trim() || envAgentId || null;
    const instructions = agentId
      ? null
      : input.instructions?.trim() ||
        (channel === 'answer-line'
          ? DEFAULT_ANSWER_LINE_INSTRUCTIONS
          : DEFAULT_ASSISTANT_INSTRUCTIONS);

    const response = await fetch('https://api.x.ai/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        expires_after: { seconds: 600 },
      }),
    });

    const payload = (await response.json()) as GrokClientSecretResponse;
    if (!response.ok || !payload.value) {
      this.logger.error(`xAI client_secrets failed: ${response.status}`);
      throw new ServiceUnavailableException('Could not start Grok voice session');
    }

    return {
      value: payload.value,
      expiresAt: payload.expires_at ?? Math.floor(Date.now() / 1000) + 600,
      model,
      voice,
      agentId,
      instructions,
      channel,
    };
  }
}
