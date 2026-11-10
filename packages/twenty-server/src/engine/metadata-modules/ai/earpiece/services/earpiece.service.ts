import { Injectable, NotFoundException } from '@nestjs/common';

import { EarpieceAiService } from 'src/engine/metadata-modules/ai/earpiece/services/earpiece-ai.service';
import {
  EARPIECE_CALL_MODES,
  EarpieceBrief,
  EarpieceCallMode,
  EarpieceCallRow,
  EarpieceCard,
  EarpieceCardKind,
  EarpieceFact,
  EarpieceLine,
  EarpieceProfile,
  EarpieceStorageService,
  EarpieceWrapup,
} from 'src/engine/metadata-modules/ai/earpiece/services/earpiece-storage.service';
import {
  COACH_INSTRUCTIONS,
  INTERVIEW_COACH_INSTRUCTIONS,
  INTERVIEW_RESEARCH_INSTRUCTIONS,
  INTERVIEW_WRAPUP_INSTRUCTIONS,
  RECRUIT_CANDIDATE_BRIEF_INSTRUCTIONS,
  RECRUIT_CANDIDATE_COACH_INSTRUCTIONS,
  RECRUIT_CANDIDATE_WRAPUP_INSTRUCTIONS,
  RECRUIT_CLIENT_COACH_INSTRUCTIONS,
  RECRUIT_CLIENT_RESEARCH_INSTRUCTIONS,
  RECRUIT_CLIENT_WRAPUP_INSTRUCTIONS,
  RESEARCH_INSTRUCTIONS,
  WRAPUP_INSTRUCTIONS,
} from 'src/engine/metadata-modules/ai/earpiece/prompts';

const RESEARCH_BY_MODE: Record<EarpieceCallMode, string> = {
  sales: RESEARCH_INSTRUCTIONS,
  interview: INTERVIEW_RESEARCH_INSTRUCTIONS,
  recruit_candidate: RECRUIT_CANDIDATE_BRIEF_INSTRUCTIONS,
  recruit_client: RECRUIT_CLIENT_RESEARCH_INSTRUCTIONS,
};

const WRAPUP_BY_MODE: Record<EarpieceCallMode, string> = {
  sales: WRAPUP_INSTRUCTIONS,
  interview: INTERVIEW_WRAPUP_INSTRUCTIONS,
  recruit_candidate: RECRUIT_CANDIDATE_WRAPUP_INSTRUCTIONS,
  recruit_client: RECRUIT_CLIENT_WRAPUP_INSTRUCTIONS,
};

const PROFILE_HEADING: Record<EarpieceCallMode, string> = {
  sales: 'WHAT THE SELLER SELLS',
  interview: 'ABOUT THE CANDIDATE',
  recruit_candidate: 'ABOUT THE RECRUITER',
  recruit_client: 'ABOUT THE RECRUITER',
};

const COACH_INSTRUCTIONS_BY_MODE: Record<EarpieceCallMode, string> = {
  sales: COACH_INSTRUCTIONS,
  interview: INTERVIEW_COACH_INSTRUCTIONS,
  recruit_candidate: RECRUIT_CANDIDATE_COACH_INSTRUCTIONS,
  recruit_client: RECRUIT_CLIENT_COACH_INSTRUCTIONS,
};

const CARD_KINDS: EarpieceCardKind[] = [
  'signal',
  'objection',
  'say_this',
  'fact',
  'warning',
];

const HALLUCINATIONS = [
  'thank you',
  'thanks for watching',
  'thank you for watching',
  'you',
  'bye',
  'okay',
  '.',
  'so',
  'please subscribe',
  'subtitles by',
  'amara.org',
];

function isJunkTranscript(text: string): boolean {
  const t = text
    .toLowerCase()
    .replace(/[.!?,]/g, '')
    .trim();
  if (t.length < 2) {return true;}
  return HALLUCINATIONS.includes(t);
}

const AUDIO_ADDENDUM = `

AUDIO SLICE: attached is the newest few seconds of the call. FIRST transcribe it verbatim into a top-level JSON field "transcript" — only the spoken words, no labels. If there is no clear speech in it, use "" and return no cards. THEN do your coaching job, treating that transcript as the newest turn of the conversation (it is not yet in the transcript below).

Whatever the instructions above say about output, return ONLY this JSON shape:
{ "transcript": "...", "cards": [ ... ], "key_points": [ ... ], "play": null }`;

