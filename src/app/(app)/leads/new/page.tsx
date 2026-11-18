import { requireWorkspace } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { Heading } from "@/components/ui";
import LeadCreateForm from "@/components/lead-create-form";
export default async function NewLeadPage(){const c=await requireWorkspace();const [m,b]=await Promise.all([prisma.membership.findMany({where:{businessId:c.businessId},include:{user:{select:{name:true}}}}),prisma.business.findUniqueOrThrow({where:{id:c.businessId}})]);return <><Heading title="Create a new lead" subtitle="Capture an opportunity, assign ownership, and plan the next step."/><LeadCreateForm currency={b.currencyCode} role={c.role} staff={m.map(x=>({userId:x.userId,name:x.user.name}))}/></>}
