import "server-only";
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
  appInfo: { name: "Studeals" },
});

const FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT ?? 8);

/** Montants en centimes (Stripe travaille en plus petite unité). */
export function toCents(euros: number) {
  return Math.round(euros * 100);
}

export function platformFeeCents(amountCents: number) {
  return Math.round((amountCents * FEE_PERCENT) / 100);
}

/** Récupère ou crée le Customer Stripe lié au profil. */
export async function getOrCreateCustomer(userId: string, email: string | null, existing: string | null) {
  if (existing) return existing;
  // Un compte créé par SMS peut ne pas avoir d'email : Stripe l'accepte.
  const customer = await stripe.customers.create({ email: email ?? undefined, metadata: { user_id: userId } });
  return customer.id;
}
