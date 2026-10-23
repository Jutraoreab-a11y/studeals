"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function urlB64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function NotificationPrefs({ userId, emailOn }: { userId: string; emailOn: boolean }) {
  const [pushState, setPushState] = useState<"unsupported" | "ios-install" | "off" | "on" | "denied" | "busy">("off");
  const [email, setEmail] = useState(emailOn);

  useEffect(() => {
    const ios = /iphone|ipad/i.test(navigator.userAgent);
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushState(ios && !standalone ? "ios-install" : "unsupported");
      return;
    }
    if (Notification.permission === "denied") return setPushState("denied");
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setPushState(sub ? "on" : "off"));
  }, []);

  async function enablePush() {
    setPushState("busy");
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return setPushState("denied");
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlB64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
    });
    await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
    setPushState("on");
  }

  async function disablePush() {
    setPushState("busy");
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push/subscribe", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
      await sub.unsubscribe();
    }
    setPushState("off");
  }

  async function toggleEmail() {
    const next = !email;
    setEmail(next);
    await createClient().from("users").update({ notify_email: next }).eq("id", userId);
  }

  return (
    <div className="rounded-2xl bg-white p-4">
      <p className="font-semibold">Notifications</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-sm">
          Sur ce téléphone <span className="block text-ink-soft">Ventes, messages, alertes SOS de ta ville</span>
        </span>
        {pushState === "on" ? (
          <button onClick={disablePush} className="shrink-0 rounded-full bg-trust/20 px-4 py-2 text-sm font-semibold">Activées</button>
        ) : pushState === "off" || pushState === "busy" ? (
          <button onClick={enablePush} disabled={pushState === "busy"} className="shrink-0 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">Activer</button>
        ) : null}
      </div>
      {pushState === "ios-install" && (
        <p className="mt-2 rounded-xl bg-sticker/50 p-3 text-sm">
          Sur iPhone, ajoute d&apos;abord Studeals à ton écran d&apos;accueil (Partager, puis « Sur l&apos;écran d&apos;accueil »), puis rouvre l&apos;app depuis l&apos;icône.
        </p>
      )}
      {pushState === "denied" && <p className="mt-2 text-sm text-ink-soft">Bloquées dans les réglages de ton navigateur.</p>}
      {pushState === "unsupported" && <p className="mt-2 text-sm text-ink-soft">Ton navigateur ne gère pas les notifications.</p>}
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-sm">
          Par email <span className="block text-ink-soft">Paiements, litiges, décisions de modération</span>
        </span>
        <button onClick={toggleEmail} aria-pressed={email} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${email ? "bg-trust/20" : "bg-paper"}`}>
          {email ? "Activés" : "Désactivés"}
        </button>
      </div>
    </div>
  );
}
