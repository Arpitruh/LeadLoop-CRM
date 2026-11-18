# LeadLoop MVP completion pass — 18 November 2026

This ZIP **updates the original Phase 0–5 source package**, rather than adding the V1.5/V2 backlog. Those releases remain intentionally deferred until after the MVP is launched, per scope freeze.

## Implemented in this pass

- Checked-in **initial PostgreSQL migration** for all Prisma models, relations, indexes and Better Auth tables (`prisma/migrations`). It has **not** been executed locally.
- Added integration test suite exercising real database tenant isolation, route authorization, staff task permissions, stage audit behaviour, public form idempotency and signed Sister's Magical Spoon retry handling.
- Added a readiness/liveness HTTP endpoint and a non-destructive release smoke-test script.
- Updated GitHub Actions to install deps, deploy migrations, run static tests, real PostgreSQL tests, a build and browser smoke tests (requires a runner with npm registry access).
- Fixed **overdue follow-up calculations**: due times earlier today now count as overdue.
- Fixed business-timezone date boundaries on 23-hour / 25-hour DST change days.
- Fixed stage-change UI to revert optimistic selection when the server rejects the update.
- Restricted staff task reads/updates to tasks assigned to them as well as accessible leads.
- Improved transaction retry behaviour for idempotent inbound submissions.
- Added release-readiness and operations checklist (`RELEASE_CHECKLIST.md`).

## Verification actually performed here

- TypeScript/TSX files parsed without syntax errors using the installed TypeScript parser (not a typecheck).
- Date-bound conversion exercised against India and New York DST transitions using an isolated transpiled function.
- ZIP integrity verified after packaging.

## Blocked here — **not verified**

- npm install and package-lock generation: external npm registry DNS returned `EAI_AGAIN`.
- `prisma migrate deploy`, Postgres integration tests, full TypeScript typecheck, ESLint, build and Playwright: the needed dependencies and database are unavailable in this container.
- Better Auth verification email, reset, team invitation delivery: no configured email service.
- Live Sister's Magical Spoon integration: needs a durable server-side form handler with matching secrets; only the CRM receiver/example are in this archive.
- Public Vercel deployment: requires linked repo/project/environment and an approved production environment.

## First actions in a development environment

```bash
cp .env.example .env    # set strong secrets; keep .env uncommitted
docker compose up -d
npm install             # generate and COMMIT package-lock.json
npm run db:generate
npm run db:deploy       # applies the checked-in initial migration
npm run db:status
npm run lint && npm run typecheck && npm test
ALLOW_DB_INTEGRATION_TESTS=1 npm run test:integration  # disposable test DB only
npm run build
npx playwright install chromium
npm run test:e2e
npm run dev
```

**Do not claim production readiness** until all checks in `RELEASE_CHECKLIST.md` pass on staging and production.
