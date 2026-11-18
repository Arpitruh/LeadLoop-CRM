import { requireWorkspace } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { visibleLeadWhere } from "@/lib/lead-service";
import { Heading } from "@/components/ui";
import KanbanBoard from "@/components/kanban-board";
export default async function BoardPage(){const c=await requireWorkspace();const [leads,business]=await Promise.all([prisma.lead.findMany({where:visibleLeadWhere(c.businessId,c.user.id,c.role),select:{id:true,title:true,stage:true,valueMinor:true,contact:{select:{name:true}}},orderBy:{createdAt:"desc"},take:250}),prisma.business.findUniqueOrThrow({where:{id:c.businessId}})]);return <><Heading title="Sales pipeline" subtitle="Move opportunities forward, one conversation at a time."/><KanbanBoard initial={leads} currency={business.currencyCode}/></>}
