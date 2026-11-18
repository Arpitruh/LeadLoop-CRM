import { describe, expect, it } from "vitest";
import { createLeadSchema, normalizePhone, publicEnquirySchema, stageSchema, dateBounds } from "../src/lib/validation";
describe("input validation",()=>{
  it("normalizes Indian phone numbers to E.164",()=>expect(normalizePhone("9876543210")).toBe("+919876543210"));
  it("requires either email or phone for a lead",()=>expect(createLeadSchema.safeParse({name:"Test User",title:"Office plan"}).success).toBe(false));
  it("accepts a valid public enquiry",()=>expect(publicEnquirySchema.safeParse({publicKey:"abcdefghijklmnop",name:"Test User",phone:"9876543210",interest:"Meal plan",consent:true}).success).toBe(true));
  it("rejects enquiry without consent",()=>expect(publicEnquirySchema.safeParse({publicKey:"abcdefghijklmnop",name:"Test User",phone:"9876543210",interest:"Meal plan"}).success).toBe(false));
  it("requires supported stages",()=>expect(stageSchema.safeParse({stage:"CANCELLED"}).success).toBe(false));
  it("handles spring-forward DST day in New York", () => {
    const { start, end } = dateBounds("America/New_York", new Date("2026-03-08T18:00:00Z"));
    expect(start.toISOString()).toBe("2026-03-08T05:00:00.000Z");
    expect(end.toISOString()).toBe("2026-03-09T04:00:00.000Z");
  });
  it("handles fall-back DST day in New York", () => {
    const { start, end } = dateBounds("America/New_York", new Date("2026-11-01T18:00:00Z"));
    expect(start.toISOString()).toBe("2026-11-01T04:00:00.000Z");
    expect(end.toISOString()).toBe("2026-11-02T05:00:00.000Z");
  });
  it("uses local midnight for India",()=>expect(dateBounds("Asia/Kolkata",new Date("2026-11-17T20:00:00.000Z")).start.toISOString()).toBe("2026-11-17T18:30:00.000Z"));
});
