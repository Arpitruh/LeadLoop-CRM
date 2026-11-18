# LeadLoop CRM — MVP source (Phases 0–5)

A Next.js multi-tenant CRM prototype with owner/staff workspaces, contacts, leads, pipeline, tasks, notes, basic reporting, invitations, public forms, and a signed Sister's Magical Spoon integration receiver.

## Scope

**Included:** Phase 0 (app foundation and schema), 1 (Better Auth, workspace membership and invitations), 2 (contacts/leads/notes/tasks), 3 (dashboard and Kanban), 4 (public form and signed partner receiver), 5 (basic reports, UI states, starter tests, CI and deployment instructions).

**Excluded deliberately:** Manager role, permissions matrix customization, PostgreSQL RLS, Redis, CSV import/export, integration logs/diagnostics UI, custom fields, official WhatsApp Business API, billing, automated WhatsApp messages, email reminder jobs.

## Stack (lockfile still required after installation)

- Next.js 16.4.2, React 19.3.1, TypeScript, Tailwind 4
- Better Auth 1.7.10, Prisma 7.10.1 with `@prisma/adapter-pg`, PostgreSQL
- dnd-kit, Recharts, Zod 4, libphonenumber-js

The dependency families were checked against official reference guides. **The npm registry and PostgreSQL were unavailable here; there is no generated `package-lock.json`, and the included SQL migration has not been run.** The syntax parser and selected timezone cases were checked, but install, typecheck, DB integration, build and E2E tests remain unverified. See [`README_UPDATES.md`](./README_UPDATES.md) and [`RELEASE_CHECKLIST.md`](./RELEASE_CHECKLIST.md).

## Local setup (WSL/Ubuntu recommended)

1. Install Node.js 22.12+ (Node 24 LTS recommended), npm, and Docker.
2. Run `docker compose up -d` to start a development-only PostgreSQL instance.
3. Copy `.env.example` to `.env` and generate a strong `BETTER_AUTH_SECRET` (e.g. `openssl rand -base64 48`).
4. `npm install`
5. `npm run db:generate`
6. `npm run db:deploy` — applies the included initial migration. This migration must be checked against Prisma and tested on a fresh database before production.
7. `npm run dev`; open `http://localhost:3000`.
8. Sign up, get the verification link printed in the **development server log** (when Resend is not configured), verify it, sign in, and create the first workspace.
9. Optional: `npm run db:seed` seeds 5 fake leads into the first owner workspace; it does not create a demo-password account.

In production, set `RESEND_API_KEY` and `EMAIL_FROM` to a verified sending domain. Without them verification, reset and invitation emails cannot be sent.

## Run checks

```bash
npm run db:generate
npm run db:deploy
npm run lint
npm run typecheck
npm test
ALLOW_DB_INTEGRATION_TESTS=1 npm run test:integration  # disposable database only
npm run build
npx playwright install chromium
npm run test:e2e
npm run smoke
```

`npm run test:e2e` requires a runnable local application and database. CI runs migration deployment and a database-backed tenant/workflow suite. It uses `npm install` until the generated `package-lock.json` has been committed, after which it automatically uses `npm ci`. These checks must pass before production.

## Database boundaries

- The authenticated business context comes from Better Auth sessions and an existing Membership, never a caller-supplied `businessId`.
- Staff see and update only assigned leads; owners have broad access within their own business.
- Public submissions are assigned to the correct form business and start unassigned.
- Lead/contact create and audit stage transitions are transactional.
- The app has no PostgreSQL RLS. Enforce all policy in server handlers and data access functions.

## Authentication & invitations

- Signup → verification link → login → workspace onboarding.
- Password reset uses Better Auth and your configured email provider.
- Owners invite staff by email; token hash is stored, tokens expire after 7 days, acceptance requires a verified matching account.
- Owners can remove staff; their leads become unassigned and open tasks are reassigned to owner.

## Sister's Magical Spoon

Read [`INTEGRATION.md`](./INTEGRATION.md) and the server-only example. The receiver exists but the external website still needs to be connected.

## Deploy to Vercel (after local checks pass)

1. Push the project to a new GitHub repository, WITHOUT `.env` or generated secrets.
2. Create Neon PostgreSQL databases for preview and production; use pooled `DATABASE_URL` and direct `DIRECT_URL`.
3. Review and test the included initial migration, then commit the npm lockfile generated locally.
4. Set all required Vercel environment variables for each environment, including `BETTER_AUTH_URL` matching its HTTPS origin and a strong secret.
5. Run `prisma migrate deploy` on the target database before deploying a new schema and `prisma generate` during build. Never run destructive `db push` on production.
6. Verify email sender/domain, TLS, backup and restoration path, CSP and headers, basic throttling at the platform, and user access behavior.
7. Complete the acceptance checklist and production smoke tests before inviting real customers.

## MVP acceptance items to verify with a live DB

- [ ] A/B workspace isolation for all routes, including tasks and reports
- [ ] Signup/verify/reset/invitation acceptance
- [ ] Create lead/contact, log a note, assign, move, win/lose, archive
- [ ] Tasks overdue/today in configured timezone
- [ ] Public form rate/honeypot checks and legitimate submit
- [ ] Signed Sister's Magical Spoon delivery, retries, tampering and idempotency
- [ ] Desktop/mobile keyboard navigation, contrast, focus, error states
- [ ] Migrations, restore drill, CI, production deployment, monitoring

This is actual application source code, not a design mockup; verification and launch setup remain necessary. Start with [`DEPLOYMENT.md`](./DEPLOYMENT.md) and [`RELEASE_CHECKLIST.md`](./RELEASE_CHECKLIST.md).
