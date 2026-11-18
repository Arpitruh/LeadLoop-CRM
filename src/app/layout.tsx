import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "LeadLoop | Every lead, one place", description: "A focused CRM for small businesses: manage enquiries, follow-ups, and your sales pipeline." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