@Injectable()
export class EarpieceService {
  constructor(
    private readonly storage: EarpieceStorageService,
    private readonly ai: EarpieceAiService,
  ) {}

  private uid() {
    return this.storage.userId;
  }

  /* ------------------------------------------------------------ calls CRUD */

  async listCalls() {
    const calls = await this.storage.listCalls(this.uid());
    return { calls };
  }

  async createCall(body: Record<string, unknown>) {
    const mode = EARPIECE_CALL_MODES.includes(body.mode as EarpieceCallMode)
      ? (body.mode as EarpieceCallMode)
      : 'sales';
    const call = await this.storage.insertCall({
      user_id: this.uid(),
      prospect_name: body.prospect_name || null,
      company: body.company || null,
      website: body.website || null,
      linkedin: body.linkedin || null,
      notes: body.notes || null,
      cv: body.cv || null,
      role_spec: body.role_spec || null,
      mode,
      brief_status: 'pending',
    });
    return { call };
  }

  async getCall(id: string) {
    const call = await this.storage.findCall(id, this.uid());
    if (!call) {throw new NotFoundException('call not found');}
    const { lines, cards, facts } = await this.storage.callChildren(id);
    return { call, lines, cards, facts };
  }

  async patchCall(id: string, body: Record<string, unknown>) {
    const allowed = [
      'prospect_name',
      'company',
      'website',
      'linkedin',
      'notes',
      'cv',
      'role_spec',
      'playbook',
      'status',
      'started_at',
      'ended_at',
    ];
    const patch: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) {
        patch[key] = body[key];
      }
    }

    const call = await this.storage.updateCall(id, this.uid(), patch);
    if (!call) {throw new NotFoundException('call not found');}
    return { call };
  }

  async deleteCall(id: string) {
    await this.storage.deleteCall(id, this.uid());
    return { ok: true };
  }

  async rerunCall(id: string) {
    const src = await this.storage.findCall(id, this.uid());
    if (!src) {throw new NotFoundException('call not found');}

    const call = await this.storage.insertCall({
      user_id: this.uid(),
      prospect_name: src.prospect_name,
      company: src.company,
      website: src.website,
      linkedin: src.linkedin,
      notes: src.notes,
      cv: src.cv,
      role_spec: src.role_spec,
      mode: src.mode ?? 'sales',
      playbook: src.playbook ?? null,
      brief: src.brief,
      brief_status: src.brief ? 'ready' : 'pending',
      status: 'draft',
    });
    return { call };
  }

  /* -------------------------------------------------------------- research */

  async research(id: string) {
    const call = await this.storage.findCall(id, this.uid());
    if (!call) {throw new NotFoundException('call not found');}

    await this.storage.updateCallFields(id, {
      brief_status: 'running',
      brief_error: null,
    });

    try {
      const profile = await this.storage.getProfile(this.uid());
      const mode: EarpieceCallMode = call.mode ?? 'sales';
      const target = [
        call.prospect_name && `Person: ${call.prospect_name}`,
        call.company && `Company: ${call.company}`,
        call.website && `Website: ${call.website}`,
        call.linkedin && `LinkedIn: ${call.linkedin}`,
        call.notes && `Notes from the caller: ${call.notes}`,
      ]
        .filter((bit): bit is string => Boolean(bit))
        .join('\n');

      let input: string;
      if (mode === 'interview') {
        input = `Research this company and role, and write the pre-interview brief.\n\n=== THE COMPANY / ROLE / INTERVIEWER ===\n${target}\n\n=== ABOUT THE CANDIDATE ===\n${this.storage.profileContext(profile)}`;
      } else if (mode === 'recruit_candidate') {
        input = `Write the pre-call brief for this candidate screen.\n\n=== THE ROLE THEY'RE BEING CONSIDERED FOR ===\n${call.role_spec || "(no role details given — focus on understanding the candidate)"}\n\n=== THE CANDIDATE ===\n${target || '(no details beyond the CV)'}\n\n=== THEIR CV, AS PROVIDED ===\n${call.cv || '(no CV pasted — say so in the headline and lean on questions to ask)'}\n\n=== ABOUT THE RECRUITER (stored as a seller profile — read "what they sell" as what their agency does) ===\n${this.storage.profileContext(profile)}`;
      } else if (mode === 'recruit_client') {
        input = `Research this company for a recruiter and write the pre-call brief.\n\n=== THE COMPANY / CONTACT ===\n${target}\n${call.role_spec ? `\n=== WHAT'S KNOWN ABOUT THE ROLE THEY'RE HIRING FOR ===\n${call.role_spec}\n` : ''}=== ABOUT THE RECRUITER (stored as a seller profile — read "what they sell" as what their agency does) ===\n${this.storage.profileContext(profile)}`;
      } else {
        input = `Research this prospect and write the pre-call brief.\n\n=== THE PROSPECT ===\n${target}\n\n=== WHAT THE SELLER SELLS ===\n${this.storage.profileContext(profile)}`;
      }

      const raw = await this.ai.ask({
        instructions: RESEARCH_BY_MODE[mode],
        webSearch: mode !== 'recruit_candidate',
        input,
      });

      const brief = this.ai.parseJson<EarpieceBrief>(raw);
      await this.storage.updateCallFields(id, {
        brief,
        brief_status: 'ready',
        brief_error: null,
      });
      return { ok: true, brief };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.storage.updateCallFields(id, {
        brief_status: 'failed',
        brief_error: message,
      });
      return { error: message };
    }
  }

  /* -------------------------------------------- listen (transcribe + coach) */

  async listen(opts: {
    audio: Buffer;
    mime: string;
    callId: string;
    speaker: 'you' | 'them';
    at: number;
    mixed: boolean;
  }) {
    const { audio, mime, callId, speaker, at, mixed } = opts;
    if (audio.length < 2000) {return { text: '', skipped: 'too small' };}

    const call = await this.storage.findCall(callId, this.uid());
    if (!call) {throw new NotFoundException('call not found');}
    if (call.status === 'done') {return { text: '', skipped: 'call is finished' };}

    const mode: EarpieceCallMode = call.mode ?? 'sales';
    const { lines: all, cards: existing, facts: existingFacts } =
      await this.storage.callChildren(callId);
    const recent = all.slice(-20);
    const convo = recent.length
      ? this.storage.formatTranscript(recent)
      : '(the call has just started)';

    const shownList = existing.length
      ? existing.map((c) => `- [${c.kind}] ${c.title}: ${c.body}`).join('\n')
      : '(nothing shown yet)';

    const factList = existingFacts.length
      ? existingFacts.map((f) => `- ${f.text}`).join('\n')
      : '(none yet)';

    const profile = await this.storage.getProfile(this.uid());

    const briefText = call.brief
      ? JSON.stringify(call.brief)
      : '(no brief was prepared)';
    const playbook = Array.isArray(call.playbook)
      ? (call.playbook as { q: string; a: string }[])
      : [];
    const playbookText = playbook.length
      ? `\n\n=== PREPARED PLAYBOOK (the speaker has full scripted answers ready for these) ===\n${playbook
          .map((pl, i) => `${i}. ${pl.q}`)
          .join('\n')}\nIf the newest audio is asking one of these prepared questions, or clearly steering toward it, set the top-level JSON field "play" to that question's number. The number must track the CURRENT topic. No match: "play": null. NEVER mention the playbook inside cards.`
      : '';
    const roleText =
      (mode === 'recruit_candidate' || mode === 'recruit_client') && call.role_spec
        ? `\n\n=== THE ROLE ===\n${call.role_spec}`
        : '';

    const sliceWho = mixed
      ? 'one microphone next to the call — the words could be from either side; infer who is speaking'
      : speaker === 'you'
        ? 'spoken by the SELLER (the person you are coaching)'
        : 'spoken by the OTHER side of the call';

    const b64 = audio.toString('base64');
    const raw = await this.ai.askWithAudio({
      instructions: COACH_INSTRUCTIONS_BY_MODE[mode] + AUDIO_ADDENDUM,
      input: `${playbookText}\n\n=== WHAT THE SELLER SELLS ===\n${this.storage.profileContext(profile)}${roleText}\n\n=== PRE-CALL BRIEF ===\n${briefText}\n\n=== CARDS ALREADY SHOWN (do not repeat) ===\n${shownList}\n\n=== KEY POINTS ALREADY CAPTURED (do not repeat) ===\n${factList}\n\n=== THE CALL SO FAR ===\n${convo}\n\nThe attached audio slice is ${sliceWho}. Transcribe it, then coach.`,
      audioB64: b64,
      format: this.ai.audioFormat(mime),
      maxTokens: 350,
    });
    const parsed = this.ai.parseJson<{
      transcript?: string;
      cards?: Partial<EarpieceCard>[];
      key_points?: string[];
      play?: number | null;
    }>(raw);

    const text = (parsed.transcript ?? '').trim();
    if (!text || isJunkTranscript(text)) {
      return { text: '', skipped: 'junk', cards: [], facts: [] };
    }

    const insertedLine = await this.storage.insertLine({
      call_id: callId,
      at,
      speaker,
      text,
    });

    const freshCards = (parsed.cards ?? [])
      .filter((c) => c.title && c.body)
      .slice(0, 2)
      .map((c) => ({
        call_id: callId,
        at,
        kind: CARD_KINDS.includes(c.kind as EarpieceCardKind)
          ? (c.kind as EarpieceCardKind)
          : ('fact' as EarpieceCardKind),
        title: String(c.title).slice(0, 80),
        body: String(c.body).slice(0, 260),
        urgency: Math.min(3, Math.max(1, Number(c.urgency) || 2)) as 1 | 2 | 3,
      }))
      .filter(
        (c) =>
          !existing.some(
            (s) => s.title.toLowerCase().trim() === c.title.toLowerCase().trim(),
          ),
      );

    const seen = new Set(existingFacts.map((f) => f.text.toLowerCase().trim()));
    const freshFacts = (parsed.key_points ?? [])
      .map((t) => String(t).slice(0, 120).trim())
      .filter((t) => t.length > 2 && !seen.has(t.toLowerCase()))
      .slice(0, 3)
      .map((factText) => ({ call_id: callId, at, text: factText }));

    const newCards = await this.storage.insertCards(freshCards);
    const newFacts = await this.storage.insertFacts(freshFacts);

    const playNum = Number(parsed.play);
    const play =
      Number.isInteger(playNum) && playNum >= 0 && playNum < playbook.length
        ? playNum
        : null;

    return { text, line: insertedLine, cards: newCards, facts: newFacts, play };
  }

  /* ----------------------------------------------------------------- wrapup */

  async wrapup(callId: string) {
    const call = await this.storage.findCall(callId, this.uid());
    if (!call) {throw new NotFoundException('call not found');}

    const { lines: all } = await this.storage.callChildren(callId);
    if (all.length < 3) {
      return { error: 'Not enough of the call was captured to summarise.' };
    }

    const profile = await this.storage.getProfile(this.uid());
    const mode: EarpieceCallMode = call.mode ?? 'sales';
    const convo = this.storage.formatTranscript(all);

    const context = [
      `=== ${PROFILE_HEADING[mode]} ===\n${this.storage.profileContext(profile)}`,
      `=== WHO THEY WERE TALKING TO ===\n${call.prospect_name ?? 'unknown'}${call.company ? ` at ${call.company}` : ''}`,
      mode === 'recruit_candidate' &&
        call.role_spec &&
        `=== THE ROLE BEING FILLED ===\n${call.role_spec}`,
      mode === 'recruit_candidate' &&
        call.cv &&
        `=== THE CANDIDATE'S CV ===\n${call.cv}`,
      mode === 'recruit_client' &&
        call.role_spec &&
        `=== WHAT WAS KNOWN ABOUT THE ROLE BEFORE THE CALL ===\n${call.role_spec}`,
      `=== FULL TRANSCRIPT ===\n${convo}`,
    ]
      .filter((bit): bit is string => Boolean(bit))
      .join('\n\n');

    const raw = await this.ai.ask({
      instructions: WRAPUP_BY_MODE[mode],
      input: context,
    });

    const wrapup = this.ai.parseJson<EarpieceWrapup>(raw);
    await this.storage.updateCallFields(callId, {
      wrapup,
      status: 'done',
      ended_at: new Date().toISOString(),
    });
    return { wrapup };
  }

  /* ---------------------------------------------------------------- profile */

  getProfile(): Promise<EarpieceProfile> {
    return this.storage.getProfile(this.uid());
  }

  async saveProfile(body: Record<string, unknown>) {
    const patch = {
      user_id: this.uid(),
      seller_name: body.seller_name ?? null,
      company: body.company ?? null,
      offering: body.offering ?? null,
      icp: body.icp ?? null,
      pricing: body.pricing ?? null,
      differentiators: body.differentiators ?? null,
      common_objections: body.common_objections ?? null,
    };
    const profile = await this.storage.saveProfile(patch);
    return { profile };
  }
}
