import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import { cookies } from "next/headers";
import { CITY_COOKIE, isCitySlug } from "@/lib/city";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { displayName, type HeaderUser } from "@/lib/profile";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { LoginProvider } from "@/components/LoginProvider";
import { RegisterSW } from "@/components/RegisterSW";
import "./globals.css";

const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", display: "swap" });
const instrument = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument", display: "swap" });

export const metadata: Metadata = {
  title: "Studeals",
  description: "Seconde main, coloc et coups de main entre 18-25 ans. Zéro pro.",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Studeals" },
};

export const viewport: Viewport = {
  themeColor: "#1a1b4b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

async function loadHeaderUser(): Promise<HeaderUser | null> {
  const session = await getSessionUser();
  if (!session) return null;
  const { profile } = session;
  const supabase = await createClient();
  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", profile.id)
    .is("read_at", null);
  return {
    name: displayName(profile),
    email: profile.email,
    avatarUrl: profile.avatar_url,
    verified: profile.is_verified,
    isAdmin: profile.is_admin,
    unread: count ?? 0,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const raw = (await cookies()).get(CITY_COOKIE)?.value;
  const city = isCitySlug(raw) ? raw : "lille";
  const user = await loadHeaderUser();

  return (
    <html lang="fr" className={`${bricolage.variable} ${instrument.variable}`}>
      <body className="font-sans antialiased min-h-dvh">
        <LoginProvider>
          <Header city={city} user={user} />
          <main className="mx-auto max-w-xl px-4 pb-28">{children}</main>
          <BottomNav />
        </LoginProvider>
        <RegisterSW />
      </body>
    </html>
  );
}
