import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { createDemo, endDemo, DEMO_COOKIE, DEMO_TTL, getDemoUser } from "@/lib/demo";
import { requireSameOrigin } from "@/lib/origin";
import { ApiError, fail, ok } from "@/lib/http";
import { ipForRequest, limited } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    const session = await auth.api.getSession({ headers: req.headers });
    if (session) throw new ApiError(409, "SIGNED_IN", "Sign out of your account before entering the demo.");
    const jar = await cookies();
    if (await getDemoUser(jar.get(DEMO_COOKIE)?.value)) return ok({ ready: true });
    if (limited(`demo:${ipForRequest(req)}`, 5, 600_000)) throw new ApiError(429, "RATE_LIMITED", "Please try again in a few minutes.");
    const token = await createDemo();
    const response = ok({ ready: true }, 201);
    response.cookies.set(DEMO_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: DEMO_TTL });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) { return fail(error); }
}
export async function DELETE(req: Request) {
  try {
    requireSameOrigin(req);
    await endDemo((await cookies()).get(DEMO_COOKIE)?.value);
    const response = ok({ signedOut: true });
    response.cookies.set(DEMO_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
    return response;
  } catch (error) { return fail(error); }
}
