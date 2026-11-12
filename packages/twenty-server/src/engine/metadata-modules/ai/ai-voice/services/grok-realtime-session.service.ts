import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

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
};

@Injectable()
export class GrokRealtimeSessionService {
  private readonly logger = new Logger(GrokRealtimeSessionService.name);

  async createBrowserSession(): Promise<GrokRealtimeSession> {
    const apiKey = process.env.XAI_API_KEY || process.env.GROK_VOICE_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException('Grok voice is not configured');
    }

    const model = process.env.GROK_VOICE_MODEL || 'grok-voice-latest';
    const voice = process.env.GROK_VOICE || 'eve';
    const agentId = process.env.GROK_AGENT_ID || null;

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
    };
  }
}
