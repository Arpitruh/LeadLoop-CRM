import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Readiness must include the actual CRM schema. SELECT 1 alone passes when
 * Neon is reachable but the application's initial migration never ran.
 *
 * Deliberately avoid revealing connection strings, schema details or secrets
 * through a public health endpoint.
 */
export async function GET() {
  try {
    const rows = await prisma.$queryRaw<Array<{ schema_ready: boolean }>>`
      SELECT
        to_regclass('public."Business"') IS NOT NULL
        AND to_regclass('public."Lead"') IS NOT NULL
        AND to_regclass('public."user"') IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = '_prisma_migrations'
        ) AS schema_ready
    `;
    if (!rows[0]?.schema_ready) throw new Error("LeadLoop schema not installed");
    return NextResponse.json({ status: "ready" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
