import "server-only";

/** Envoi via l'API Resend (https://resend.com). Silencieux si non configuré. */
export async function sendEmail(to: string, subject: string, text: string, href?: string) {
  if (!process.env.RESEND_API_KEY) return;
  const url = href ? `${process.env.NEXT_PUBLIC_APP_URL}${href}` : process.env.NEXT_PUBLIC_APP_URL;
  const html = `
  <div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;padding:24px;color:#1a1b4b">
    <p style="font-weight:800;font-size:20px;margin:0 0 16px">studeals</p>
    <p style="font-size:16px;line-height:1.5">${escapeHtml(text)}</p>
    <p><a href="${url}" style="display:inline-block;background:#1a1b4b;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600">Ouvrir Studeals</a></p>
    <p style="font-size:12px;color:#55578a;margin-top:32px">Tu reçois cet email car tu as un compte Studeals.
    Gère tes préférences dans ton profil.</p>
  </div>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM ?? "Studeals <noreply@studeals.fr>", to, subject, html, text: `${text}\n\n${url}` }),
  });
  if (!res.ok) console.error("[email]", res.status, await res.text());
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
