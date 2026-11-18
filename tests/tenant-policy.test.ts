import { describe, expect, it } from "vitest";
import { canAccessLead as canAccess, visibleLeadWhere } from "../src/lib/policy";
describe("tenant boundaries",()=>{
 const lead={businessId:"business-a",assignedToId:"staff-a",deletedAt:null};
 it("owner sees leads in own business",()=>expect(canAccess({businessId:"business-a",role:"OWNER",userId:"owner-a"},lead)).toBe(true));
 it("cannot cross business even as owner",()=>expect(canAccess({businessId:"business-b",role:"OWNER",userId:"owner-b"},lead)).toBe(false));
 it("staff only sees assigned leads",()=>expect(canAccess({businessId:"business-a",role:"STAFF",userId:"staff-b"},lead)).toBe(false));
 it("archived leads are inaccessible",()=>expect(canAccess({businessId:"business-a",role:"OWNER",userId:"owner-a"},{...lead,deletedAt:new Date()})).toBe(false));
 it("every list filter includes businessId",()=>expect(visibleLeadWhere({businessId:"business-a",role:"STAFF",userId:"staff-a"})).toEqual({businessId:"business-a",assignedToId:"staff-a",deletedAt:null}));
});
