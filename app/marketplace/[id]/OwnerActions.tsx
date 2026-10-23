"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ListingStatus } from "@/types/database";

export function OwnerActions({ listingId, status }: { listingId: string; status: ListingStatus }) {
  const supabase = createClient();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm("Supprimer cette annonce ?")) return;
    setBusy(true);
    const { error } = await supabase.from("listings").delete().eq("id", listingId);
    if (error) { alert("Suppression impossible : une vente est en cours."); setBusy(false); return; }
    router.replace("/account");
  }

  if (status !== "active") {
    return (
      <a href="/account" className="block rounded-full bg-ink py-4 text-center font-semibold text-white">
        Voir la vente en cours
      </a>
    );
  }

  return (
    <button onClick={remove} disabled={busy} className="w-full rounded-full border-2 border-signal py-4 font-semibold text-signal">
      Supprimer l&apos;annonce
    </button>
  );
}
