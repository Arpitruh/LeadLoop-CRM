/** Safe live auth preflight: submits deliberately invalid signup input only.
 * Never creates an account, sends email, or sends customer credentials.
 */
const base = process.env.SMOKE_BASE_URL || "https://leadloop-crm-staging.vercel.app";
const origin = new URL(base).origin;
const checks = [
  { name:"Auth router",path:"/api/auth/ok",method:"GET" },
  { name:"Signup validation",path:"/api/auth/sign-up/email",method:"POST",body:JSON.stringify({}) },
];
let failed = false;
for(const c of checks){
  try {
    const resp = await fetch(new URL(c.path,origin),{
      method:c.method,
      headers:{"Origin":origin,"Content-Type":"application/json"},
      ...(c.body?{body:c.body}:{}),
      redirect:"manual",
      signal:AbortSignal.timeout(15000),
    });
    const raw=await resp.text();
    let data;try{data=JSON.parse(raw)}catch{data={};}
    const code=String(data.code||data.error?.code||"none");
    console.log(`${c.name}: HTTP ${resp.status}, code=${code}`);
    if(c.method==="GET" && (resp.status!==200||!data.ok))failed=true;
    if(c.method==="POST" && (resp.status===401||resp.status===403||resp.status>=500||resp.status<400))failed=true;
  }catch(e){console.error(c.name, e instanceof Error?e.message:String(e));failed=true;}
}
if(failed)process.exitCode=1;
