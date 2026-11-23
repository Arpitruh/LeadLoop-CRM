import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Fail CI when a newly added private API route lacks an explicit session or
 * workspace guard. This is defense in depth, not a replacement for live 401/403
 * integration tests or a manual role/tenant authorization review.
 */
const root = join(process.cwd(), "src", "app", "api", "v1");
function routeFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? routeFiles(path) : entry.name === "route.ts" ? [path] : [];
  });
}
const publicRoutes = new Set([
  "public/enquiries/route.ts",
  "integrations/sisters-magical-spoon/route.ts",
]);
const ownerOnly = [
  "team/invitations/route.ts",
  "team/members/[id]/route.ts",
];
describe("private CRM API route authorization inventory", () => {
  it("requires an authenticated principal for every non-public v1 route", () => {
    const paths = routeFiles(root);
    expect(paths.length).toBeGreaterThan(15);
    for (const path of paths) {
      const name = relative(root, path).replaceAll("\\", "/");
      if (publicRoutes.has(name)) continue;
      const code = readFileSync(path, "utf8");
      expect(code, name + " is missing a user/workspace session check").toMatch(/\b(requireWorkspace|getCurrentUser)\s*\(/);
    }
  });
  it("keeps owner-only team routes gated", () => {
    for (const name of ownerOnly) {
      const code = readFileSync(join(root, name), "utf8");
      expect(code, name + " is missing an owner check").toMatch(/\brequireOwner\s*\(/);
    }
  });
});
