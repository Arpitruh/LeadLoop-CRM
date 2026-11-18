import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export function ok<T>(data: T, status = 200, meta?: Record<string, unknown>) {
  return NextResponse.json({ data, ...(meta ? { meta } : {}) }, { status });
}
export function fail(error: unknown): NextResponse {
  if (error instanceof ApiError) return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
  if (error instanceof ZodError) return NextResponse.json({ error: { code: "VALIDATION", message: error.issues[0]?.message || "Invalid input" } }, { status: 400 });
  console.error("[API] Unexpected error", error);
  return NextResponse.json({ error: { code: "INTERNAL", message: "Something went wrong" } }, { status: 500 });
}
export async function jsonBody(req: Request): Promise<unknown> {
  const text = await req.text();
  if (text.length > 32_000) throw new ApiError(413, "TOO_LARGE", "Request body too large");
  try { return JSON.parse(text); } catch { throw new ApiError(400, "INVALID_JSON", "Expected a JSON body"); }
}
export function paramInt(value: string | null, fallback: number, max = 100) {
  const n = Number(value ?? fallback);
  return Number.isInteger(n) && n > 0 ? Math.min(n, max) : fallback;
}
