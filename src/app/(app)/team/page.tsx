import { notFound } from "next/navigation";
import { requireWorkspace } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { Heading } from "@/components/ui";
import TeamPanel from "@/components/team-panel";
export default async function TeamPage(){const c=await requireWorkspace();if(c.role!=="OWNER")notFound();const [members,invitations]=await Promise.all([prisma.membership.findMany({where:{businessId:c.businessId},include:{user:{select:{id:true,name:true,email:true}}},orderBy:{createdAt:"asc"}}),prisma.invitation.findMany({where:{businessId:c.businessId},select:{id:true,invitedEmail:true,acceptedAt:true,expiresAt:true},orderBy:{createdAt:"desc"},take:50})]);return <><Heading title="Team & invitations" subtitle="Keep your team in sync, without mixing access across businesses."/><TeamPanel members={members} invitations={invitations} selfId={c.user.id}/></>}
