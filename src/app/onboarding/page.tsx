import { redirect } from "next/navigation";
import { isDemoUser } from "@/lib/demo";
import { getCurrentUser } from "@/lib/tenant";
import OnboardingForm from "@/components/onboarding-form";
export default async function Page(){const user = await getCurrentUser().catch(() => null); if (!user) redirect("/login"); if (isDemoUser(user.id)) redirect("/dashboard");return <OnboardingForm/>;}
