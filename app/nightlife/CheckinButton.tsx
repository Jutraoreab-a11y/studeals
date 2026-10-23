"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function CheckinButton({ venueId, userId, going }: { venueId: string; userId: string; going: boolean }) {
  const supabase = createClient();
  const router = useRouter();
  const [on, setOn] = useState(going);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const today = new Date().toISOString().slice(0, 10);
    const { error } = on
      ? await supabase.from("nightlife_checkins").delete().eq("venue_id", venueId).eq("user_id", userId).eq("date", today)
      : await supabase.from("nightlife_checkins").insert({ venue_id: venueId, user_id: userId, date: today });
    setBusy(false);
    if (!error) { setOn(!on); router.refresh(); }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-pressed={on}
      className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${on ? "bg-sticker" : "bg-ink text-white"}`}
    >
      {on ? "J'y vais" : "J'y vais ce soir"}
    </button>
  );
}
