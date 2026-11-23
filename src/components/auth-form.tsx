"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, LockKeyhole, Mail, UserRound } from "lucide-react";
import { authClient } from "@/lib/auth-client";
type Mode="login"|"signup"|"forgot"|"reset";
export default function AuthForm({mode}:{mode:Mode}) {
  const router=useRouter(), params=useSearchParams();
  const [name,setName]=useState(""); const [email,setEmail]=useState(""); const [password,setPassword]=useState("");
  const [loading,setLoading]=useState(false); const [message,setMessage]=useState(""); const [error,setError]=useState("");
  const [resending,setResending]=useState(false); const [resendRequested,setResendRequested]=useState(false);
  const title={login:"Welcome back",signup:"Create your workspace",forgot:"Reset your password",reset:"Choose a new password"}[mode];
  const description={login:"Pick up every conversation where you left it.",signup:"A calmer way to manage every opportunity.",forgot:"We'll email you a secure reset link.",reset:"Use at least 10 characters for your new password."}[mode];
  async function submit(e:React.FormEvent){ e.preventDefault();setError("");setMessage("");setLoading(true);
    try {
      if(mode==="signup"){
        const r=await authClient.signUp.email({name,email,password,callbackURL:"/login"});
        if(r.error) throw new Error(r.error.message||"Could not sign up");
        setMessage("Account created. A verification email has been requested. If it does not arrive, use Resend verification email on the login page.");
      } else if(mode==="login"){
        const r=await authClient.signIn.email({email,password});
        if(r.error) {
          if(r.error.code==="EMAIL_NOT_VERIFIED") throw new Error("Your email is not verified. Use Resend verification email below; check your inbox and spam folder.");
          throw new Error(r.error.message||"Login failed. Check your credentials and email verification.");
        }
        router.push(params.get("next")?.startsWith("/") && !params.get("next")?.startsWith("//") ? params.get("next")! : "/dashboard");router.refresh();
      } else if(mode==="forgot"){
        const r=await authClient.requestPasswordReset({email,redirectTo:`${window.location.origin}/reset-password`});
        if(r.error) throw new Error(r.error.message||"Could not send link");
        setMessage("If an account exists for this email, a reset link has been sent.");
      } else {
        const token=params.get("token"); if(!token) throw new Error("This reset link is missing its token.");
        const r=await authClient.resetPassword({newPassword:password,token});
        if(r.error) throw new Error(r.error.message||"Reset failed");
        setMessage("Password updated. You can now log in.");
      }
    } catch(e){ setError(e instanceof Error?e.message:"Something went wrong"); }
    finally {setLoading(false);}
  }
  async function resendVerification() {
    if (!email.trim() || resending || resendRequested) return;
    setError(""); setMessage(""); setResending(true);
    try {
      const response = await authClient.sendVerificationEmail({ email: email.trim(), callbackURL: "/login" });
      if (response.error) throw new Error(response.error.message || "Could not request a verification email");
      // A successful API response is not proof that an email reached an inbox.
      setResendRequested(true);
      setMessage("Verification email requested. Check your inbox and spam folder. Delivery may take a moment.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not request a verification email");
    } finally { setResending(false); }
  }
  return <main className="auth-grid min-h-screen grid lg:grid-cols-2"><div className="hidden lg:flex flex-col justify-between bg-[#103f3c] text-white p-16"><Link href="/" className="heading text-3xl">✦ LeadLoop.</Link><div><span className="pill bg-white/10 text-teal-100">FOCUS ON WHAT MATTERS</span><h2 className="heading text-[54px] leading-tight mt-5">Less admin.<br/>More meaningful<br/><span className="text-[#8be1c2]">conversations.</span></h2><p className="text-teal-100/75 mt-6 leading-relaxed max-w-sm">Keep leads moving, follow up on time, and win more relationships — one workspace for your whole team.</p></div><p className="text-sm text-teal-100/60">LeadLoop CRM · Built for focused teams</p></div><div className="flex flex-col items-center justify-center px-5 py-16"><div className="w-full max-w-[410px]"><Link href="/" className="lg:hidden heading text-2xl text-teal-800 block mb-10">✦ LeadLoop.</Link><span className="pill bg-teal-100 text-teal-800">YOUR CRM STARTS HERE</span><h1 className="heading text-4xl mt-5">{title}</h1><p className="text-sm muted mt-3 mb-9">{description}</p><form onSubmit={submit} className="space-y-5">{mode==="signup"&&<div><label className="label" htmlFor="name">Full name</label><div className="relative"><UserRound className="absolute left-3 top-3 text-slate-400" size={18}/><input className="field pl-11" id="name" required value={name} onChange={e=>setName(e.target.value)} placeholder="Your name"/></div></div>}{mode!=="reset"&&<div><label className="label" htmlFor="email">Email address</label><div className="relative"><Mail className="absolute left-3 top-3 text-slate-400" size={18}/><input className="field pl-11" id="email" type="email" required value={email} onChange={e=>{setEmail(e.target.value);setResendRequested(false);}} placeholder="you@company.com"/></div></div>}{mode!=="forgot"&&<div><div className="flex justify-between"><label className="label" htmlFor="password">{mode==="reset"?"New password":"Password"}</label>{mode==="login"&&<Link href="/forgot-password" className="text-xs font-bold text-teal-700">Forgot password?</Link>}</div><div className="relative"><LockKeyhole className="absolute left-3 top-3 text-slate-400" size={18}/><input className="field pl-11" id="password" type="password" required minLength={mode==="login"?1:10} value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••••"/></div></div>}{error&&<p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}{message&&<p role="status" className="rounded-xl bg-teal-50 p-3 text-sm text-teal-800">{message}</p>}<button disabled={loading} className="btn btn-primary w-full py-3.5">{loading?"Please wait…":mode==="login"?"Sign in":mode==="signup"?"Create account":mode==="forgot"?"Email reset link":"Update password"}<ArrowRight size={17}/></button>{mode==="login"&&<button type="button" className="w-full text-sm font-semibold text-teal-700 hover:underline disabled:opacity-50" disabled={!email.trim()||loading||resending||resendRequested} onClick={resendVerification}>{resending?"Requesting email…":resendRequested?"Verification email requested":"Resend verification email"}</button>}</form><p className="text-center text-sm muted mt-8">{mode==="signup"?"Already have an account? ":"New to LeadLoop? "}<Link className="text-teal-700 font-bold" href={mode==="signup"?"/login":"/signup"}>{mode==="signup"?"Sign in":"Create an account"}</Link></p></div></div></main>;
}
