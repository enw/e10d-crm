# e10d-crm PRD

## Problem Statement

I'm a full-time employee building a personal brand and side-hustle consultancy (LLC). I meet people — potential clients, collaborators, speakers, mentors — across email, events, and social. I have multiple Google accounts (personal, consultancy) each with contacts and calendars.

Today I have no unified system to:
- Remember who someone is and what we discussed
- Prepare for meetings with context ("what did we talk about last time?")
- Know which relationships I'm neglecting
- Enrich contacts automatically (company, role, social profiles)
- Tag and segment my network for outreach

Without this, opportunities slip through cracks and relationships atrophy.

## Solution

A single-user CRM running on my home lab that:
- Syncs contacts and calendars from multiple Google accounts
- Enriches contacts with data from LeadPure (and pluggable enrichers)
- Lets me tag, annotate, and build dossiers on people
- Logs meeting notes and interaction history
- Surfaces neglected relationships over time

## User Stories

1. As a user, I want to log in with an env-var password, so the homelab app isn't open to the internet
2. As a user, I want to connect multiple Google accounts, so contacts and calendars from all my identities sync in
3. As a user, I want to disconnect a Google account and remove its synced data, so I can clean up when I leave a service
4. As a user, I want contacts from all connected Google accounts merged and deduplicated by email, so I see one profile per person
5. As a user, I want to view a unified contact list with names, emails, companies, and tags, so I can browse my network
6. As a user, I want to search contacts by name, email, tag, or note content, so I can quickly find someone
7. As a user, I want to assign freeform tags to contacts, so I can segment my network (e.g. "coaching lead", "speaking", "former coworker")
8. As a user, I want to see a single contact dossier with their details, tags, notes, enrichment data, and interaction history, so I can prepare before a meeting
9. As a user, I want to write notes on a contact after a meeting or call, timestamped, so I track what we discussed
10. As a user, I want to trigger enrichment on a contact (initially via LeadPure) to auto-populate company, role, location, and social profiles from their email
11. As a user, I want enrichment to be modular so new data sources can be added without rewriting the core
12. As a user, I want to view my synced calendar events, so I see what's coming up
13. As a user, I want calendar events linked to contacts by email, so I can see who I'm meeting when
14. As a user, I want interaction history on a contact to include meeting notes, enrichment timestamps, and tag changes, so I have a complete timeline
15. As a user, I want to export my contacts (with tags and notes), so I'm never locked in

## Implementation Decisions

### Modules

| Module | Responsibility |
|---|---|
| `Auth` | Env-var password gate + Google OAuth connection manager |
| `Google Account Manager` | Connect/disconnect Google identities, token refresh, scope mgmt |
| `Contact Sync Engine` | Pull contacts from multiple Google accounts, deduplicate, store locally |
| `Calendar Sync Engine` | Sync events, link to contacts by email |
| `Contact Model` | Core: contacts, tags, notes, enrichment blobs |
| `Enrichment Pipeline` | Modular enrichers (LeadPure first), pluggable per contact |
| `Interaction Tracker` | Meeting notes, interaction log, timestamps |
| `Tag Manager` | CRUD + assign/unassign tags |

### Architecture

- **Framework:** Next.js App Router (`src/app/`)
- **Hosting:** Docker Compose on homelab
- **Database:** PostgreSQL (Neon-compatible schema; same image in Docker)
- **ORM:** Drizzle (shallow preference, no strong feeling)
- **App Auth:** Single password in `AUTH_PASSWORD` env var (bcrypt'd). Middleware gate on all routes except login.
- **Google OAuth:** Auth.js (NextAuth.js) for Google provider. Separate "Connect Google Account" flow — app auth and Google auth are decoupled.
- **Google Scopes:** `https://www.googleapis.com/auth/contacts.readonly`, `https://www.googleapis.com/auth/calendar.readonly`
- **Sync Strategy:** Pull on connect, then periodic background sync (cron or polling). Webhook support if Google ever enables it.
- **Deduplication:** Merge by primary email. Keep Google resource IDs so re-syncs update rather than duplicate.
- **Enrichment Pipeline:** Plugin interface — receives email, returns structured data. First plugin: LeadPure HTTP client. Configurable per-contact or batch.
- **Dossiers:** Aggregated view combining contact fields, enrichment data, notes (reverse chronological), tags, and recent calendar events.
- **Export:** JSON export of all contacts with full metadata. No lock-in.

### UI Pages (rough)

- `/login` — password gate
- `/contacts` — searchable, filterable list
- `/contacts/[id]` — dossier view (details, enrichment, tags, notes, calendar events)
- `/contacts/[id]/edit` — edit contact, add note, assign tags
- `/calendar` — synced events view (raw)
- `/settings` — manage Google accounts, enrichment config, export

### Schema (conceptual tables)

- `contacts` — id, name, emails, phones, company, notes, enrichment_blob (JSON), created_at, updated_at
- `tags` — id, name
- `contact_tags` — contact_id, tag_id
- `interactions` — id, contact_id, type (note/meeting), content, timestamp
- `google_accounts` — id, email, access_token (encrypted), refresh_token (encrypted), scopes
- `calendar_events` — id, google_account_id, event_id, title, start_time, end_time, attendees (JSON), linked_contact_id (nullable)
- `enrichment_runs` — id, contact_id, source (e.g. "leadpure"), status, result (JSON), run_at

## Testing Decisions

- **What to test:** Contact sync deduplication logic, enrichment pipeline plugin interface, Drizzle queries (integration)
- **What NOT to test:** Next.js page rendering (shallow smoke test only), Google API responses (mock at boundary)
- **How:** Vitest + `@testing-library/react` for any component logic. Drizzle kit for migrations.
- **Prior art:** No existing tests in repo. This is greenfield.

## Out of Scope

- Mobile app (responsive web only)
- Multi-user / team features
- Email client integration (reading/sending)
- Content / LinkedIn posting engine
- Workflow automation (e.g. "when tag X added, send email")
- AI-generated summaries or outreach drafts
- Dashboard / analytics (except neglected-relationships counter)
- Public API (data stays in-app)

## Further Notes

- The "neglected relationships" feature should only collect data in v1 — no UI for it yet. Schema must support querying "contacts with no interaction in N days".
- All Google tokens stored encrypted at rest (AES-256-GCM with an env-var key).
- Export is non-negotiable: the app must never be a data trap.
- Homelab deployment: single `docker-compose up` with Postgres + Next.js container. No Kubernetes, no Vercel, no cloud.
