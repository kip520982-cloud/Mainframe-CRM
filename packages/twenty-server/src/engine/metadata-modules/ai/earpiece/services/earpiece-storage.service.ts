import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { Pool, type QueryResultRow } from 'pg';

export type EarpieceCardKind =
  | 'signal'
  | 'objection'
  | 'say_this'
  | 'fact'
  | 'warning';

export type EarpieceCard = {
  id: number;
  call_id: string;
  at: number;
  kind: EarpieceCardKind;
  title: string;
  body: string;
  urgency: 1 | 2 | 3;
};

export type EarpiecePlay = { q: string; a: string };

export type EarpieceFact = {
  id: number;
  call_id: string;
  at: number;
  text: string;
};

export type EarpieceLine = {
  id: number;
  call_id: string;
  at: number;
  speaker: 'you' | 'them';
  text: string;
};

export type EarpieceBrief = {
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

export type EarpieceCallMode =
  | 'sales'
  | 'interview'
  | 'recruit_candidate'
  | 'recruit_client';

export const EARPIECE_CALL_MODES: EarpieceCallMode[] = [
  'sales',
  'interview',
  'recruit_candidate',
  'recruit_client',
];

export type EarpieceCallRow = {
  id: string;
  created_at: string;
  user_id: number;
  mode: EarpieceCallMode;
  prospect_name: string | null;
  company: string | null;
  website: string | null;
  linkedin: string | null;
  notes: string | null;
  cv: string | null;
  role_spec: string | null;
  brief: EarpieceBrief | null;
  playbook: EarpiecePlay[] | null;
  brief_status: 'pending' | 'running' | 'ready' | 'failed';
  brief_error: string | null;
  status: 'draft' | 'live' | 'done';
  wrapup: EarpieceWrapup | null;
  started_at: string | null;
  ended_at: string | null;
};

export type EarpieceWrapup = {
  summary?: string;
  temperature?: string;
  objections_raised?: string[];
  commitments?: string[];
  next_steps?: string[];
  follow_up_email?: { subject: string; body: string };
  coaching?: string[];
  pitch?: { title?: string; body?: string };
};

export type EarpieceProfile = {
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

// Fallback seller profile so briefs and live coaching are always written
// against Mainframe Digital, even with nothing saved.
export const EARPIECE_DEFAULT_PROFILE = {
  seller_name: 'Kieran Stapleton',
  company: 'Mainframe Digital',
  offering:
    "Mainframe Digital builds practical AI, automation and custom software for small and growing NZ businesses. Five things we sell: (1) iOS and Android apps, native or cross-platform, seen through to App Store and Google Play release; (2) custom business applications — CRMs, CMSs, client portals, booking and quoting tools, built around how the business actually works, with AI built in where it earns its place; (3) smart websites built for conversion, with lead magnets, funnels and measurement; (4) workflow automation — connecting the tools they already use (Xero, Google Workspace, Microsoft 365, HubSpot, Salesforce, DocuSign, Dropbox, Twilio) so follow-ups, invoicing, paperwork and handovers run themselves; (5) AI setup and team training — connecting assistants like Claude or ChatGPT to their tools, training the team, and delivering a practical AI growth roadmap. Every engagement starts with a free 30-minute consultation, then a free demo of the two or three things we would build or automate first, delivered within two business days. Scope is agreed up front before any build starts, and we stay on afterwards to train the team, look after what we built and keep improving it.",
  icp: 'Small and growing New Zealand businesses — typically owner-led, from solo operators up to around 50 staff — in trades and home services, professional services, property management, healthcare and clinics, hospitality and retail, plus startups who want AI built in from day one. The buyer is usually the owner or GM. They are commercially minded but not technical: they are losing leads to slow follow-up, drowning in manual admin and copy-paste between tools, and curious about AI but wary of hype and jargon. They want revenue growth and time back without ripping out the tools they already use.',
  pricing:
    'Everything is scoped per engagement and agreed up front before any build starts — no surprise invoices. The front door is free: a 30-minute consultation and a free demo of the first two or three things we would build, theirs to keep with no obligation. We do not publish fixed package pricing; the price is quoted against the agreed scope. For cost-conscious prospects, the answer is to start small with one high-impact build or automation rather than discounting.',
  differentiators:
    'Commercial thinking and real engineering in one team: our background is sales and marketing, so we start from the commercial outcome and build the technology to get there — most providers offer either the strategy or the build, we do both, so the AI is tied to real outcomes, not just a demo. Auckland-based, founder-led (Kieran Stapleton) and end to end: business problem, architecture, deployment, automation and live operations. Plain English, clear scope agreed up front, working results shown as we go. We connect the tools a business already uses instead of forcing replacements. Proven builds: a custom CRM for a Barfoot & Thompson agent, Industry DJ School (CRM replacing HubSpot plus seven SaaS seats, custom LMS with Stripe, bookings-first website), the DJ Hub iOS app, and Earpiece, our own sales co-pilot.',
  common_objections:
    '"Do we have to replace the tools we already use?" (Usually not — we connect Xero, Google Workspace, Microsoft 365, DocuSign and the rest so work passes along by itself.) "We are not sure where AI fits yet." (Start with the free AI Opportunity Scorecard, or the free consultation and demo.) "Will AI actually pay off, or is it hype?" (We scope to revenue outcomes first and show a free demo of real workflows before anything is signed.) "Who will we actually work with — will this be handed to juniors?" (Kieran leads every project end to end.) "What happens after launch — are we on our own?" (We train your team, look after what we built and keep improving it.) "Sounds expensive." (Start with one small, high-impact build; scope and price are agreed up front, no surprises.)',
} as const;

// Self-contained schema so Earpiece data lives in the CRM's own Postgres
// instead of a hosted Supabase project; the module manages its own DDL.
const SCHEMA_DDL = `
CREATE SCHEMA IF NOT EXISTS earpiece;
CREATE TABLE IF NOT EXISTS earpiece.profile (
  user_id int PRIMARY KEY,
  seller_name text,
  company text,
  offering text,
  icp text,
  pricing text,
  differentiators text,
  common_objections text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS earpiece.call (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id int NOT NULL,
  mode text NOT NULL DEFAULT 'sales',
  prospect_name text,
  company text,
  website text,
  linkedin text,
  notes text,
  cv text,
  role_spec text,
  brief jsonb,
  playbook jsonb,
  brief_status text NOT NULL DEFAULT 'pending',
  brief_error text,
  status text NOT NULL DEFAULT 'draft',
  wrapup jsonb,
  started_at timestamptz,
  ended_at timestamptz
);
CREATE TABLE IF NOT EXISTS earpiece.line (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  call_id uuid NOT NULL REFERENCES earpiece.call(id) ON DELETE CASCADE,
  "at" float NOT NULL DEFAULT 0,
  speaker text NOT NULL DEFAULT 'you',
  text text NOT NULL
);
CREATE TABLE IF NOT EXISTS earpiece.card (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  call_id uuid NOT NULL REFERENCES earpiece.call(id) ON DELETE CASCADE,
  "at" float NOT NULL DEFAULT 0,
  kind text NOT NULL DEFAULT 'fact',
  title text NOT NULL,
  body text NOT NULL,
  urgency int NOT NULL DEFAULT 2
);
CREATE TABLE IF NOT EXISTS earpiece.fact (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  call_id uuid NOT NULL REFERENCES earpiece.call(id) ON DELETE CASCADE,
  "at" float NOT NULL DEFAULT 0,
  text text NOT NULL
);
CREATE INDEX IF NOT EXISTS call_user_idx ON earpiece.call (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS line_call_idx ON earpiece.line (call_id, "at");
CREATE INDEX IF NOT EXISTS card_call_idx ON earpiece.card (call_id);
CREATE INDEX IF NOT EXISTS fact_call_idx ON earpiece.fact (call_id);
`;

@Injectable()
export class EarpieceStorageService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EarpieceStorageService.name);
  private readonly pool = new Pool({
    connectionString: process.env.PG_DATABASE_URL,
  });
  readonly userId = Number(process.env.EARPIECE_USER_ID ?? 1);

  async onModuleInit() {
    if (!process.env.PG_DATABASE_URL) {
      throw new Error('PG_DATABASE_URL is required for Earpiece storage');
    }
    await this.pool.query(SCHEMA_DDL);
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  private async rows<T extends QueryResultRow>(text: string, values: unknown[]) {
    const res = await this.pool.query<T>(text, values);
    return res.rows;
  }

  /* ------------------------------------------------------------ calls CRUD */

  listCalls(userId: number): Promise<EarpieceCallRow[]> {
    return this.rows<EarpieceCallRow>(
      'SELECT * FROM earpiece.call WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100',
      [userId],
    );
  }

  async insertCall(fields: Record<string, unknown>): Promise<EarpieceCallRow> {
    const keys = Object.keys(fields);
    const cols = keys.join(', ');
    const vals = keys.map((_, i) => `$${i + 1}`).join(', ');
    const inserted = await this.rows<EarpieceCallRow>(
      `INSERT INTO earpiece.call (${cols}) VALUES (${vals}) RETURNING *`,
      keys.map((k) => fields[k]),
    );
    return inserted[0];
  }

  async findCall(
    id: string,
    userId: number,
  ): Promise<EarpieceCallRow | null> {
    const found = await this.rows<EarpieceCallRow>(
      'SELECT * FROM earpiece.call WHERE id = $1 AND user_id = $2 LIMIT 1',
      [id, userId],
    );
    return found[0] ?? null;
  }

  async callChildren(id: string) {
    const [lines, cards, facts] = await Promise.all([
      this.rows<EarpieceLine>(
        'SELECT * FROM earpiece.line WHERE call_id = $1 ORDER BY "at" ASC',
        [id],
      ),
      this.rows<EarpieceCard>(
        'SELECT * FROM earpiece.card WHERE call_id = $1 ORDER BY id ASC',
        [id],
      ),
      this.rows<EarpieceFact>(
        'SELECT * FROM earpiece.fact WHERE call_id = $1 ORDER BY id ASC',
        [id],
      ),
    ]);
    return { lines, cards, facts };
  }

  private async update(
    id: string,
    patch: Record<string, unknown>,
    userId?: number,
  ) {
    const keys = Object.keys(patch);
    if (!keys.length) {return null;}
    const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const params = keys.map((k) => patch[k]);
    let guard = '';
    if (userId !== undefined) {
      guard = ` AND user_id = $${params.length + 1}`;
      params.push(userId);
    }
    params.push(id);
    const updated = await this.rows<EarpieceCallRow>(
      `UPDATE earpiece.call SET ${sets} WHERE id = $${params.length}${guard} RETURNING *`,
      params,
    );
    return updated[0] ?? null;
  }

  updateCall(
    id: string,
    userId: number,
    patch: Record<string, unknown>,
  ): Promise<EarpieceCallRow | null> {
    return this.update(id, patch, userId);
  }

  updateCallFields(
    id: string,
    patch: Record<string, unknown>,
  ): Promise<EarpieceCallRow | null> {
    return this.update(id, patch);
  }

  async deleteCall(id: string, userId: number): Promise<void> {
    await this.rows(
      'DELETE FROM earpiece.call WHERE id = $1 AND user_id = $2',
      [id, userId],
    );
  }

  /* ------------------------------------------------------------ call feeds */

  async insertLine(
    line: Omit<EarpieceLine, 'id'>,
  ): Promise<EarpieceLine | null> {
    const inserted = await this.rows<EarpieceLine>(
      'INSERT INTO earpiece.line (call_id, "at", speaker, text) VALUES ($1, $2, $3, $4) RETURNING *',
      [line.call_id, line.at, line.speaker, line.text],
    );
    return inserted[0] ?? null;
  }

  async insertCards(
    cards: Omit<EarpieceCard, 'id'>[],
  ): Promise<EarpieceCard[]> {
    if (!cards.length) {return [];}
    const inserted = await Promise.all(
      cards.map((card) =>
        this.rows<EarpieceCard>(
          'INSERT INTO earpiece.card (call_id, "at", kind, title, body, urgency) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
          [card.call_id, card.at, card.kind, card.title, card.body, card.urgency],
        ),
      ),
    );
    return inserted.map((rows) => rows[0]);
  }

  async insertFacts(
    facts: Omit<EarpieceFact, 'id'>[],
  ): Promise<EarpieceFact[]> {
    if (!facts.length) {return [];}
    const inserted = await Promise.all(
      facts.map((fact) =>
        this.rows<EarpieceFact>(
          'INSERT INTO earpiece.fact (call_id, "at", text) VALUES ($1, $2, $3) RETURNING *',
          [fact.call_id, fact.at, fact.text],
        ),
      ),
    );
    return inserted.map((rows) => rows[0]);
  }

  /* ---------------------------------------------------------------- profile */

  async getProfile(userId: number): Promise<EarpieceProfile> {
    const found = await this.rows<EarpieceProfile>(
      'SELECT * FROM earpiece.profile WHERE user_id = $1 LIMIT 1',
      [userId],
    );
    const profile: EarpieceProfile = {
      id: userId,
      user_id: userId,
      ...EARPIECE_DEFAULT_PROFILE,
    };

    const row = found[0];
    if (row) {
      for (const key of Object.keys(EARPIECE_DEFAULT_PROFILE) as (keyof typeof EARPIECE_DEFAULT_PROFILE)[]) {
        const value = row[key];

        if (typeof value === 'string' && value.trim()) {profile[key] = value;}
      }
    }

    return profile;
  }

  async saveProfile(
    patch: Record<string, unknown>,
  ): Promise<EarpieceProfile> {
    const saved = await this.rows<EarpieceProfile>(
      `INSERT INTO earpiece.profile (user_id, seller_name, company, offering, icp, pricing, differentiators, common_objections, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
       ON CONFLICT (user_id) DO UPDATE SET
         seller_name = EXCLUDED.seller_name,
         company = EXCLUDED.company,
         offering = EXCLUDED.offering,
         icp = EXCLUDED.icp,
         pricing = EXCLUDED.pricing,
         differentiators = EXCLUDED.differentiators,
         common_objections = EXCLUDED.common_objections,
         updated_at = now()
       RETURNING *`,
      [
        patch.user_id,
        patch.seller_name,
        patch.company,
        patch.offering,
        patch.icp,
        patch.pricing,
        patch.differentiators,
        patch.common_objections,
      ],
    );
    return saved[0];
  }

  /* -------------------------------------------------------------- rendering */

  formatTranscript(lines: EarpieceLine[]): string {
    const twoSided = lines.some((line) => line.speaker === 'them');
    if (twoSided) {
      return lines
        .map((line) =>
          line.speaker === 'you'
            ? `SELLER: ${line.text}`
            : `PROSPECT: ${line.text}`,
        )
        .join('\n');
    }
    return (
      '(Recorded through one microphone — likely a phone call on speaker, so both sides are mixed together with no speaker labels. Work out who is talking from what they say.)\n' +
      lines.map((line) => line.text).join('\n')
    );
  }

  profileContext(profile: EarpieceProfile): string {
    const bits = [
      profile.seller_name &&
        `Seller's name (sign emails off as this person): ${profile.seller_name}`,
      profile.company && `Seller's company: ${profile.company}`,
      profile.offering && `What they sell: ${profile.offering}`,
      profile.icp && `Who they sell to: ${profile.icp}`,
      profile.pricing && `Pricing: ${profile.pricing}`,
      profile.differentiators &&
        `What makes them different: ${profile.differentiators}`,
      profile.common_objections &&
        `Objections they usually hear: ${profile.common_objections}`,
    ].filter((bit): bit is string => Boolean(bit));
    return bits.length
      ? bits.join('\n')
      : '(The seller has not filled in what they sell yet — keep advice general.)';
  }
}
