# Enterprise Enhancements Plan

Large scope — proposing a phased build to keep the app stable. Please confirm scope and order before I start.

## Phase A — Public Landing Page & Navigation (item 6)
- New `src/pages/Landing.tsx` (public, marketing-style hero + Login/Signup CTAs).
- Route changes in `App.tsx`:
  - `/` → Landing (public)
  - `/app/*` → existing protected dashboard (Index, expenses, etc.)
  - `/auth` unchanged; logged-in users hitting `/auth` redirect to `/app`
  - Logged-in users hitting `/` still see Landing but with "Go to dashboard" CTA
- Update `AppLayout` Home link to `/app`, public Home to `/`.

## Phase B — DB Schema (items 1, 2, 5)
New migration with tables + RLS + GRANTs:

**Team Collaboration**
- `collab_threads` (org_id, title, created_by, last_message_at)
- `collab_messages` (thread_id, org_id, sender_id, body, mentions uuid[], created_at, client_nonce UNIQUE for dedupe)
- `collab_read_receipts` (thread_id, user_id, last_read_at)
- `collab_presence` (user_id, org_id, status, last_seen) — updated via realtime
- Indexes on `(thread_id, created_at)`, `(org_id, last_message_at)`

**Voice Briefings**
- `voice_briefings` (org_id, created_by, title, script, audio_url, duration_seconds, metadata jsonb, created_at)
- `voice_briefing_assignments` (briefing_id, user_id)
- `voice_briefing_plays` (briefing_id, user_id, played_at, completed bool) — drives listen status & history
- Indexes on `(org_id, created_at desc)`, `(user_id, played_at desc)`

**RBAC**: RLS scoped to `is_org_member` for view; write/manage restricted via `has_any_role` (owner/ceo/cfo/finance_manager/hr_manager + team_manager for collab posts). Briefing creation limited to leaders; viewing limited to assignees OR all org members if no assignment.

## Phase C — Rewire Components (items 1, 2, 4)
- Replace mock state in `TeamCollaboration.tsx` with Supabase queries + `postgres_changes` realtime subscription on `collab_messages`. Typing indicator via Supabase Broadcast channel. Presence via Supabase Presence API. Dedupe via `client_nonce`.
- Replace mock state in `VoiceBriefings.tsx`: list from DB, play tracks insert into `voice_briefing_plays`, show history list with search/filter, chronological order. Keep `speechSynthesis` playback for text scripts.
- Add ALTER PUBLICATION for realtime on `collab_messages`, `collab_presence`.

## Phase D — Frontend RBAC Gating (item 5)
- New `RoleGate` component + `useCanAccess(module)` hook reading `OrganizationContext`.
- Hide sidebar items for Collab/Briefings when role lacks access; protected route wrapper renders an `AccessDenied` component otherwise.
- Allowed roles (proposed): all org members can view collab; leaders+team_manager can create threads. Briefings viewable by all; creation by owner/ceo/cfo/hr_manager.

## Phase E — Responsive Dashboard Refactor (item 3)
- Audit `Index.tsx`, stat cards, charts, collab, briefings for breakpoints.
- Convert hard grids to `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` patterns, ensure no overflow, use `overflow-x-auto` only on tables, add touch targets (min-h-11), fix sidebar offcanvas behavior on mobile.

## Decisions needed
1. **Audio source for briefings** — keep browser TTS only, or also allow file upload to Supabase Storage? (Storage = new bucket + upload UI.)
2. **Threads model** — single org-wide channel for now, or full multi-thread UI with create/rename? (Multi-thread = more UI work.)
3. **Build all phases now, or ship Phase A+B+C first, then D+E?** Recommend split to keep PRs reviewable.
4. **Landing page content** — generic marketing copy + screenshots placeholder, or do you have brand copy/assets to use?

Reply with answers (or "go ahead, all phases, your call on defaults") and I'll execute.
