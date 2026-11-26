"use client";
import { usePathname,useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { LayoutDashboard, ContactRound, KanbanSquare, CalendarCheck2, ChartNoAxesCombined, UsersRound, Settings2, LogOut, Menu, X, ChevronDown, CirclePlus, Zap } from "lucide-react";
import { authClient } from "@/lib/auth-client";
type Space = { businessId:string; role:string; business:{name:string} };
const nav = [ {label:"Overview",to:"/dashboard",icon:LayoutDashboard}, {label:"Leads",to:"/leads",icon:ContactRound}, {label:"Pipeline",to:"/board",icon:KanbanSquare}, {label:"Follow-ups",to:"/tasks",icon:CalendarCheck2}, {label:"Reports",to:"/reports",icon:ChartNoAxesCombined}, {label:"Team",to:"/team",icon:UsersRound}, {label:"Settings",to:"/settings",icon:Settings2} ];
export default function AppShell({children,user,spaces,activeId,role,demo=false}:{children:React.ReactNode,user:{name:string,email:string},spaces:Space[],activeId:string,role:string,demo?:boolean}) {
  const pathname=usePathname(); const router=useRouter(); const [open,setOpen]=useState(false); const [switching,setSwitching]=useState(false);
  const [resetting,setResetting]=useState(false);
  const [demoError,setDemoError]=useState("");
  // Session boundaries require a fresh document, not cached private route content.
  function navigateAfterDemo(path: "/login" | "/dashboard") {
    window.location.assign(new URL(path, window.location.origin).href);
  }
  async function exitDemo() {
    setDemoError("");
    try {
      const response=await fetch("/api/demo",{method:"DELETE"});
      if(!response.ok) throw new Error("Unable to exit demo. Try again.");
      navigateAfterDemo("/login");
    } catch (cause) { setDemoError(cause instanceof Error ? cause.message : "Unable to exit demo"); }
  }
  async function resetDemo() {
    setResetting(true);setDemoError("");
    try {
      const exit=await fetch("/api/demo",{method:"DELETE"});
      if(!exit.ok) throw new Error("Unable to reset demo. Try again.");
      const start=await fetch("/api/demo",{method:"POST"});
      navigateAfterDemo(start.ok?"/dashboard":"/login");
    } catch (cause) { setDemoError(cause instanceof Error ? cause.message : "Unable to reset demo"); }
    finally { setResetting(false); }
  }
  const current=spaces.find(s=>s.businessId===activeId)||spaces[0];
  async function switchWorkspace(id:string){ setSwitching(true); const res=await fetch("/api/v1/workspace/switch",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({businessId:id})}); setSwitching(false); if(res.ok){ router.push("/dashboard");router.refresh();setOpen(false); } }
  const sidebar=<div className="h-full flex flex-col bg-white border-r border-slate-200">
    <div className="h-20 px-6 flex items-center gap-3 border-b border-slate-100"><div className="h-9 w-9 rounded-xl bg-[#0f766e] text-white flex items-center justify-center shadow-sm"><Zap fill="white" size={20}/></div><span className="heading text-[23px]">LeadLoop<span className="text-teal-600">.</span></span><button className="ml-auto lg:hidden" onClick={()=>setOpen(false)} aria-label="Close menu"><X size={20}/></button></div>
    <div className="px-4 pt-6"><p className="small-section px-3 mb-3">Workspace</p><div className="relative"><select aria-label="Select workspace" disabled={switching||demo} className="field bg-slate-50 pr-7 text-xs font-semibold appearance-none" value={activeId} onChange={e=>switchWorkspace(e.target.value)}>{spaces.map(s=><option key={s.businessId} value={s.businessId}>{s.business.name}</option>)}</select><ChevronDown size={14} className="absolute right-3 top-3.5 pointer-events-none"/></div></div>
    <nav className="flex-1 px-4 pt-7 space-y-1" aria-label="Main navigation"><p className="small-section px-3 mb-3">Your workspace</p>{nav.filter(n=>n.label!=="Team"||role==="OWNER").map(n=>{const Icon=n.icon; const selected=pathname===n.to||(n.to==="/leads"&&pathname.startsWith("/leads/"));return <Link onClick={()=>setOpen(false)} href={n.to} key={n.to} className={`flex gap-3 items-center px-3.5 h-[43px] rounded-xl text-[13px] font-semibold transition-colors ${selected?"text-teal-800 bg-[#e4f5f0]":"text-slate-600 hover:bg-slate-50"}`}><Icon size={18} strokeWidth={selected?2.2:1.8}/>{n.label}{selected&&<span className="ml-auto h-1.5 w-1.5 bg-teal-600 rounded-full"/>}</Link>})}</nav>
    <div className="px-4 pb-4">{!demo&&<Link href="/onboarding" className="flex items-center gap-2 text-xs font-bold px-3 text-teal-700 py-3"><CirclePlus size={16}/> Create another workspace</Link>}<div className="flex gap-3 border border-slate-200 rounded-xl p-3 items-center"><div className="rounded-lg h-10 w-10 bg-amber-100 text-amber-800 flex items-center justify-center font-extrabold text-sm">{user.name.slice(0,1).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate font-bold text-xs">{user.name}</p><p className="truncate text-[10px] muted">{demo?"Temporary sandbox":user.email}</p></div><button title="Log out" aria-label="Log out" onClick={async()=>{if(demo){await exitDemo();return;}await authClient.signOut();router.push("/login");router.refresh();}} className="text-slate-400 hover:text-rose-600"><LogOut size={17}/></button></div></div>
  </div>;
  return <div className="min-h-screen"><aside className="hidden lg:block fixed inset-y-0 left-0 w-[248px] z-20">{sidebar}</aside>{open&&<><div onClick={()=>setOpen(false)} className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"/><aside className="fixed inset-y-0 left-0 w-[270px] z-50 lg:hidden">{sidebar}</aside></>}
    <div className="lg:pl-[248px]"><header className="h-[76px] bg-white border-b border-slate-200 flex items-center justify-between px-5 lg:px-9 sticky top-0 z-10"><div className="flex items-center gap-4"><button aria-label="Open menu" className="lg:hidden" onClick={()=>setOpen(true)}><Menu/></button><div><p className="text-xs text-slate-400 font-semibold">Workspace <span className="mx-2">/</span> {nav.find(n=>pathname.startsWith(n.to))?.label || "CRM"}</p><p className="font-bold text-sm mt-1">{current?.business.name}</p></div></div><div className="flex items-center gap-3"><span className="hidden sm:inline-flex text-xs rounded-full bg-slate-100 px-3 py-1.5 font-bold text-slate-600">{role.toLowerCase()}</span><Link href="/leads/new" className="btn btn-primary"><CirclePlus size={16}/><span className="hidden sm:inline">New lead</span></Link></div></header>{demo&&<div role="status" className="flex flex-wrap items-center justify-between gap-3 bg-amber-50 border-b border-amber-200 px-5 lg:px-9 py-3 text-sm text-amber-900"><span><strong>Demo workspace</strong> · Sample data only. Changes expire after one hour. Email, team changes and settings are disabled.</span>{demoError&&<span role="alert" className="text-rose-700">{demoError}</span>}<button className="btn btn-secondary text-xs" disabled={resetting} onClick={resetDemo}>{resetting?"Resetting…":"Reset demo"}</button></div>}<main className="max-w-[1560px] mx-auto p-5 md:p-7 lg:p-9">{children}</main></div>
  </div>;
}
