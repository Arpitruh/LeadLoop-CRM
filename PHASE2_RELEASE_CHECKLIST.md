# LeadLoop CRM — Phase 2 release readiness (20 November 2026)

## Verified infrastructure (read only, except initial schema creation)

- Vercel project `leadloop-crm-staging` is connected to GitHub and uses Vercel Authentication protection.
- Vercel Marketplace Neon store `leadloop-crm` resolves to project `still-cell-91816437` (PostgreSQL 18).
- The Neon `main` branch and isolated `preview/feat/phase2-email-and-live-db-readiness` branch originally had no CRM tables under `public`. Only the separate vendor-managed `neon_auth` schema existed.
- Applied the **checked-in initial LeadLoop SQL migration**, without drop statements or seed data, to the empty **preview branch first** and then the empty **main branch**, as transactional batches with Prisma-compatible migration history.
- Both branches now have 17 public tables, including `_prisma_migrations`. The `main` branch had zero CRM users and zero businesses after installation.
- The `/api/health/ready` route now checks required CRM tables, not just database connectivity.

## No-cost email transport — code ready, activation pending

LeadLoop can use the already-running Notification Service rather than requiring a paid email provider. Configure an **application-scoped credential** for LeadLoop, then publish three email templates in Notification Service.

| Variable | Required value |
| --- | --- |
| `NOTIFICATION_SERVICE_URL` | Existing Notification Service HTTPS origin |
| `NOTIFICATION_SERVICE_API_KEY` | Dedicated LeadLoop application API key, stored as a Vercel secret |
| `NOTIFICATION_TEMPLATE_VERIFICATION` | Published template slug for verification |
| `NOTIFICATION_TEMPLATE_PASSWORD_RESET` | Published template slug for password reset |
| `NOTIFICATION_TEMPLATE_INVITATION` | Published template slug for staff invitations |

Template payload variables: `{{appName}}`, `{{subject}}`, `{{url}}`. **The action link is secret-bearing**: render it in the email button only. Avoid writing it into analytics or application logs. Configure appropriate template text and expiry notices. Verify that the Notification Service email provider is genuinely enabled and able to deliver to an approved inbox.

The adapter uses a hashed idempotency key and treats HTTP 200/202 as acceptance **only**, not final inbox delivery. It does not downgrade to Resend if the Notification Service is configured incorrectly. Resend remains available when `RESEND_API_KEY` and `EMAIL_FROM` are explicitly configured.

Do not set fake API keys or publish test credentials. No real message was sent by these changes.

## Release verification remaining

- [x] Database schema present on Vercel-managed Neon `main` and preview
- [x] Database migration records and core table names verified through Neon
- [x] Email transport implemented with fetch mocks and unit tests
- [ ] Provision or reuse a **dedicated** Notification Service application credential and publish three templates; set Vercel secrets
- [ ] Confirm Notification Service SMTP is configured and a genuine email arrives at an approved inbox
- [ ] Perform real signup/verification/reset against the protected deployment using an authorized staging account
- [ ] Exercise authenticated owner/staff dashboard and core CRM flows against hosted Neon
- [ ] Check deploy-time readiness (HTTP 200) and database errors with authenticated Vercel access, without disabling deployment protection
- [ ] Record a rollback/restore procedure and enable appropriate monitoring before wider release

**Safety:** Never drop or reseed production data to reproduce a test. Do not expose Neon credentials, verification links or application API keys. Keep the Vercel Hobby and Neon Free limits; no paid provider or plan is required just to implement the adapter.
