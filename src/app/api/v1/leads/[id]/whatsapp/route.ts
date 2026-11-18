import { requireSameOrigin } from "@/lib/origin";
import { requireWorkspace, assertLeadAccess } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { ok, fail, ApiError } from "@/lib/http";
type Ctx={params:Promise<{id:string}>};
export async function POST(req:Request,{params}:Ctx){try{
    requireSameOrigin(req);const c=await requireWorkspace();const {id}=await params;const lead=await prisma.lead.findFirst({where:{id,businessId:c.businessId,deletedAt:null},include:{contact:true}});assertLeadAccess(c,lead);if(!lead!.contact.phoneE164)throw new ApiError(400,"NO_PHONE","Contact has no phone number");if(lead!.contact.doNotContact)throw new ApiError(403,"DO_NOT_CONTACT","This contact opted out of messaging");await prisma.leadEvent.create({data:{businessId:c.businessId,leadId:id,actorId:c.user.id,action:"WHATSAPP_LINK_REQUESTED"}});return ok({url:`https://wa.me/${lead!.contact.phoneE164.replace(/\D/g,"")}?text=${encodeURIComponent(`Hello ${lead!.contact.name}, following up regarding ${lead!.title}.`)}`});}catch(e){return fail(e);}}
