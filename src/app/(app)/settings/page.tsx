import { requireWorkspace } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { Heading } from "@/components/ui";
import SettingsForm from "@/components/settings-form";
export default async function SettingsPage(){const c=await requireWorkspace();const business=await prisma.business.findUniqueOrThrow({where:{id:c.businessId},include:{forms:{select:{publicKey:true,name:true,enabled:true}}}});return <><Heading title="Workspace settings" subtitle="Manage your business profile and your public enquiry link."/><SettingsForm business={business} role={c.role}/></>}
