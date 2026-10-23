import { getSessionUser } from "@/lib/supabase/server";
import { getCurrentCity } from "@/lib/city-server";
import { Gate } from "@/components/Gate";
import { NewGigForm } from "./NewGigForm";

export default async function NewGigPage({ searchParams }: { searchParams: Promise<{ sos?: string }> }) {
  const { sos } = await searchParams;
  const next = `/gigs/new${sos ? "?sos=1" : ""}`;
  const session = await getSessionUser();
  if (!session) return <Gate reason="login" next={next} />;
  if (!session.profile.is_verified) return <Gate reason="verify" next={next} />;
  const city = await getCurrentCity();

  return (
    <div className="pt-4">
      <h1 className="font-display text-3xl font-extrabold">{sos ? "Alerte SOS" : "Demander un coup de main"}</h1>
      <NewGigForm cityId={city.id} userId={session.profile.id} defaultSos={sos === "1"} />
    </div>
  );
}
