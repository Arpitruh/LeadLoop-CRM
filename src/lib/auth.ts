import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";
import { sendEmail, mailTemplate } from "@/lib/email";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 10,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail(user.email, "Reset your LeadLoop password", mailTemplate("Reset your password", "Use this secure link to choose a new password.", url), url, "password-reset");
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: false,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail(user.email, "Verify your LeadLoop email", mailTemplate("Verify your email", "Verify your address to set up your business workspace.", url), url, "verification");
    },
  },
  rateLimit: { enabled: true, window: 60, max: 10, storage: "memory" },
  plugins: [nextCookies()],
});
