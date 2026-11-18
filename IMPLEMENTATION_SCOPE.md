# LeadLoop — MVP Scope Freeze (Phases 0–5)

**Product:** Multi-tenant lead tracking CRM, usable for small businesses.  
**Delivery planning assumption:** approximately **6–8 weeks part-time** with a real development/test environment. This estimate does not imply the app has been deployed or verified by that date.

| Phase | Goal | Included | Exit checks |
|---|---|---|---|
| 0 — Foundations | Runnable baseline | Next.js 16 + React + Tailwind 4, Prisma 7 Postgres schema, seed, CI starter | Clean install, checked-in migration, typecheck, build |
| 1 — Identity & tenancy | Separate accounts and roles | Better Auth email sign-up, verify, login, reset; Owner/Staff; workspaces; invite/accept/remove | Two independent businesses and membership-based access verified |
| 2 — Lead operations | Capture and manage | Contact linking/CRUD, lead CRUD, notes, stages, assignment, follow-up tasks, audit events | Lead captured, assigned, followed up, won/lost, and archived |
| 3 — Daily workflow | Usable CRM | Dashboard, Kanban drag/drop, task worklist, WhatsApp deep link attempt | Mobile and keyboard usability; rollback on failed stage move |
| 4 — Inbound enquiries | Website lead capture | Hosted public form, simple limiter, honeypot; signed idempotent Sister's Magical Spoon receiver | Original website server forwards durably, a retry creates no duplicate |
| 5 — Reports & launch gating | Validate usability | Source/stage reports, conversion, lost reasons, starter tests, CI, deploy instructions | E2E tests, staged smoke tests, backup/restore and monitoring configured |

**Deferred until after launch:** Manager role, custom permissions, PostgreSQL RLS, Redis, CSV import/export, integration logs, custom fields, official WhatsApp Business messaging, automated messaging, billing and AI features.

**Implementation note:** The source files and a candidate initial migration exist in this archive. Database-backed tests and CI have been added, but have not been run locally. Completing Phase 0–5 exit criteria still requires installation, executing the migrations, configuring email and a database, wiring Sister's Magical Spoon's live backend, and deploying/verifying an approved release. The archive is not a claim of a released product.
