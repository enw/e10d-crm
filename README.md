# e10d CRM

Personal CRM for a multi-account life: sync Google contacts and calendars, build dossiers, prep for meetings, enrich via [LeadPure](https://leadpure.e10d.dev). Single-user, homelab-first — password gate, no public SaaS.

**Stack:** Next.js 16 · PostgreSQL 16 · Drizzle · Docker Compose · Tailscale-friendly

---

## What it does

| Area | Behavior |
|------|----------|
| **Contacts** | Pull from multiple Google accounts, dedupe by email, search, tags |
| **Calendar** | Unified view (30d past / 90d future), color per Google account |
| **Meeting prep** | Click an event → attendee context, notes, dossier links |
| **Dossiers** | Per-contact timeline: notes, meetings, enrichment, tags |
| **Enrichment** | LeadPure batch job (company, title, location, social) |
| **Export** | Full JSON export — no lock-in |
| **Sync** | Manual “Sync now”, in-app 6h timer, or cron webhook |

Not in v1 yet: vault/PARA import, Granola meeting feed, “Today’s 3” rekindle queue.

---

## Architecture

```text
┌─────────────────────────────────────────────────────────┐
│  docker compose (westwind or local)                     │
│                                                         │
│  ┌──────────────┐      ┌─────────────────────────────┐  │
│  │  Postgres 16 │◄─────│  Next.js app (:3000)        │  │
│  │  (volume)    │      │  · UI + API                 │  │
│  └──────────────┘      │  · Google sync runner       │  │
│                        │  · LeadPure enrichment      │  │
│                        └──────────────┬──────────────┘  │
└───────────────────────────────────────┼─────────────────┘
                                        │
          Tailscale (optional)          │  HTTPS APIs
          http://westwind:3000          ▼
                                 Google · LeadPure
```

Postgres runs **inside** Compose — you do not install Postgres on the host. The app container gets `DATABASE_URL=postgresql://crm:…@db:5432/crm` automatically.

---

## Quick start (local dev)

**Requires:** Node 22+, pnpm, Docker

```bash
git clone <repo> e10d-crm && cd e10d-crm
pnpm install

cp .env.example .env
# Edit .env — at minimum AUTH_PASSWORD, AUTH_SECRET, TOKEN_ENCRYPTION_KEY

pnpm db:up          # Postgres on localhost:5433 (avoids macOS :5432 conflicts)
pnpm db:migrate
pnpm dev            # http://localhost:3000
```

Log in with `AUTH_PASSWORD`. Connect Google accounts under **Settings**.

---

## Deploy on westwind (Docker + Tailscale)

Assumes Docker on `westwind` and you reach the machine as `http://westwind:3000` on your tailnet.

### 1. Clone and configure

```bash
ssh westwind
git clone <repo> e10d-crm && cd e10d-crm
cp .env.example .env
```

Generate secrets:

```bash
# AUTH_SECRET — any long random string
openssl rand -base64 32

# TOKEN_ENCRYPTION_KEY — required for stored Google tokens
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# CRON_SECRET — for scheduled sync webhook
openssl rand -hex 24
```

**`.env` on westwind (essential fields):**

```bash
AUTH_PASSWORD=your-strong-password
AUTH_SECRET=<openssl output>
POSTGRES_PASSWORD=<pick something better than crm>
TOKEN_ENCRYPTION_KEY=<base64 output>
CRON_SECRET=<hex output>

NEXTAUTH_URL=http://westwind:3000

GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>

LEADPURE_API_KEY=<optional>
LEADPURE_API_URL=https://leadpure.e10d.dev/api/v1/enrich
```

Do **not** set `DATABASE_URL` in `.env` for Compose deploy — `docker-compose.yml` overrides it to point at the `db` service. (Only set `DATABASE_URL` when running `pnpm dev` against the exposed DB port.)

If your Tailscale MagicDNS name differs (e.g. `westwind.tail1234.ts.net`), use that consistently in `NEXTAUTH_URL` and Google Console.

### 2. Google Cloud Console

[APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials) → OAuth 2.0 Client (Web application).

Enable **Google People API** and **Google Calendar API** for the project.

| Field | Value |
|-------|--------|
| Authorized JavaScript origins | `http://westwind:3000` |
| Authorized redirect URIs | `http://westwind:3000/api/auth/callback/google` |

Scopes used (readonly): Contacts, Calendar.

The Settings page shows the exact callback URI your app expects if OAuth fails.

### 3. Build and run

```bash
docker compose up -d --build
docker compose logs -f app   # migrations run on start; wait for "Ready"
```

Open **`http://westwind:3000`** from a device on Tailscale. No need to expose port 3000 to the public internet.

### 4. First login

1. Log in with `AUTH_PASSWORD`
2. **Settings → Connect Google account** (repeat for personal + work accounts)
3. **Sync now** — pulls contacts + calendar
4. **Batch enrich** — optional LeadPure pass

---

## Background sync

The sync runner (`src/lib/sync/runner.ts`) loops connected Google accounts and refreshes **contacts** then **calendar**. It does not import vault or Granola.

| Trigger | How |
|---------|-----|
| **Manual** | Settings → Sync now |
| **In-app** | Every 6 hours while the Node process is running (`instrumentation.ts`) |
| **Cron (recommended on server)** | Host crontab on westwind |

```cron
0 */6 * * * curl -sf -X POST -H "X-Cron-Secret: YOUR_CRON_SECRET" http://127.0.0.1:3000/api/sync/trigger
```

The endpoint also accepts an authenticated browser session. Middleware allows cron requests when `X-Cron-Secret` matches `CRON_SECRET`.

---

## Environment reference

| Variable | Required | Purpose |
|----------|----------|---------|
| `AUTH_PASSWORD` | yes | App login password |
| `AUTH_SECRET` | yes | Session signing |
| `TOKEN_ENCRYPTION_KEY` | yes (if using Google) | Encrypts OAuth tokens at rest |
| `NEXTAUTH_URL` | yes | Public origin — **must match how you open the app** |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | yes (for sync) | Google OAuth |
| `POSTGRES_PASSWORD` | yes (Compose) | Postgres superuser password |
| `DATABASE_URL` | dev only | `postgresql://crm:crm@127.0.0.1:5433/crm` when using `pnpm dev` |
| `CRON_SECRET` | recommended | Secures `/api/sync/trigger` |
| `LEADPURE_API_KEY` | optional | Contact enrichment |
| `LEADPURE_API_URL` | optional | Default API URL if unset |

---

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Next.js dev server (local) |
| `pnpm build` / `pnpm start` | Production build (usually via Docker) |
| `pnpm db:up` | Start Postgres container only |
| `pnpm db:migrate` | Apply Drizzle migrations |
| `pnpm test` | Vitest unit tests |
| `docker compose up -d --build` | Full stack on westwind |

---

## Project layout

```text
src/
  app/           # Routes (contacts, calendar, settings, API)
  lib/
    sync/        # Google contact + calendar sync, runner
    enrichment/  # LeadPure pipeline
    google/      # OAuth token storage
  db/            # Drizzle schema + migrations
docs/
  prd.md              # Product requirements
  technical-design.md # Architecture deep-dive
  kanban.md           # Implementation tickets
```

---

## Troubleshooting

**Container can't resolve Tailscale hostname (`ENOTFOUND westwind`)**  
`NEXTAUTH_URL` must stay as `http://westwind:3101` (what the browser uses). Server-side self-fetch uses `http://127.0.0.1:3000` inside the container automatically. Rebuild after pulling this fix.

**Google OAuth redirect mismatch**  
`NEXTAUTH_URL` must exactly match the URL in your browser (including hostname). Update Google Console redirect URI to match Settings.

**Migration fails on macOS**  
Local dev uses port **5433** so it doesn’t collide with Homebrew Postgres on 5432. Run `pnpm db:up` before `pnpm db:migrate`.

**Sync errors in Settings**  
Per-account errors are stored on `google_accounts` — tokens may need reconnect. Sync never deletes local data on failure.

**LeadPure enrichment fails**  
Check `LEADPURE_API_KEY` and URL. Batch enrich retries transient errors with backoff.

**Container won’t start**  
`docker compose logs app` — usually missing env var or migration issue.

---

## Roadmap (personal)

- Vault/PARA person notes → contact notes + open loops  
- Granola meeting import (Mac-side agent → ingest API)  
- “Today’s 3” rekindle queue + weekly relationship metrics  

---

## License

Private / personal project.
