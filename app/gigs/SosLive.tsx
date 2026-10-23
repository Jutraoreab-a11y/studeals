"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Incoming = { id: string; title: string; reward_amount: number; is_sos: boolean };

/** Diffusion temps réel : toute nouvelle mission SOS de la ville apparaît instantanément. */
export function SosLive({ cityId }: { cityId: string }) {
  const router = useRouter();
  const [sos, setSos] = useState<Incoming | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`gigs-${cityId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "gigs", filter: `city_id=eq.${cityId}` },
        (payload) => {
          const g = payload.new as Incoming;
          if (g.is_sos) {
            setSos(g);
            if ("vibrate" in navigator) navigator.vibrate?.([120, 60, 120]);
          }
          router.refresh();
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [cityId, router]);

  if (!sos) return null;
  return (
    <div role="alert" className="fixed inset-x-4 top-20 z-40 mx-auto max-w-xl rounded-2xl bg-ink p-4 text-white shadow-lg">
      <p className="text-sm font-semibold text-sticker">Nouvelle alerte SOS</p>
      <p className="mt-1 font-semibold">{sos.title}</p>
      <div className="mt-3 flex gap-2">
        <Link href={`/gigs/${sos.id}`} className="flex-1 rounded-full bg-sticker py-2.5 text-center font-semibold text-ink">
          Je regarde
        </Link>
        <button onClick={() => setSos(null)} className="rounded-full px-4 py-2.5 text-white/80">Fermer</button>
      </div>
    </div>
  );
}
