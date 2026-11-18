# LeadLoop V1 release gate (Phases 0–5 only)

No V1.5/V2 features are included in this delivery. This is the checklist for getting a **real** release, not merely compiling a prototype.

## Build and database

- [ ] Use Node 22.12+ and install dependencies; commit npm lockfile.
- [ ] Run `npm ci`, `npm run db:generate`, and `npm run db:deploy` on **fresh staging Postgres**.
- [ ] Run `npx prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --exit-code` with a shadow database to detect drift; investigate every mismatch. Initial migration was authored without Prisma CLI access.
- [ ] Run `npm run lint && npm run typecheck && npm test && npm run test:integration && npm run build`.
- [ ] Run `npm run test:e2e` with Chrome installed, then `SMOKE_BASE_URL=https://... npm run smoke`.

## Access control and data protection

- [ ] Two businesses: owner and staff cannot see/update each other's leads, contacts, tasks, notes, reports, or forms.
- [ ] Staff cannot view/complete another staff member's tasks.
- [ ] Signup, verification, reset and expiring invitation acceptance work through verified email provider.
- [ ] Login and public form abuse controls work when scaled across multiple instances (platform WAF/bot rule required; memory-only limiter is insufficient).
- [ ] Check CSRF, content security policy, no PII in logs, secrets isolated server-side.

## Daily CRM and integrations

- [ ] Lead capture → assign → note → follow-up → WON/LOST → reporting works.
- [ ] Datetime inputs show correct local business timezone including DST boundary.
- [ ] Sister's Magical Spoon form is durably stored at source and sent from **server**, with retry IDs and secret headers; verify exactly once when retrying five times.
- [ ] Email sending configured for signup/reset/invitations (Resend key, verified sender).
- [ ] Check mobile UI and keyboard workflows, errors, empty states, large records.

## Operations and legal

- [ ] Staging and production databases are separate; set `DATABASE_URL`, `DIRECT_URL` and `BETTER_AUTH_URL` per environment.
- [ ] Backups enabled with a documented restore drill; verify provider's recovery capability and retention.
- [ ] Uptime monitor targets `/api/health/ready`; error monitoring and security alerts configured.
- [ ] Privacy notice, retention period, deletion process, opt-out process and support contact reviewed for jurisdiction.
- [ ] Synthetic demo data only; real customer PII must not be used in publicly viewable demos.
- [ ] Rollback strategy rehearsed; DB schema changes must be backward-compatible across release windows.

**Cannot claim release-ready until all checks are completed in the live environment.**
