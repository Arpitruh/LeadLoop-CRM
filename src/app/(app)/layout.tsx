import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import AppShell from "@/components/app-shell";
export default async function WorkspaceLayout({children}:{children:React.ReactNode}) {
  let user;
  try { user=await getCurrentUser(); } catch { redirect("/login"); }
  const spaces=await prisma.membership.findMany({where:{userId:user.id},include:{business:{select:{name:true}}},orderBy:{createdAt:"asc"}});
  if (!spaces.length) redirect("/onboarding");
  const selected=(await cookies()).get("ll_workspace")?.value;
  const active=spaces.find(s=>s.businessId===selected)||spaces[0];
  return <AppShell user={{name:user.name,email:user.email}} spaces={spaces.map(s=>({businessId:s.businessId,role:s.role,business:s.business}))} activeId={active.businessId} role={active.role}>{children}</AppShell>;
}
