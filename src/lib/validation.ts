import { z } from "zod";
import { parsePhoneNumberFromString } from "libphonenumber-js";

export const stages = ["NEW", "CONTACTED", "QUOTE_SENT", "WON", "LOST"] as const;
export const sources = ["WEBSITE_FORM", "WHATSAPP", "INSTAGRAM", "CALL", "REFERRAL", "WALK_IN", "OTHER"] as const;
export const types = ["CALL", "EMAIL", "WHATSAPP", "VISIT", "OTHER"] as const;
const optionalText = z.string().trim().max(500).optional().or(z.literal(""));
export const createLeadSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.union([z.email().max(200), z.literal("")]).optional(),
  title: z.string().trim().min(2).max(180),
  interest: optionalText,
  source: z.enum(sources).default("OTHER"),
  sourceDetail: z.string().trim().max(100).optional(),
  assignedToId: z.string().optional().nullable(),
  valueMinor: z.number().int().min(0).max(2_000_000_000).optional().nullable(),
  dueAt: z.iso.datetime({ offset: true }).optional(),
  consent: z.boolean().optional(),
}).refine((v) => Boolean(v.phone || v.email), { message: "Phone or email is required" });
export const updateLeadSchema = z.object({
  title: z.string().trim().min(2).max(180).optional(),
  interest: optionalText,
  assignedToId: z.string().nullable().optional(),
  valueMinor: z.number().int().min(0).max(2_000_000_000).nullable().optional(),
  lostReason: z.string().trim().min(3).max(500).optional(),
});
export const stageSchema = z.object({ stage: z.enum(stages), lostReason: z.string().trim().max(500).optional(), valueMinor: z.number().int().min(0).max(2_000_000_000).optional() });
export const noteSchema = z.object({ body: z.string().trim().min(1).max(5000), type: z.enum(["NOTE", "CALL", "WHATSAPP", "VISIT"]).default("NOTE") });
export const taskSchema = z.object({ leadId: z.string(), title: z.string().trim().min(2).max(180), type: z.enum(types).default("CALL"), dueAt: z.iso.datetime({ offset: true }), assignedToId: z.string().optional() });
export const publicEnquirySchema = z.object({
  publicKey: z.string().min(10), name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(30).optional(), email: z.union([z.email(), z.literal("")]).optional(),
  interest: z.string().trim().min(2).max(300), message: z.string().trim().max(2000).optional(),
  consent: z.literal(true), website: z.string().max(200).optional(), externalSubmissionId: z.uuid().optional(),
}).refine((v) => Boolean(v.phone || v.email), { message: "Phone or email is required" });
export function normalizePhone(input?: string | null): string | null {
  if (!input?.trim()) return null;
  const parsed = parsePhoneNumberFromString(input, "IN");
  if (!parsed?.isValid()) throw new Error("Enter a valid phone number with country code");
  return parsed.number;
}
/** Convert a business-local calendar midnight to UTC, including DST transitions.
 * `Date.getTimezoneOffset()` cannot be used because it reads the server timezone. */
function localMidnightUtc(year: number, month: number, day: number, timezone: string) {
  const desired = Date.UTC(year, month - 1, day);
  let guess = desired;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  });
  for (let i = 0; i < 4; i++) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(guess)).map(p => [p.type, p.value]));
    const localAsUTC = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day),
      Number(parts.hour), Number(parts.minute), Number(parts.second));
    const delta = desired - localAsUTC;
    if (!delta) break;
    guess += delta;
  }
  return new Date(guess);
}

export function dateBounds(timezone: string, now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now).map(p => [p.type, p.value]));
  const year = Number(parts.year), month = Number(parts.month), day = Number(parts.day);
  const followingDay = new Date(Date.UTC(year, month - 1, day + 1));
  const start = localMidnightUtc(year, month, day, timezone);
  const end = localMidnightUtc(followingDay.getUTCFullYear(), followingDay.getUTCMonth() + 1,
    followingDay.getUTCDate(), timezone);
  return { start, end };
}
