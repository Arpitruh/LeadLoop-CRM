import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireWorkspace, requireOwner } from "@/lib/tenant";
import { normalizePhone } from "@/lib/validation";
import { jsonBody, ok, fail, ApiError } from "@/lib/http";
import { requireSameOrigin } from "@/lib/origin";
const schema=z.object({name:z.string().trim().min(2).max(100).optional(),phone:z.string().max(30).nullable().optional(),email:z.union([z.email(),z.literal("")]).nullable().optional(),doNotContact:z.boolean().optional()});
type Ctx={params:Promise<{id:string}>};
export async function GET(_req:Request,{params}:Ctx){try{const c=await requireWorkspace(),{id}=await params;const contact=await prisma.contact.findFirst({where:{id,businessId:c.businessId,...(c.role==="STAFF"?{leads:{some:{assignedToId:c.user.id,deletedAt:null}}}:{})}});if(!contact)throw new ApiError(404,"NOT_FOUND","Contact not found");return ok(contact);}catch(e){return fail(e);}}
export async function PATCH(req:Request,{params}:Ctx){try{
 requireSameOrigin(req);const c=await requireWorkspace();requireOwner(c);const {id}=await params;const input=schema.parse(await jsonBody(req));
 const existing=await prisma.contact.findFirst({where:{id,businessId:c.businessId}});if(!existing)throw new ApiError(404,"NOT_FOUND","Contact not found");
 let phoneE164:undefined|string|null=undefined;if(input.phone!==undefined){try{phoneE164=normalizePhone(input.phone);}catch{throw new ApiError(400,"INVALID_PHONE","Invalid phone number");}}
 const nextPhone = phoneE164 === undefined ? existing.phoneE164 : phoneE164;
 const nextEmail = input.email === undefined ? existing.email : input.email || null;
 if(!nextPhone && !nextEmail)throw new ApiError(400,"CONTACT_REQUIRED","Phone or email required");
 const contact=await prisma.$transaction(async tx=>{const updated=await tx.contact.update({where:{id},data:{name:input.name,email:input.email===undefined?undefined:input.email||null,phoneE164,doNotContact:input.doNotContact}});const leads=await tx.lead.findMany({where:{businessId:c.businessId,contactId:id,deletedAt:null},select:{id:true}});if(leads.length)await tx.leadEvent.createMany({data:leads.map(l=>({businessId:c.businessId,leadId:l.id,actorId:c.user.id,action:"CONTACT_UPDATED"}))});return updated;});
 return ok(contact);
}catch(e){if(e&&typeof e==="object"&&"code" in e&&e.code==="P2002")return fail(new ApiError(409,"CONTACT_EXISTS","Phone is already attached to another contact"));return fail(e);}}
export async function DELETE(req:Request,{params}:Ctx){try{
 requireSameOrigin(req);const c=await requireWorkspace();requireOwner(c);const {id}=await params;
 const contact=await prisma.contact.findFirst({where:{id,businessId:c.businessId}});if(!contact)throw new ApiError(404,"NOT_FOUND","Contact not found");
 const count=await prisma.lead.count({where:{businessId:c.businessId,contactId:id}});if(count)throw new ApiError(409,"CONTACT_IN_USE","Cannot delete a contact with linked leads");
 await prisma.contact.delete({where:{id}});return ok({deleted:true});
}catch(e){return fail(e);}}
