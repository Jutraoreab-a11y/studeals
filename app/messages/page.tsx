import Link from "next/link";
import { Gate } from "@/components/Gate";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/format";

export default async function InboxPage() {
  const session = await getSessionUser();
  if (!session) return <Gate reason="login" next="/messages" message="Retrouve tes conversations avec les vendeurs et les acheteurs. Tu restes sur cette page." />;
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_conversations");
  const convs = (data ?? []) as { other_id: string; last_body: string; last_at: string; unread: number }[];

  return (
    <div className="pt-4">
      <h1 className="font-display text-3xl font-extrabold">Messages</h1>
      {convs.length === 0 ? (
        <p className="mt-10 text-center text-ink-soft">Aucune conversation. Écris depuis une annonce ou une mission.</p>
      ) : (
        <ul className="mt-5 divide-y divide-ink/10 rounded-2xl bg-white">
          {convs.map((c) => (
            <li key={c.other_id}>
              <Link href={`/messages/${c.other_id}`} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className={`truncate ${c.unread ? "font-semibold" : "text-ink-soft"}`}>{c.last_body}</p>
                  <p className="text-xs text-ink-soft">{timeAgo(c.last_at)}</p>
                </div>
                {c.unread > 0 && (
                  <span className="rounded-full bg-signal px-2 py-0.5 text-xs font-bold text-white">{c.unread}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
