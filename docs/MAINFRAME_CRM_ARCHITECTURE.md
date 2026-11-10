# Mainframe CRM — Architecture

Mainframe CRM is a commercial CRM platform based on [Twenty](https://github.com/twentyhq/twenty). Mainframe Digital is the first customer and prototyping environment — not a hardcoded single-tenant product.

This document captures the verified Twenty architecture and recommended direction for multi-business / industry expansion. UI branding and custom layouts wait on Figma handoff.

## Stack (upstream Twenty)

| Layer | Technology |
|-------|------------|
| Monorepo | Nx + Yarn 4 |
| Frontend | React, Vite, Jotai, Linaria, Lingui (`twenty-front`, port 3001) |
| Backend | NestJS, TypeORM, GraphQL + REST (`twenty-server`, port 3000) |
| Worker | BullMQ queue worker (`nx worker twenty-server`) |
| Database | PostgreSQL 16 |
| Cache / queues | Redis |
| Apps / extensions | `twenty-sdk`, `twenty-cli`, `twenty-apps` |
| Self-host packaging | `twenty-docker` |

Local foundation path: `/Users/ben/mainframe-crm` (shallow clone of upstream `main`).

## Package map

- `twenty-front` — CRM UI
- `twenty-server` — API, auth, metadata engine, messaging/calendar jobs
- `twenty-shared` / `twenty-ui` — shared types and UI primitives
- `twenty-sdk` / `twenty-cli` — define objects, logic, and apps as code (`npm i -g twenty` installs the CLI only, not the full CRM)
- `twenty-zapier` — Zapier integration package
- `twenty-utils` — `setup-dev-env.sh` and helper scripts

## Multi-tenancy & multi-business model

### What Twenty provides today

1. **Workspaces** — logical CRM tenants.
2. **Schema-per-workspace** — CRM records live in PostgreSQL schemas named `workspace_<id>`; shared instance data (users, workspace registry, object/field metadata) lives in `core` / metadata schemas.
3. **Permissions** — roles and record-level policies inside a workspace.
4. **Modes**
   - Single-workspace (default self-host): one workspace per instance.
   - Multi-workspace: `IS_MULTIWORKSPACE_ENABLED=true` + subdomain DNS (`*.your-domain.com`).

### What this is not

Workspace isolation is **application/schema isolation**, not full SaaS hard isolation:

- Shared DB cluster / role credentials
- Shared Redis and app process
- Shared encryption keys and env secrets

Adequate for early commercial multi-business on one controlled platform. For regulated customers later, escalate to **dedicated database or dedicated instance** per business.

### Recommended Mainframe staging

| Phase | Approach |
|-------|----------|
| Now | Single workspace for Mainframe Digital on this local/self-host instance |
| Multi-business MVP | Enable multi-workspace; one workspace per business; subdomain or custom domain |
| Industry packs | Custom objects + views + workflows via Apps SDK / metadata — not forked frontends |
| Hard isolation (later) | Per-customer DB or deployment when contracts require it |

Do not hardcode Mainframe Digital as the only customer in application code.

## Core CRM vs industry modules

### Shared core (use Twenty standards)

Contacts (People), Companies, Opportunities/pipeline, Tasks, Notes, Activities, Messaging, Calendar, Files, Roles/permissions, Reporting/dashboards, Workflows.

### Industry modules (future — isolated where practical)

| Industry | Example modules |
|----------|-----------------|
| Real Estate Sales | Listings, buyer/seller links, viewings, follow-ups |
| Property Management | Portfolios, owners/tenants, maintenance, inspections, leases |
| Trades & Field Services | Jobs, site visits, quotes |
| Professional Services | Engagements, retainers |
| General Business | Thin profile on core only |

Implementation preference: **metadata + Twenty Apps** (objects/fields/logic as packages) over deep forks of `twenty-server` / `twenty-front`, to preserve upstream upgradeability.

## Gmail integration

Self-hosted Twenty supports Gmail/Google Calendar when configured:

- Google Cloud OAuth (Gmail, Calendar, People APIs)
- Env / admin config: `MESSAGING_PROVIDER_GMAIL_ENABLED`, `CALENDAR_PROVIDER_GOOGLE_ENABLED`, `AUTH_GOOGLE_*`
- Worker + messaging/calendar cron jobs for sync
- Each user/workspace connects their own mailbox (fits multi-business independently)

Local redirect URIs use `http://localhost:3000/...`. Production needs HTTPS + public `SERVER_URL`.

No custom Gmail stack unless upstream gaps appear after configuration.

## Website → CRM enquiries

Preferred path:

1. Create API key in workspace (Settings → Developers) with least-privilege role.
2. Website server (or edge function) POSTs to REST/GraphQL to create Person/Company and a Note or custom Enquiry object (source, message, timestamp).
3. Never expose the API key in browser-side code.

Alternatives: Zapier (`twenty-zapier`), workflows triggered by webhook once designed.

Do not ship a public privileged production endpoint in this foundation phase.

## Auth & security notes

- Password and/or Google/Microsoft SSO via env flags
- Workspace roles and record access policies
- API keys for machine integrations
- `APP_SECRET` / encryption material must stay in local `.env` (gitignored)
- SSRF protections exist for outbound workflow/webhook calls

## Frontend / Figma handoff

Until Figma designs arrive:

- Keep stock Twenty UI
- No branding, nav, or speculative dashboard work

When designs land: map components onto `twenty-front` / `twenty-ui`, prefer theme and layout customization over wholesale rewrites.

## Local runtime topology

```
Browser → twenty-front (:3001)
              ↓
         twenty-server (:3000) → PostgreSQL (:5432)
              ↓                      ↑
         queue-worker  → Redis (:6379)
```

## Upgrade posture

- Track upstream Twenty regularly; minimize core patches
- Prefer Apps SDK / metadata for Mainframe features
- Document any unavoidable core diffs in ADRs under `docs/`
- Local-only change for foundation: `.yarnrc.yml` `enableScripts: true` so native modules build (upstream defaults to `false`)

## Related

- [MAINFRAME_CRM_LOCAL_SETUP.md](./MAINFRAME_CRM_LOCAL_SETUP.md) — install, start/stop, env, backups
- Upstream: https://docs.twenty.com/
