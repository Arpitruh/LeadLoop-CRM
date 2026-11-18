import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/tenant";
import { normalizePhone } from "@/lib/validation";
import { jsonBody, ok, fail, ApiError, paramInt } from "@/lib/http";
import { requireSameOrigin } from "@/lib/origin";
const schema = z.object({ name:z.string().trim().min(2).max(100), phone:z.string().max(30).optional(), email:z.union([z.email(),z.literal("")]).optional(), doNotContact:z.boolean().default(false) }).refine(x=>Boolean(x.phone||x.email),"Phone or email is required");
export async function GET(req:Request){try{
 const c=await requireWorkspace(),p=new URL(req.url).searchParams,page=paramInt(p.get("page"),1,10000),size=25;
 const q=p.get("q")?.trim().slice(0,100);
 const where={businessId:c.businessId,...(c.role==="STAFF"?{leads:{some:{assignedToId:c.user.id,deletedAt:null}}}:{}),...(q?{OR:[{name:{contains:q,mode:"insensitive" as const}},{email:{contains:q,mode:"insensitive" as const}},{phoneE164:{contains:q}}]}:{})};
 const [items,total]=await Promise.all([prisma.contact.findMany({where,orderBy:{createdAt:"desc"},take:size,skip:(page-1)*size}),prisma.contact.count({where})]);return ok(items,200,{page,size,total});
}catch(e){return fail(e);}}
export async function POST(req:Request){try{
 requireSameOrigin(req);const c=await requireWorkspace(),input=schema.parse(await jsonBody(req));
 let phoneE164;try{phoneE164=normalizePhone(input.phone);}catch{throw new ApiError(400,"INVALID_PHONE","Invalid phone number");}
 if(phoneE164&&await prisma.contact.findUnique({where:{businessId_phoneE164:{businessId:c.businessId,phoneE164}}}))throw new ApiError(409,"CONTACT_EXISTS","Contact with this phone already exists");
 const contact=await prisma.contact.create({data:{businessId:c.businessId,name:input.name,phoneE164,email:input.email||null,doNotContact:input.doNotContact}});return ok(contact,201);
}catch(e){if(e&&typeof e==="object"&&"code" in e&&e.code==="P2002")return fail(new ApiError(409,"CONTACT_EXISTS","Contact already exists"));return fail(e);}}
