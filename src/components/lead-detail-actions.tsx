"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Save, Plus, Trash2, Check, MessageCircle } from "lucide-react";
import { stages,stageName } from "@/components/ui";
type Staff={userId:string;name:string};
export default function LeadDetailActions({lead,role,staff,currencyCode}:{lead:{id:string,title:string,stage:string,interest:string|null,assignedToId:string|null,valueMinor:number|null},role:string,staff:Staff[],currencyCode:string}) {
 const router=useRouter();const [stage,setStage]=useState(lead.stage);const [title,setTitle]=useState(lead.title);const [interest,setInterest]=useState(lead.interest||"");const [assignee,setAssignee]=useState(lead.assignedToId||"");const [note,setNote]=useState("");const [noteType,setNoteType]=useState("NOTE");const [taskTitle,setTaskTitle]=useState("");const [taskDate,setTaskDate]=useState("");const [busy,setBusy]=useState("");const [message,setMessage]=useState("");const [error,setError]=useState("");
 async function call(url:string,method:string,data?:unknown){setError("");const r=await fetch(url,{method,headers:{"Content-Type":"application/json"},body:data?JSON.stringify(data):undefined});const j=await r.json();if(!r.ok)throw new Error(j.error?.message||"Request failed");return j.data;}
 async function work(action:string,cb:()=>Promise<void>){setBusy(action);setError("");setMessage("");try{await cb();setMessage("Saved successfully");router.refresh();}catch(e){setError(e instanceof Error?e.message:"Error");}finally{setBusy("");}}
 function updateStage(value:string){
   if(value===stage)return;
   const previous=stage;
   const payload:{stage:string;lostReason?:string;valueMinor?:number}={stage:value};
   if(value==="LOST"){
     const reason=window.prompt("Why was this lead lost? (required)")?.trim();
     if(!reason)return;
     payload.lostReason=reason;
   }
   if(value==="WON"&&lead.valueMinor===null){
     const amount=window.prompt(`Won amount (${currencyCode})?`);
     if(amount===null||amount.trim()===""||!Number.isFinite(Number(amount))||Number(amount)<0)return;
     payload.valueMinor=Math.round(Number(amount)*100);
   }
   setStage(value);
   work("stage",async()=>{
     try { await call(`/api/v1/leads/${lead.id}/stage`,"PATCH",payload); }
     catch(e){ setStage(previous); throw e; }
   });
 }

 return <div className="space-y-5"><div className="card p-6"><h2 className="heading text-lg mb-5">Manage this lead</h2><label className="label" htmlFor="detail-stage">Pipeline stage</label><select className="field mb-5" id="detail-stage" value={stage} onChange={e=>updateStage(e.target.value)} disabled={Boolean(busy)}>{stages.map(s=><option key={s} value={s}>{stageName[s]}</option>)}</select><label className="label" htmlFor="detail-title">Opportunity title</label><input className="field mb-4" id="detail-title" value={title} onChange={e=>setTitle(e.target.value)} maxLength={180}/><label className="label" htmlFor="detail-interest">Interest / details</label><textarea className="field mb-4" id="detail-interest" rows={3} value={interest} onChange={e=>setInterest(e.target.value)}/>{role==="OWNER"&&<><label className="label" htmlFor="detail-assignee">Assigned teammate</label><select id="detail-assignee" className="field mb-4" value={assignee} onChange={e=>setAssignee(e.target.value)}><option value="">Unassigned</option>{staff.map(s=><option key={s.userId} value={s.userId}>{s.name}</option>)}</select></>}
 <button className="btn btn-primary w-full" disabled={Boolean(busy)} onClick={()=>work("save",async()=>{await call(`/api/v1/leads/${lead.id}`,"PATCH",{title,interest,...(role==="OWNER"?{assignedToId:assignee||null}:{})});})}><Save size={16}/> Save changes</button></div>
 <div className="card p-6"><h2 className="heading text-lg mb-5">Log an interaction</h2><label className="label" htmlFor="note-type">Interaction type</label><select id="note-type" className="field mb-3" value={noteType} onChange={e=>setNoteType(e.target.value)}><option value="NOTE">General note</option><option value="CALL">Phone call</option><option value="WHATSAPP">WhatsApp</option><option value="VISIT">Visit</option></select><textarea className="field mb-3" aria-label="Interaction note" rows={3} placeholder="What happened? What's next?" value={note} onChange={e=>setNote(e.target.value)} maxLength={5000}/><button className="btn btn-secondary w-full" disabled={!note.trim()||Boolean(busy)} onClick={()=>work("note",async()=>{await call(`/api/v1/leads/${lead.id}/notes`,"POST",{body:note,type:noteType});setNote("");})}><Plus size={15}/> Add to timeline</button></div>
 <div className="card p-6"><h2 className="heading text-lg mb-5">Schedule follow-up</h2><label className="label" htmlFor="tasktitle">Task</label><input id="tasktitle" className="field mb-3" placeholder="Call about the proposal" value={taskTitle} onChange={e=>setTaskTitle(e.target.value)}/><label className="label" htmlFor="taskdate">Due date & time</label><input id="taskdate" className="field mb-4" type="datetime-local" value={taskDate} onChange={e=>setTaskDate(e.target.value)}/><button className="btn btn-secondary w-full" disabled={!taskTitle||!taskDate||Boolean(busy)} onClick={()=>work("task",async()=>{await call("/api/v1/tasks","POST",{leadId:lead.id,title:taskTitle,dueAt:new Date(taskDate).toISOString(),type:"CALL"});setTaskDate("");setTaskTitle("");})}><Plus size={15}/> Add follow-up</button></div>
 <button className="btn btn-secondary w-full" onClick={()=>{const tab=window.open("about:blank","_blank");work("whatsapp",async()=>{try{const result=await call(`/api/v1/leads/${lead.id}/whatsapp`,"POST");if(tab){tab.opener=null;tab.location.replace(result.url);}else window.location.assign(result.url);}catch(e){tab?.close();throw e;}});}} disabled={Boolean(busy)}><MessageCircle size={16}/> Open WhatsApp <ExternalLink size={13}/></button>
 {role==="OWNER"&&<button className="btn btn-danger w-full" disabled={Boolean(busy)} onClick={()=>{if(window.confirm("Archive this lead? You can restore it later with an admin operation.")){work("delete",async()=>{await call(`/api/v1/leads/${lead.id}`,"DELETE");router.push("/leads");});}}}><Trash2 size={15}/> Archive lead</button>}
 {error&&<p role="alert" className="text-sm p-3 rounded-lg bg-rose-50 text-rose-700">{error}</p>}{message&&<p role="status" className="text-xs flex gap-2 items-center text-teal-700"><Check size={15}/>{message}</p>}</div>;
}
