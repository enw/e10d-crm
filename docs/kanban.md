# e10d-crm — Kanban Board

Implementation tracker for v1. Tickets are **vertical slices** (tracer bullets): each delivers a thin but complete path through schema → API → UI → verification.

Source: [prd.md](./prd.md), [technical-design.md](./technical-design.md)

---

## Workflow

| Column | Meaning |
|---|---|
| **Backlog** | Defined, not ready to start (blockers incomplete) |
| **Ready** | Dependencies met; pick next |
| **In Progress** | Active (WIP limit: **1** ticket at a time) |
| **Review** | Code done; verify acceptance criteria before Done |
| **Done** | Merged / verified on homelab or local Docker |

Move tickets left → right. Only one **In Progress** slice at a time keeps integration risk low on a greenfield repo.

---

## Dependency Graph

Done nodes are green; open nodes are gray.

```mermaid
flowchart LR
  T01:::done --> T02:::done
  T02:::done --> T03:::done
  T02:::done --> T04:::done
  T04:::done --> T05:::done
  T05:::done --> T06:::done
  T06:::done --> T07:::done
  T07:::done --> T08:::done
  T08:::done --> T09:::done
  T09:::done --> T10:::done
  T04:::done --> T11:::done
  T11:::done --> T12:::done
  T08:::done --> T13:::done
  T13:::done --> T14:::done
  T09:::done --> T15:::done
  T04:::done --> T16:::done
  T11:::done --> T16:::done

  classDef done fill:#22c55e,color:#fff,stroke:#16a34a
  classDef open fill:#e5e7eb,color:#111827,stroke:#9ca3af
```

Parallel lanes after T04: **contacts** (T05–T10, T13–T15) and **calendar** (T11–T12). Enrichment (T13–T14) and export (T15) join after dossier exists.

---

## Tickets

### T01 — App shell + password login

| Field | Value |
|---|---|
| **Status** | Ready |
| **Type** | AFK |
| **Blocked by** | — |
| **User stories** | US-1 |

**What to build:** `create-next-app` scaffold, Docker Compose (Postgres + app), Drizzle wired with empty migration runner, `/login` page, bcrypt gate, session cookie, middleware protecting all routes.

**Acceptance criteria:**
- [ ] `docker compose up` starts Postgres + app
- [ ] Unauthenticated request to `/contacts` redirects to `/login`
- [ ] Correct password sets session; wrong password fails
- [ ] Logout clears session
- [ ] `npm run lint` passes

---

### T02 — Connect a Google account

| Field | Value |
|---|---|
| **Status** | Backlog |
| **Type** | HITL (Google Cloud OAuth credentials) |
| **Blocked by** | <span style="color:#16a34a">T01</span> |
| **User stories** | US-2 |

**What to build:** Auth.js Google provider, `google_accounts` table, AES-256-GCM token storage, `/settings` page showing connected accounts, "Connect Google Account" OAuth flow with contacts + calendar readonly scopes.

**Acceptance criteria:**
- [ ] OAuth completes; account email shown in settings
- [ ] Tokens stored encrypted in DB
- [ ] App password session and Google OAuth are independent
- [ ] `.env.example` documents required vars

---

### T03 — Disconnect a Google account

| Field | Value |
|---|---|
| **Status** | Backlog |
| **Type** | AFK |
| **Blocked by** | <span style="color:#16a34a">T02</span> |
| **User stories** | US-3 |

**What to build:** Disconnect action on settings; delete `google_contact_links` + `calendar_events` for account; revoke token (best effort); remove `google_accounts` row.

**Acceptance criteria:**
- [ ] Disconnect removes account from settings UI
- [ ] Synced rows for that account deleted from DB
- [ ] Re-connect works cleanly

---

### T04 — Sync contacts from Google

| Field | Value |
|---|---|
| **Status** | Backlog |
| **Type** | AFK |
| **Blocked by** | <span style="color:#16a34a">T02</span> |
| **User stories** | US-4 (partial), US-5 (partial) |

