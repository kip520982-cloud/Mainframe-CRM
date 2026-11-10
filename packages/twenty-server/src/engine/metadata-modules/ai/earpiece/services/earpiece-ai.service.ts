import { Injectable } from '@nestjs/common';

// Two providers, one preference order, ported from the standalone Earpiece
// app: OpenRouter first (fails fast with 402 when the balance is empty), then
// the Gemini free tier as the $0 fallback.

const OR_AUDIO_MODEL =
  process.env.EARPIECE_OPENROUTER_AUDIO_MODEL || 'google/gemini-2.5-flash-lite';
const GEMINI_MODEL = process.env.EARPIECE_GEMINI_MODEL || 'gemini-3.5-flash-lite';
const DS_MODEL = process.env.EARPIECE_DEEPSEEK_MODEL || 'deepseek-flash';

type GeminiPart = { text: string } | { inline_data: { mime_type: string; data: string } };

@Injectable()
export class EarpieceAiService {
  private orModel = process.env.EARPIECE_OPENROUTER_MODEL || 'google/gemini-2.5-flash-lite';

  parseJson<T>(raw: string): T {
    let s = raw.trim();
    const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) {s = fence[1].trim();}
    const start = s.indexOf('{');
    const end = s.lastIndexOf('}');
    if (start === -1 || end === -1) {throw new Error('No JSON found in model output');}
    return JSON.parse(s.slice(start, end + 1)) as T;
  }

  private isBillingError(err: unknown): boolean {
    const status = (err as { status?: number })?.status;
    if (status === 402 || status === 429) {return true;}
    const msg = err instanceof Error ? err.message : String(err);
    return /402|429|credits|balance|quota/i.test(msg);
  }

  private async openRouter(
    body: Record<string, unknown>,
  ): Promise<string> {
    const key = process.env.EARPIECE_OPENROUTER_API_KEY;
    if (!key) {throw Object.assign(new Error('No EARPIECE_OPENROUTER_API_KEY'), { status: 402 });}
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'X-Title': 'Earpiece',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw Object.assign(
        new Error(`openrouter ${res.status}: ${(await res.text()).slice(0, 200)}`),
        { status: res.status },
      );
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content ?? '';
  }

  // DeepSeek has no audio and no web search, so it only serves plain text
  // calls (live coaching, wrapups, no-search briefs); search stays on
  // OpenRouter's :online suffix and audio on the Gemini free tier.
  private async deepSeek(opts: {
    instructions: string;
    input: string;
    maxTokens?: number;
  }): Promise<string> {
    const key = process.env.EARPIECE_DEEPSEEK_API_KEY;
    if (!key) {throw Object.assign(new Error('No EARPIECE_DEEPSEEK_API_KEY'), { status: 402 });}
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: DS_MODEL,
        messages: [
          { role: 'system', content: opts.instructions },
          { role: 'user', content: opts.input },
        ],
        response_format: { type: 'json_object' },
        ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
      }),
    });
    if (!res.ok) {
      throw Object.assign(
        new Error(`deepseek ${res.status}: ${(await res.text()).slice(0, 200)}`),
        { status: res.status },
      );
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content ?? '';
  }

  private async gemini(opts: {
    system: string;
    parts: GeminiPart[];
    maxTokens?: number;
    webSearch?: boolean;
  }): Promise<string> {
    const key = process.env.EARPIECE_GEMINI_API_KEY;
    if (!key) {throw new Error('No EARPIECE_GEMINI_API_KEY configured for fallback');}

    const body: Record<string, unknown> = {
      systemInstruction: { parts: [{ text: opts.system }] },
      contents: [{ role: 'user', parts: opts.parts }],
      generationConfig: {
        thinkingConfig: { thinkingLevel: 'MINIMAL' },
        ...(opts.maxTokens ? { maxOutputTokens: opts.maxTokens } : {}),
      },
      ...(opts.webSearch ? { tools: [{ google_search: {} }] } : {}),
    };

    const call = async (payload: Record<string, unknown>) =>
      fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
        {
          method: 'POST',
          headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );

    let res = await call(body);
    if (!res.ok && opts.webSearch) {
      delete body.tools;
      res = await call(body);
    }
    if (!res.ok)
      {throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);}

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    return data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  }

  async ask(opts: {
    instructions: string;
    input: string;
    webSearch?: boolean;
    maxTokens?: number;
  }): Promise<string> {
    if (!opts.webSearch && process.env.EARPIECE_DEEPSEEK_API_KEY) {
      try {
        return await this.deepSeek({
          instructions: opts.instructions,
          input: opts.input,
          maxTokens: opts.maxTokens,
        });
      } catch (err) {
        if (!this.isBillingError(err)) {throw err;}
      }
    }
    try {
      return await this.openRouter({
        model: `${this.orModel}${opts.webSearch ? ':online' : ''}`,
        messages: [
          { role: 'system', content: opts.instructions },
          { role: 'user', content: opts.input },
        ],
        ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
      });
    } catch (err) {
      if (!this.isBillingError(err)) {throw err;}
      return this.gemini({
        system: opts.instructions,
        parts: [{ text: opts.input }],
        maxTokens: opts.maxTokens,
        webSearch: opts.webSearch,
      });
    }
  }

  async askWithAudio(opts: {
    instructions: string;
    input: string;
    audioB64: string;
    format: string;
    maxTokens?: number;
  }): Promise<string> {
    try {
      return await this.openRouter({
        model: OR_AUDIO_MODEL,
        ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
        messages: [
          { role: 'system', content: opts.instructions },
          {
            role: 'user',
            content: [
              { type: 'text', text: opts.input },
              {
                type: 'input_audio',
                input_audio: { data: opts.audioB64, format: opts.format },
              },
            ],
          },
        ],
      });
    } catch (err) {
      if (!this.isBillingError(err)) {throw err;}
      return this.gemini({
        system: opts.instructions,
        parts: [
          { text: opts.input },
          { inline_data: { mime_type: `audio/${opts.format}`, data: opts.audioB64 } },
        ],
        maxTokens: opts.maxTokens,
      });
    }
  }

  audioFormat(mime: string): string {
    return (mime.split('/')[1] ?? 'webm').split(';')[0] || 'webm';
  }
}
