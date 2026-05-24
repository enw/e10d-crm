# e10d-crm

Next.js CRM with OAuth login, Google Contacts + Google Calendar sync.

## State

Greenfield — T01 scaffold in progress. See [docs/kanban.md](docs/kanban.md) and GitHub Issues.

## Key architecture

- Next.js App Router (`src/app/`)
- App auth: env-var password + session cookie (see T01)
- Google OAuth: Auth.js (T02+)
- Drizzle + PostgreSQL
- Docker Compose on homelab

## Verification

```sh
pnpm install
pnpm db:up          # Postgres on localhost:5433 (avoids macOS port 5432 conflict)
pnpm db:migrate
pnpm dev
pnpm lint
pnpm build
docker compose up --build
```

No CI yet.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