**What to build:** Contact sync engine (People API), `contacts` + `google_contact_links` tables, pull on connect, minimal `/contacts` list (name + primary email).

**Acceptance criteria:**
- [ ] Connect account triggers initial contact sync
- [ ] Contacts visible on `/contacts`
- [ ] Re-sync updates by `google_resource_id` (no duplicates)
- [ ] Unit tests for sync merge logic with fixture payloads

---

### T05 — Multi-account dedup by email

| Field | Value |
|---|---|
| **Status** | Backlog |
| **Type** | AFK |
| **Blocked by** | <span style="color:#16a34a">T04</span> |
| **User stories** | US-4 |

**What to build:** When second Google account connects, merge contacts sharing normalized primary email into one canonical row; multiple `google_contact_links` per contact.

**Acceptance criteria:**
- [ ] Same email from two accounts → one contact row
- [ ] Different emails for same person → separate contacts (no manual merge v1)
- [ ] Dedup unit tests pass

---

### T06 — Contact search

| Field | Value |
|---|---|
| **Status** | Done |
| **Type** | AFK |
| **Blocked by** | <span style="color:#16a34a">T05</span> |
| **User stories** | US-6 (name, email only — tags/notes in T09) |

**What to build:** Search input on `/contacts`; filter by display name (trigram) and email substring.

**Acceptance criteria:**
- [x] Search by name returns matching contacts
- [x] Search by email returns matching contacts
- [x] Empty search shows full list

---

### T07 — Tags: create, assign, filter

| Field | Value |
|---|---|
| **Status** | Done |
| **Type** | AFK |
| **Blocked by** | <span style="color:#16a34a">T06</span> |
| **User stories** | US-7 |

**What to build:** `tags` + `contact_tags` tables, tag picker on contact edit, tags column on list, filter by tag on `/contacts`.

**Acceptance criteria:**
- [x] Create freeform tag and assign to contact
- [x] Tag visible on contact list
- [x] Filter list by tag
- [x] Tag assign logs `tag_added` interaction

---

### T08 — Contact dossier page

| Field | Value |
|---|---|
| **Status** | Done |
| **Type** | AFK |
| **Blocked by** | <span style="color:#16a34a">T07</span> |
| **User stories** | US-8 (partial) |

**What to build:** `/contacts/[id]` dossier: display name, emails, phones, company, title, tags, enrichment summary placeholder.

**Acceptance criteria:**
- [x] Click contact from list opens dossier
- [x] All synced fields + tags rendered
- [x] 404 for unknown id

---

### T09 — Notes + interaction timeline

| Field | Value |
|---|---|
| **Status** | Done |
| **Type** | AFK |
| **Blocked by** | <span style="color:#16a34a">T08</span> |
| **User stories** | US-9, US-14 (partial), US-6 (notes search) |

**What to build:** `interactions` table, add note form on dossier, reverse-chronological timeline (notes, tag changes), update `last_interaction_at`, extend search to note content.

**Acceptance criteria:**
- [x] Add timestamped note on dossier
- [x] Timeline shows notes + tag_added/tag_removed
- [x] Search finds contacts by note content
- [x] `last_interaction_at` updates on note

---

### T10 — Edit contact + user_overrides

| Field | Value |
|---|---|
| **Status** | Done |
| **Type** | AFK |
| **Blocked by** | <span style="color:#16a34a">T09</span> |
| **User stories** | US-8 (edit path) |

**What to build:** `/contacts/[id]/edit`, `user_overrides` jsonb, edit sets override flags, re-sync skips overridden fields.

**Acceptance criteria:**
- [x] User can edit display name, company, title, etc.
- [x] Edited fields survive Google re-sync
- [x] Non-overridden fields still update from sync
- [x] Unit tests for override merge logic

---

### T11 — Calendar sync + events list

| Field | Value |
|---|---|
| **Status** | Done |
| **Type** | AFK |
| **Blocked by** | <span style="color:#16a34a">T04</span> |
| **User stories** | US-12 |

**What to build:** Calendar sync engine (30d past / 90d future), `calendar_events` table, `/calendar` page listing upcoming events.

