"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type Message = { id: string; sender_id: string; recipient_id: string; body: string; created_at: string };

export function Thread({
  me, other, initial, listingId, gigId,
}: { me: string; other: string; initial: Message[]; listingId: string | null; gigId: string | null }) {
  const supabase = useRef(createClient()).current;
  const [messages, setMessages] = useState(initial);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [messages]);

  useEffect(() => {
    const channel = supabase
      .channel(`dm-${me}-${other}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `recipient_id=eq.${me}` },
        (p) => {
          const m = p.new as Message;
          if (m.sender_id === other) setMessages((prev) => [...prev, m]);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, me, other]);

  async function send() {
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("messages")
      .insert({ sender_id: me, recipient_id: other, body: text, listing_id: listingId, gig_id: gigId })
      .select("*")
      .single();
    setBusy(false);
    if (!error && data) { setMessages((p) => [...p, data as Message]); setBody(""); }
  }

  return (
    <>
      <ul className="mt-4 space-y-2 pb-24">
        {messages.map((m) => {
          const mine = m.sender_id === me;
          return (
            <li key={m.id} className={`flex ${mine ? "justify-end" : ""}`}>
              <p className={`max-w-[80%] whitespace-pre-line rounded-2xl px-4 py-2.5 ${mine ? "bg-ink text-white" : "bg-white"}`}>
                {m.body}
              </p>
            </li>
          );
        })}
        <div ref={end} />
      </ul>
      <div className="fixed inset-x-0 bottom-14 z-20 border-t border-ink/10 bg-paper pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-xl gap-2 px-4 py-3">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ton message"
            aria-label="Ton message"
            className="flex-1 rounded-full bg-white px-4 py-3 focus:outline-2 focus:outline-ink"
          />
          <button onClick={send} disabled={busy || !body.trim()} className="rounded-full bg-ink px-5 font-semibold text-white disabled:opacity-50">
            Envoyer
          </button>
        </div>
      </div>
    </>
  );
}
