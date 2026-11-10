import { Injectable, Logger } from '@nestjs/common';

export type VoiceOption = {
  id: string;
  title: string;
  provider: 'fish' | 'ollama';
};

export const VOICE_OPTIONS: VoiceOption[] = [
  {
    id: 'female-british-english',
    title: 'Female (British English) — LFM3 Omni',
    provider: 'ollama',
  },
  {
    id: '4f69aad5ec724c4983aac2bcc8bee54e',
    title: 'Leigh Hart (NZ clone)',
    provider: 'fish',
  },
  {
    id: 'a754ca8729d642d9a918a42b5b6a77d1',
    title: 'Dave (AU clone)',
    provider: 'fish',
  },
  {
    id: 'c3571de1122d4b24b667e4140fa292a0',
    title: 'Hectic Academic (NZ clone)',
    provider: 'fish',
  },
];

const FISH_TTS_URL = 'https://api.fish.audio/v1/tts';

@Injectable()
export class VoiceTtsService {
  private readonly logger = new Logger(VoiceTtsService.name);

  getVoiceOptions(): VoiceOption[] {
    return VOICE_OPTIONS;
  }

  async synthesize({
    text,
    voiceId,
  }: {
    text: string;
    voiceId?: string;
  }): Promise<{ audio: Buffer; contentType: string; provider: string }> {
    const voice =
      VOICE_OPTIONS.find((option) => option.id === voiceId) ??
      VOICE_OPTIONS[0];

    if (voice.provider === 'ollama') {
      return this.synthesizeWithOllama({ text, voiceId: voice.id });
    }

    return this.synthesizeWithFish({ text, voice });
  }

  private async synthesizeWithOllama({
    text,
    voiceId,
  }: {
    text: string;
    voiceId: string;
  }): Promise<{ audio: Buffer; contentType: string; provider: string }> {
    const baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';

    const response = await fetch(`${baseUrl}/v1/audio/speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'lfm3-omni:latest',
        voice: voiceId,
        input: text,
      }),
    });

    if (!response.ok) {
      const body = await response.text();

      this.logger.warn(
        `Ollama speech ${response.status}: ${body.slice(0, 160)}`,
      );

      throw new Error(`Ollama speech ${response.status}`);
    }

    const audio = Buffer.from(await response.arrayBuffer());

    return { audio, contentType: 'audio/wav', provider: 'ollama' };
  }

  private async synthesizeWithFish({
    text,
    voice,
  }: {
    text: string;
    voice: VoiceOption;
  }): Promise<{ audio: Buffer; contentType: string; provider: string }> {
    const apiKey = process.env.FISH_AUDIO_API_KEY;

    if (!apiKey) {
      throw new Error('FISH_AUDIO_API_KEY is not set');
    }

    const response = await fetch(FISH_TTS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        model: 's2.1-pro',
      },
      body: JSON.stringify({
        text,
        reference_id: voice.id,
        format: 'mp3',
        latency: 'normal',
      }),
    });

    if (!response.ok) {
      const body = await response.text();

      this.logger.warn(
        `Fish TTS ${response.status}: ${body.slice(0, 160)} — the front falls back to the browser NZ voice`,
      );

      throw new Error(`Fish TTS ${response.status}`);
    }

    const audio = Buffer.from(await response.arrayBuffer());

    return { audio, contentType: 'audio/mpeg', provider: 'fish' };
  }
}
