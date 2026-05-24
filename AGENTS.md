# e10d-crm

Next.js CRM with OAuth login, Google Contacts + Google Calendar sync.

## State

Empty repo — no commits, no scaffold, no deps.

## First setup

```sh
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir
```

## Key architecture expectations (from intent)

- Next.js App Router (`src/app/`)
- OAuth: NextAuth.js (Auth.js) with Google provider
- Google APIs: people (Contacts) and calendar (Calendar) scopes
- Server actions or API routes for Google API proxy calls
- Drizzle or Prisma for DB (Neon PostgreSQL likely)

## Before writing code

1. Install and configure NextAuth.js with Google provider
2. Set up Neon Postgres + Drizzle/Prisma schema
3. Wire OAuth scopes for `https://www.googleapis.com/auth/contacts` and `https://www.googleapis.com/auth/calendar`
4. Scaffold app layout, protected routes, API proxy layer

## Verification

```sh
npm run dev          # dev server
npm run lint         # lint (after scaffold)
npm run typecheck    # if tsconfig has noEmit
```

No CI, no tests, no deploy config yet.