**Acceptance criteria:**
- [x] Events sync on account connect + manual/cron trigger
- [x] `/calendar` shows events sorted by start time
- [x] Upsert by `(google_account_id, google_event_id)`

---

### T12 — Link calendar events to contacts

| Field | Value |
|---|---|
| **Status** | Done |
| **Type** | AFK |
| **Blocked by** | <span style="color:#16a34a">T11</span>, <span style="color:#16a34a">T08</span> |
| **User stories** | US-13, US-8 (calendar on dossier) |

**What to build:** Match attendee emails to contacts; `linked_contact_id` on events; show upcoming linked events on dossier; link from calendar row to contact.

**Acceptance criteria:**
- [x] Event with known attendee email links to contact
- [x] Dossier shows upcoming meetings with this contact
- [x] Calendar row links to contact dossier when linked

---

### T13 — Enrichment pipeline + LeadPure (single)

| Field | Value |
|---|---|
| **Status** | Done |
| **Type** | AFK |
| **Blocked by** | <span style="color:#16a34a">T08</span> |
| **User stories** | US-10, US-11 (partial) |

**What to build:** Enricher plugin interface, LeadPure provider, `enrichment_runs` table, "Enrich" button on dossier, merge into `enrichment_blob` + display fields (respecting `user_overrides`).

**Acceptance criteria:**
- [x] Trigger enrichment on one contact from dossier
- [x] Success populates company/title/location/social where available
- [x] `enrichment` interaction logged
- [x] LeadPure HTTP mocked in tests

---

### T14 — Batch enrichment with exponential retry

| Field | Value |
|---|---|
| **Status** | Done |
| **Type** | AFK |
| **Blocked by** | <span style="color:#16a34a">T13</span> |
| **User stories** | US-11 |

**What to build:** Batch enrich action (settings or dossier list select), chunked processing, exponential backoff (1s → 60s, 5 retries), per-contact status in `enrichment_runs`.

**Acceptance criteria:**
- [x] Batch of N contacts processes sequentially/in chunks
- [x] Transient failures retry with backoff
- [x] Failed contacts marked failed; successes not re-queued
- [x] Retry behavior covered by unit tests

---

### T15 — JSON export

| Field | Value |
|---|---|
| **Status** | Done |
| **Type** | AFK |
| **Blocked by** | <span style="color:#16a34a">T09</span> |
| **User stories** | US-15 |

**What to build:** `GET /api/export/contacts` (session required), download button on settings, versioned JSON per technical-design §10.

**Acceptance criteria:**
- [x] Export includes contacts, tags, notes, interactions, enrichment, userOverrides
- [x] Requires app session
- [x] Valid JSON; documents `version: 1`

---

### T16 — Background sync + status

| Field | Value |
|---|---|
| **Status** | Done |
| **Type** | AFK |
| **Blocked by** | <span style="color:#16a34a">T04</span>, <span style="color:#16a34a">T11</span> |
| **User stories** | (infra — supports all sync stories) |

**What to build:** `POST /api/sync/trigger` with cron secret, in-process 6h scheduler, manual "Sync now" on settings, last sync timestamps + error surfacing.

**Acceptance criteria:**
- [x] Cron endpoint syncs all connected accounts
- [x] Manual sync from settings works
- [x] Settings shows last sync time per account
- [x] Sync errors visible without data loss

---

## Suggested sprint order

Work **Ready → Done** one ticket at a time. Critical path:

```
T01 → T02 → T04 → T05 → T06 → T07 → T08 → T09 → T10
                              ↘ T11 → T12 (after T08)
                              ↘ T13 → T14 (after T08)
T09 → T15
T04+T11 → T16
T02 → T03 (anytime after T02, before ship)
```

**Recommended pick order:** T01, T02, T04, T05, T06, T07, T08, T11, T12, T09, T10, T13, T14, T15, T16, T03.

T03 (disconnect) can slot in after T02 for early cleanup testing; defer if focusing on happy path.

---

## Board snapshot

GitHub Issues: https://github.com/enw/e10d-crm/issues

