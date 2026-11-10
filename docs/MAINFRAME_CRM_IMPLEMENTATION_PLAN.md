# Mainframe CRM — Figma → Code Implementation Plan (Phase A)

Status: **proposed, awaiting approval.** No app code changed yet.

## 0. Design source of truth — a decision needed

The brief assumes supplied Figma designs. Reality check from the design phase:

- The Figma file (fileKey `xt8O9mFeLl46C5InWwoMrN`, Twenty HQ's own "Twenty" UI kit) is **not accessible via Figma MCP** — the connected account (`kip520982@gmail.com`) has a View seat and no edit access, and that file is owned by Twenty HQ so we can't grant it. Every Figma attempt in the earlier session hit that wall.
- What we **do** have as an approved design: `mockups/ui-kit.html` — the dual-theme (01 Night / 02 Paper) Mainframe kit you reviewed and approved, with the Mainframe logo kit in `mockups/assets/`, plus `mockups/ui-concepts.html` and the captured reference `mockups/figma-refs/figma-twenty-companies.png`.

**Assumption this plan is written against: `mockups/ui-kit.html` is the design source of truth** (Night as dark theme, Paper as light theme). If you have a separate Mainframe Figma file you own, share it with edit access and this plan maps 1:1 onto it — the sequence doesn't change.

## 1. Figma/design screen inventory

From `mockups/ui-kit.html` (12 sections):

| # | Screen | Design elements | Twenty route it maps to |
|---|--------|-----------------|-------------------------|
| 00 | Foundations | brand/surface tokens, stage + priority colors, buttons, pills, avatars, inputs | theme tokens (no route) |
| 01 | Sign in | centered card, mark, email/password | `/welcome` (AppPath.SignInUp) |
| 02 | Opportunities kanban | sidebar, view bar (Filter/Sort/Options/New record), 5 stage columns with color-coded headers, deal cards (name, company, amount, priority left-stripe + pill), per-column quick-add | `/objects/opportunities` (RecordIndexPage board view) |
| 03 | People table | sidebar, view bar, table (name+avatar, company, email, job, status pill) | `/objects/people` (RecordIndexPage table view) |
| 04 | Companies table | sidebar, view bar, table (company, domain, people count, pipe value, stage pill) | `/objects/companies` |
| 05 | Tasks | sidebar, view bar with filter, task rows (checkbox, title, related record, due pill, assignee) | `/objects/tasks` |
| 06 | Record detail | breadcrumb, title + stage/priority pills, fields grid, activity timeline, priority card, owner card | `/object/:objectNameSingular/:id` (RecordShowPage) |
| 07 | Workflows | workflow cards with trigger→step nodes | `/workflows` |
| 08 | Agents | agent cards with status pills | `/agents` |
| 09 | AI Chat | thread list + message bubbles + composer | `/chat/:threadId?` |
| 10 | Settings | left settings nav + form rows, logo replace, theme default | `/settings/*` |
| 11 | Command menu | ⌘K palette, search rows with kbd hints | CommandMenu (global overlay) |

## 2. Existing Twenty that gets reused as-is (verified in repo)

- **All routing** — `AppPath` enum covers every screen above; no new routes needed for phase 1.
- **All data layer** — object metadata engine, GraphQL, record boards/tables, filters/sorts/views, search, command menu, record show pages, workflows, agents, AI chat, settings. The mockup invented nothing Twenty lacks; every element maps to an existing feature.
- **Theme architecture** — `packages/twenty-ui/design-tokens/` → `npx nx generateTokens twenty-ui` → `ThemeLight.ts` / `ThemeDark.ts` + `theme-light.css` / `theme-dark.css`. Light/dark switching already exists and persists per user.
- **Board** — `RecordBoard*` components already do grouped columns, per-column quick-add (`RecordBoardColumnNewRecordButton`), column menus, drag-and-drop.
- **Sidebar** — `MainNavigationDrawer*` already renders workspace switcher, ⌘K search row, Favorites, Workspace objects in the exact order the kit shows (People → Companies → Opportunities → Tasks → Notes → Dashboards).
- **Auth** — full sign-in/workspace-activation flow at `/welcome`.

## 3. Components requiring customization (restyle, not rebuild)

These exist in Twenty but need Mainframe design tokens/styling applied:

1. **Theme tokens** — the core of the whole job. Map kit palettes to Twenty's token files:
   - Night → `design-tokens/color` + `grayScale.ts` (dark scheme): bg #050505, elev #0a0a0a, row #121212, line #1c1c1c, accent #9ae6ff
   - Paper → light scheme: bg #F7F6F2, row #FBFBF9, line #E6E4DE, accent #0E7490
   - Stage/priority semantic colors (new/screen/meeting/proposal/won, urgent/high/med/low) — Twenty already colors board group headers from the field's option colors; we set the palette to match the kit.
   - Typography: Twenty uses Inter already; kit adds IBM Plex Mono for amounts/wordmark — add mono to `design-tokens/font.ts` for numeric/wordmark use.
2. **Board group (stage) headers** — kit uses strong per-stage text colors; verify Twenty's option-color theming reaches the header; small style tweak if not.
3. **Board cards** — kit adds a priority left-stripe (3px) + priority pill. Twenty's card shows configured fields. Implementation: configure the opportunity board card to show company, amount, and a Priority field; the left-stripe is the one genuinely custom CSS touch (small override scoped to board cards, driven by the priority option color).
4. **Sign-in page** — Mainframe mark on the auth card (workspace logo, see §4).
5. **Command menu, tables, pills/tags, avatars, modals, inputs** — token-level changes only; Twenty components already match the kit's geometry (8px radius, etc.).

## 4. New components required

Deliberately few:

1. **Priority left-stripe on board cards** (if option-color border isn't achievable via config) — one scoped style, no logic.
2. **Mainframe logo assets** — Twenty already supports a workspace logo (Settings → General shows it, and it appears on auth + sidebar). First choice: upload via existing workspace settings, **no code**. If the sidebar switcher needs the mark regardless of workspace logo, that's a tiny asset swap component.
3. **"Priority" field on Opportunity** — the kit's urgency model. Twenty supports custom fields on standard objects via Settings → Data model / metadata API. Add a `Priority` select (Urgent/High/Med/Low) with option colors. Config, not code.
4. Nothing else. No custom pages, no custom nav, no custom dashboards in phase 1.

## 5. Backend/API connections required

None new for the design itself — all screens bind to existing Twenty GraphQL. Specifically:

- Board/table/views/search/filters/command menu → existing record query APIs ✔
- Record detail fields + timeline → existing record show + activity APIs ✔
- Priority field → object metadata (custom field), served by the same record APIs ✔
- Workspace logo → existing workspace settings mutation ✔

Missing/flagged for later (documented, not phase-1 blockers):
- Dashboard metrics with real aggregates (Twenty dashboards exist; kit doesn't spec one — defer)
- Gmail/calendar sync (env placeholders staged; needs your Google Cloud OAuth client)
- Website enquiry intake (documented server-side API-key approach; not built, per foundation brief)

## 6. Missing data models or functionality

- `Priority` select on Opportunity (custom field via metadata — no migration hand-writing needed; use Twenty's data-model settings).
- Stage option colors for the Opportunity pipeline (New/Screening/Meeting/Proposal/Customer) — set via field metadata.
- Everything else in the kit already exists in the seeded data model.

## 7. Recommended implementation sequence

1. **Theme tokens (the big win)** — edit `packages/twenty-ui/design-tokens/` (color, grayScale, font), regenerate with `npx nx generateTokens twenty-ui`, rebuild twenty-ui, verify both schemes across the app. Night = dark scheme, Paper = light scheme; Twenty's existing theme toggle becomes the 01/02 switch.
2. **Data model config (no code)** — in the running app: add Priority field to Opportunity with the 4 colored options; set stage option colors; upload Mainframe workspace logo; verify auth page + sidebar pick it up.
3. **Board card polish** — configure card fields (company, amount, priority); add the scoped priority left-stripe if config can't produce it.
4. **Auth page brand check** — confirm mark/wordmark on `/welcome`.
5. **Visual pass against `mockups/ui-kit.html`** — screen by screen (opps, people, companies, tasks, record, workflows, agents, chat, settings, ⌘K), both themes.
6. **Regression check** — create/edit a person, company, opportunity, task; search; filter; move a deal between columns; command menu.

Rules held throughout: no core rewrites, no new routes, no new deps, all styling via the token pipeline wherever possible, every screen on live data (seeded Apple workspace works fine for verification).

## 8. Technical risks

- **Token regeneration scope** — `design-tokens` regenerate both Twenty themes globally; we're overriding the app's look, which is the point, but it means upstream Twenty updates to tokens may conflict on merge. Mitigation: keep token edits minimal and confined to color/grayScale/font files; document every changed value.
- **Custom field limits** — Priority as metadata field is well-supported, but board-card stripe may still need the small scoped CSS override. Low risk, isolated.
- **Upstream drift** — repo is a shallow clone of upstream `main` (`972bb045`). Before heavy frontend work, decide: pin this commit, or cut a `mainframe` branch now so upstream pulls stay clean. Recommend cutting `mainframe/main` branch first.
- **Figma divergence** — if a separate owner-designed Figma arrives later, token values change but architecture doesn't; phase 1 becomes re-skin, not rework.
- **Linaria zero-runtime** — styling is compile-time; the scoped card stripe must follow Linaria conventions (styled wrapper), not runtime CSS injection.

## Approval gate

Per the brief: no major architectural changes until you approve this plan. On approval I'd start with step 1 (cut branch, theme tokens) and step 2 (in-app config you can watch live at localhost:3001).
