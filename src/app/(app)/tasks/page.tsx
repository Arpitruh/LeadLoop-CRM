import { requireWorkspace } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { Heading } from "@/components/ui";
import TasksList from "@/components/tasks-list";
export default async function TasksPage(){const c=await requireWorkspace();const [tasks,business]=await Promise.all([prisma.leadTask.findMany({where:{businessId:c.businessId,lead:{deletedAt:null,...(c.role==="STAFF"?{assignedToId:c.user.id}:{})},...(c.role==="STAFF"?{assignedToId:c.user.id}:{})},include:{lead:{select:{title:true,contact:{select:{name:true}}}}},orderBy:{dueAt:"asc"},take:250}),prisma.business.findUniqueOrThrow({where:{id:c.businessId}})]);return <><Heading title="Follow-up tasks" subtitle="Stay close to every customer, without letting deadlines slip."/><TasksList initial={tasks} timezone={business.timezone}/></>}
