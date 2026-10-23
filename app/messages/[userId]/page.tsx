import { redirect } from "next/navigation";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { Gate } from "@/components/Gate";
import { TrustBadge } from "@/components/TrustBadge";
import { Thread, type Message } from "./Thread";
import { ReportButton } from "@/components/ReportButton";

export default async function ThreadPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ listing?: string; gig?: string }>;
}) {
  const { userId } = await params;
  const { listing, gig } = await searchParams;
  const session = await getSessionUser();
  if (!session) return <Gate reason="login" next={`/messages/${userId}`} />;
  if (!session.profile.is_verified) return <Gate reason="verify" next={`/messages/${userId}`} />;
  const me = session.profile.id;
  if (me === userId) redirect("/messages");

  const supabase = await createClient();
  const [{ data: msgs }, { data: other }] = await Promise.all([
    supabase
      .from("messages")
      .select("*")
      .or(`and(sender_id.eq.${me},recipient_id.eq.${userId}),and(sender_id.eq.${userId},recipient_id.eq.${me})`)
      .order("created_at", { ascending: true })
      .limit(200),
    supabase.from("public_profiles").select("is_verified").eq("id", userId).maybeSingle(),
  ]);

  await supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("recipient_id", me).eq("sender_id", userId).is("read_at", null);

  return (
    <div className="pt-4">
      <div className="flex items-center gap-2">
        <h1 className="font-display text-2xl font-extrabold">Conversation</h1>
        <TrustBadge verified={!!other?.is_verified} />
        <span className="ml-auto"><ReportButton targetType="user" targetId={userId} /></span>
      </div>
      <p className="mt-1 text-xs text-ink-soft">
        Reste sur Studeals pour payer : hors de l&apos;app, ton argent n&apos;est plus protégé.
      </p>
      <Thread
        me={me}
        other={userId}
        initial={(msgs ?? []) as Message[]}
        listingId={listing ?? null}
        gigId={gig ?? null}
      />
    </div>
  );
}
