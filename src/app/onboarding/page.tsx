import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/tenant";
import OnboardingForm from "@/components/onboarding-form";
export default async function Page(){try { await getCurrentUser(); } catch {redirect("/login");}return <OnboardingForm/>;}
