# PR Coach

An AI-powered personal record tracker for athletes. Track running times, lifting maxes, and basketball stats with an AI coach that knows your actual numbers.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `OPENAI_API_KEY` — for AI Coach chat and onboarding features

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite (artifacts/pr-coach, preview at `/`)
- API: Express 5 (artifacts/api-server, port 8080, prefix `/api`)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contract)
- `lib/db/src/schema/` — Drizzle DB schema (athletes, personal_records, conversations, messages)
- `lib/api-client-react/src/generated/api.ts` — generated React Query hooks
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/pr-coach/src/pages/` — React pages (Home, Onboarding, Dashboard, Records, Coach)

## Architecture decisions

- Single-athlete app for v1 — athlete row is upserted at `/api/athletes/me` using a hardcoded `SINGLE_ATHLETE_ID = 1`
- AI Coach uses OpenAI `gpt-4o-mini` with SSE streaming; system prompt is built from athlete's DB profile
- OpenAPI-first: all routes defined in `openapi.yaml`, Orval generates typed hooks and Zod schemas
- Records are stored per (sport, category, unit) tuples — no normalized category table

## Product

- **Home** (`/`) — marketing landing page; auto-redirects to dashboard if already onboarded
- **Onboarding** (`/onboarding`) — chat-based questionnaire that builds your athlete profile
- **Dashboard** (`/dashboard`) — overview of total PRs, sport breakdown, recent records, goals
- **Records** (`/records`) — log and view PRs by sport (Running, Weightlifting, Basketball) with trend charts
- **Coach** (`/coach`) — chat with GPT-4o-mini AI coach that has context of your PR history

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Never use `console.log` in server code — use `req.log` in route handlers, `logger` singleton elsewhere
- Run `pnpm --filter @workspace/api-spec run codegen` after any change to `openapi.yaml`
- Run `pnpm --filter @workspace/db run push` after schema changes in `lib/db/src/schema/`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