**Blocked by:** <span style="color:#16a34a">green</span> = dependency done · default = still open

| ID | GitHub | Title | Status | Blocked by |
|---|---|---|---|---|
| T01 | [#1](https://github.com/enw/e10d-crm/issues/1) | App shell + password login | Done | — |
| T02 | [#2](https://github.com/enw/e10d-crm/issues/2) | Connect a Google account | Done | <span style="color:#16a34a">#1</span> |
| T03 | [#3](https://github.com/enw/e10d-crm/issues/3) | Disconnect a Google account | Done | <span style="color:#16a34a">#2</span> |
| T04 | [#4](https://github.com/enw/e10d-crm/issues/4) | Sync contacts from Google | Done | <span style="color:#16a34a">#2</span> |
| T05 | [#5](https://github.com/enw/e10d-crm/issues/5) | Multi-account dedup by email | Done | <span style="color:#16a34a">#4</span> |
| T06 | [#6](https://github.com/enw/e10d-crm/issues/6) | Contact search | Done | <span style="color:#16a34a">#5</span> |
| T07 | [#7](https://github.com/enw/e10d-crm/issues/7) | Tags: create, assign, filter | Done | <span style="color:#16a34a">#6</span> |
| T08 | [#8](https://github.com/enw/e10d-crm/issues/8) | Contact dossier page | Done | <span style="color:#16a34a">#7</span> |
| T09 | [#9](https://github.com/enw/e10d-crm/issues/9) | Notes + interaction timeline | Done | <span style="color:#16a34a">#8</span> |
| T10 | [#10](https://github.com/enw/e10d-crm/issues/10) | Edit contact + user_overrides | Done | <span style="color:#16a34a">#9</span> |
| T11 | [#11](https://github.com/enw/e10d-crm/issues/11) | Calendar sync + events list | Done | <span style="color:#16a34a">#4</span> |
| T12 | [#12](https://github.com/enw/e10d-crm/issues/12) | Link calendar events to contacts | Done | <span style="color:#16a34a">#11</span>, <span style="color:#16a34a">#8</span> |
| T13 | [#13](https://github.com/enw/e10d-crm/issues/13) | Enrichment + LeadPure (single) | Done | <span style="color:#16a34a">#8</span> |
| T14 | [#14](https://github.com/enw/e10d-crm/issues/14) | Batch enrichment with retry | Done | <span style="color:#16a34a">#13</span> |
| T15 | [#15](https://github.com/enw/e10d-crm/issues/15) | JSON export | Done | <span style="color:#16a34a">#9</span> |
| T16 | [#16](https://github.com/enw/e10d-crm/issues/16) | Background sync + status | Done | <span style="color:#16a34a">#4</span>, <span style="color:#16a34a">#11</span> |

---

## Using Matt Pocock skills

**Yes — partially.** The relevant skill is **`to-issues`** (`~/.claude/skills/to-issues`):

| Capability | `to-issues` | This kanban doc |
|---|---|---|
| Vertical slices (not layer cake) | ✅ | ✅ |
| Dependency / blocked-by | ✅ | ✅ |
| HITL vs AFK classification | ✅ | ✅ (T02 = HITL) |
| Quiz user before publishing | ✅ | Skipped — you asked for full breakdown |
| Publish to GitHub Issues | ✅ | ✅ [#1–#16](https://github.com/enw/e10d-crm/issues) |
| Kanban column tracking | ❌ | ✅ in this file + GitHub labels |

**Workflow:** Triage on GitHub (`needs-triage` → `ready` → `in-progress` → `done`). Update this file's Status column when closing issues. Issue #1 is labeled `ready` — start there.

---

## Ticket body template (for GitHub)

When publishing, use this per ticket:

```markdown
## What to build
<from ticket above>

## Acceptance criteria
<checkboxes from ticket>

## Blocked by
#<issue> or None

## User stories
US-N, ...
```

Label suggestion: `needs-triage` on create (per `to-issues`), then `ready` / `in-progress` / `done` as work proceeds.
