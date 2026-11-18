# LeadLoop staging → production deployment guide

> Do not deploy with production customer data until all checks in `RELEASE_CHECKLIST.md` pass. This guide does not imply the application has been deployed.

## 1. Prepare repository and local environment

- Create a **private** repository in your own GitHub account; do not commit `.env`, API keys, customer records or database dumps.
- Use Node 24 (or supported Node 22.12+).
- In a networked environment, run `npm install`, commit `package-lock.json`, then use `npm ci` afterward.
- `cp .env.example .env`; use a strong random `BETTER_AUTH_SECRET` and leave `.env` untracked.
- `docker compose up -d`, `npm run db:generate`, `npm run db:deploy`, `npm run db:status`.
- Verify that `prisma.config.ts` is autodiscovered by `prisma migrate`.

## 2. Stage on Vercel + Neon

- Provision a **staging** Neon PostgreSQL database first. Keep production separate.
- Set `DATABASE_URL` (appropriate pooled URL) and `DIRECT_URL` (direct migration URL) on staging.
- Set `BETTER_AUTH_URL=https://<staging-domain>` and `NEXT_PUBLIC_APP_URL` to that HTTPS origin.
- Set `BETTER_AUTH_SECRET` (different from development/production) and configure `RESEND_API_KEY` + verified `EMAIL_FROM`.
- Optional inbound receiver requires `SISTERS_BUSINESS_ID` + `SISTERS_CRM_SECRET` (random 32+ characters). Never use `NEXT_PUBLIC_` for secrets.
- Run `npx prisma migrate deploy` against staging using staging credentials **before** schema-dependent app traffic.
- Build with `npm run build`. Expose `/api/health/ready` for uptime monitoring and alert on non-200 responses.

## 3. Verify on staging

```bash
npm run lint && npm run typecheck && npm test
ALLOW_DB_INTEGRATION_TESTS=1 npm run test:integration  # disposable test DB, NOT shared staging
npm run build
npm run test:e2e
SMOKE_BASE_URL=https://<staging-domain> npm run smoke
```

- Test two business accounts, verification, team invitation/removal, wrong-tenant access, follow-up completion and no duplicate signed submissions.
- Configure platform-level bot/rate protection: in-memory login/public limiters do **not** rate-limit across concurrent Vercel instances.
- Verify backup/restore for staging, and configure error monitoring with PII redaction.
- Connect Sister's Magical Spoon **server-side** after its durable source submission store and retries are implemented. See `INTEGRATION.md`.

## 4. Production promotion

- Obtain approval before making the demo public. Use a separate production DB with backups enabled.
- Apply migrations first, using a backward-compatible migration strategy. Never use `prisma db push` on production.
- Set a new production auth secret, production sender and production source-integration HMAC secret.
- Check the production canonical domain, HTTPS, email sender, auth redirect, rate controls and monitor.
- Run `SMOKE_BASE_URL=https://<production-domain> npm run smoke` after deployment.
- Use only synthetic demonstration data in publicly accessible demos.

## Failure recovery

- If a deploy fails before migrations, revert the application release.
- After migrations, **do not blindly roll back the database**. Revert to backward-compatible app code or perform a separately reviewed corrective migration.
- Restore from the database provider only after verifying the recovery point and considering customer data written since that point.
