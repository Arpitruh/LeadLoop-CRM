-- LeadLoop V1 schema: generated-compatible SQL for PostgreSQL 17.
-- Review with `prisma migrate diff` before the first production deploy.
CREATE TYPE "Role" AS ENUM ('OWNER', 'STAFF');
CREATE TYPE "Stage" AS ENUM ('NEW', 'CONTACTED', 'QUOTE_SENT', 'WON', 'LOST');
CREATE TYPE "LeadSource" AS ENUM ('WEBSITE_FORM', 'WHATSAPP', 'INSTAGRAM', 'CALL', 'REFERRAL', 'WALK_IN', 'OTHER');
CREATE TYPE "TaskType" AS ENUM ('CALL', 'EMAIL', 'WHATSAPP', 'VISIT', 'OTHER');
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'DONE');
CREATE TYPE "NoteType" AS ENUM ('NOTE', 'CALL', 'WHATSAPP', 'VISIT');

CREATE TABLE "user" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  "image" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

CREATE TABLE "session" (
  "id" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "token" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "userId" TEXT NOT NULL,
  CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");
CREATE INDEX "session_userId_idx" ON "session"("userId");

CREATE TABLE "account" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "idToken" TEXT,
  "accessTokenExpiresAt" TIMESTAMP(3),
  "refreshTokenExpiresAt" TIMESTAMP(3),
  "scope" TEXT,
  "password" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "account_userId_idx" ON "account"("userId");

CREATE TABLE "verification" (
  "id" TEXT NOT NULL,
  "identifier" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3),
  CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

CREATE TABLE "Business" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  "currencyCode" TEXT NOT NULL DEFAULT 'INR',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Business_slug_key" ON "Business"("slug");

CREATE TABLE "Membership" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'STAFF',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Membership_businessId_userId_key" ON "Membership"("businessId", "userId");
CREATE INDEX "Membership_userId_idx" ON "Membership"("userId");

CREATE TABLE "Invitation" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "invitedEmail" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'STAFF',
  "tokenHash" TEXT NOT NULL,
  "invitedById" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Invitation_tokenHash_key" ON "Invitation"("tokenHash");
CREATE INDEX "Invitation_businessId_invitedEmail_idx" ON "Invitation"("businessId", "invitedEmail");

CREATE TABLE "Contact" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phoneE164" TEXT,
  "email" TEXT,
  "doNotContact" BOOLEAN NOT NULL DEFAULT false,
  "consentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Contact_businessId_phoneE164_key" ON "Contact"("businessId", "phoneE164");
CREATE INDEX "Contact_businessId_email_idx" ON "Contact"("businessId", "email");

CREATE TABLE "Lead" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "interest" TEXT,
  "source" "LeadSource" NOT NULL DEFAULT 'OTHER',
  "sourceDetail" TEXT,
  "stage" "Stage" NOT NULL DEFAULT 'NEW',
  "assignedToId" TEXT,
  "createdById" TEXT,
  "budgetMin" INTEGER,
  "budgetMax" INTEGER,
  "valueMinor" INTEGER,
  "currencyCode" TEXT NOT NULL DEFAULT 'INR',
  "lostReason" TEXT,
  "closedAt" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Lead_businessId_stage_createdAt_idx" ON "Lead"("businessId", "stage", "createdAt");
CREATE INDEX "Lead_businessId_assignedToId_createdAt_idx" ON "Lead"("businessId", "assignedToId", "createdAt");
CREATE INDEX "Lead_businessId_deletedAt_idx" ON "Lead"("businessId", "deletedAt");

CREATE TABLE "LeadTask" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "assignedToId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "type" "TaskType" NOT NULL DEFAULT 'CALL',
  "dueAt" TIMESTAMP(3) NOT NULL,
  "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadTask_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LeadTask_businessId_dueAt_status_idx" ON "LeadTask"("businessId", "dueAt", "status");
CREATE INDEX "LeadTask_businessId_assignedToId_status_idx" ON "LeadTask"("businessId", "assignedToId", "status");

CREATE TABLE "Note" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "body" VARCHAR(5000) NOT NULL,
  "type" "NoteType" NOT NULL DEFAULT 'NOTE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Note_businessId_leadId_createdAt_idx" ON "Note"("businessId", "leadId", "createdAt");

CREATE TABLE "LeadEvent" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "fromValue" TEXT,
  "toValue" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LeadEvent_businessId_leadId_createdAt_idx" ON "LeadEvent"("businessId", "leadId", "createdAt");

CREATE TABLE "Tag" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Tag_businessId_name_key" ON "Tag"("businessId", "name");

CREATE TABLE "LeadTag" (
  "leadId" TEXT NOT NULL,
  "tagId" TEXT NOT NULL,
  CONSTRAINT "LeadTag_pkey" PRIMARY KEY ("leadId", "tagId")
);

CREATE TABLE "PublicForm" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "name" TEXT NOT NULL DEFAULT 'Website enquiry',
  "publicKey" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PublicForm_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PublicForm_publicKey_key" ON "PublicForm"("publicKey");
CREATE INDEX "PublicForm_businessId_idx" ON "PublicForm"("businessId");

CREATE TABLE "FormSubmission" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "formId" TEXT,
  "leadId" TEXT,
  "externalSubmissionId" TEXT,
  "sourceDetail" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FormSubmission_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FormSubmission_businessId_externalSubmissionId_key" ON "FormSubmission"("businessId", "externalSubmissionId");
CREATE INDEX "FormSubmission_businessId_createdAt_idx" ON "FormSubmission"("businessId", "createdAt");

ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeadTask" ADD CONSTRAINT "LeadTask_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadTask" ADD CONSTRAINT "LeadTask_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Note" ADD CONSTRAINT "Note_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Note" ADD CONSTRAINT "Note_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadEvent" ADD CONSTRAINT "LeadEvent_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadEvent" ADD CONSTRAINT "LeadEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadTag" ADD CONSTRAINT "LeadTag_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadTag" ADD CONSTRAINT "LeadTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PublicForm" ADD CONSTRAINT "PublicForm_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_formId_fkey" FOREIGN KEY ("formId") REFERENCES "PublicForm"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
