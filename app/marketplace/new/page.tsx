import { getSessionUser } from "@/lib/supabase/server";
import { getCurrentCity } from "@/lib/city-server";
import { Gate } from "@/components/Gate";
import { NewListingForm } from "./NewListingForm";

export default async function NewListingPage() {
  const session = await getSessionUser();
  if (!session) return <Gate reason="login" next="/marketplace/new" />;
  if (!session.profile.is_verified) return <Gate reason="verify" next="/marketplace/new" />;
  const city = await getCurrentCity();

  return (
    <div className="pt-4">
      <h1 className="font-display text-3xl font-extrabold">Publier à {city.name}</h1>
      <NewListingForm cityId={city.id} userId={session.profile.id} />
    </div>
  );
}
