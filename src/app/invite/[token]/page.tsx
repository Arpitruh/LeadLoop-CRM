import InviteAccept from "@/components/invite-accept";
export default async function Page({params}:{params:Promise<{token:string}>}){const {token}=await params;return <InviteAccept token={token}/>}
