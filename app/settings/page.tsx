import { cookies } from "next/headers";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { CITY_COOKIE, isCitySlug } from "@/lib/city";
import { ageFrom } from "@/lib/format";
import { displayName } from "@/lib/profile";
import { Gate } from "@/components/Gate";
import { NotificationPrefs } from "@/components/NotificationPrefs";
import { TaxInfoForm } from "@/components/TaxInfoForm";
import { ProfileSettings } from "@/components/settings/ProfileSettings";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { PaymentSettings, VerificationSettings } from "@/components/settings/PaymentSettings";
import { DataSettings, LogoutButton } from "@/components/settings/DataSettings";

export const metadata = { title: "Paramètres — Studeals" };

export default async function SettingsPage() {
  const session = await getSessionUser();
  if (!session) {
    return (
      <>
        <h1 className="font-display pt-4 text-3xl font-extrabold">Paramètres</h1>
        <Gate reason="login" next="/settings" />
      </>
    );
  }
  const { profile } = session;
  const raw = (await cookies()).get(CITY_COOKIE)?.value;
  const city = isCitySlug(raw) ? raw : "lille";

  const supabase = await createClient();
  const [{ data: tax }, { data: year }] = await Promise.all([
    supabase.from("seller_tax_info").select("first_name, last_name, birth_date, address, postal_code, city, tax_id").maybeSingle(),
    supabase.rpc("my_sales_year"),
  ]);
  const sales = (year as { sales_count: number; gross_amount: number; services_count: number }[] | null)?.[0];

  return (
    <div className="pb-6 pt-4">
      <h1 className="font-display text-3xl font-extrabold">Paramètres</h1>

      <ProfileSettings
        userId={profile.id}
        name={displayName(profile)}
        displayName={profile.display_name}
        avatarUrl={profile.avatar_url}
        verified={profile.is_verified}
        city={city}
      />

      <VerificationSettings verified={profile.is_verified} age={profile.birth_date ? ageFrom(profile.birth_date) : null} />

      <SecuritySettings email={profile.email} phone={profile.phone} passwordSetAt={profile.password_set_at} />

      <PaymentSettings verified={profile.is_verified} payoutsEnabled={profile.payouts_enabled} premium={profile.is_premium} />
      {profile.is_verified && (
        <div className="mt-3">
          <TaxInfoForm
            userId={profile.id}
            initial={tax ?? null}
            salesCount={Number(sales?.sales_count ?? 0)}
            gross={Number(sales?.gross_amount ?? 0)}
            servicesCount={Number(sales?.services_count ?? 0)}
          />
        </div>
      )}

      <h2 className="mx-1 mb-2 mt-7 text-[15px] font-semibold text-ink-soft">Notifications</h2>
      <NotificationPrefs userId={profile.id} emailOn={profile.notify_email} />

      <DataSettings />
      <LogoutButton />
    </div>
  );
}
