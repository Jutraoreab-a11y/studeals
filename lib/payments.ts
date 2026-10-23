import "server-only";
import { stripe, toCents, platformFeeCents } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Séquestre = modèle « Separate charges and transfers » de Stripe Connect :
 *  1. l'acheteur paie la PLATEFORME (les fonds restent sur le solde Studeals) ;
 *  2. à la saisie du bon code par le vendeur, on crée un Transfer vers son
 *     compte Connect (montant − commission).
 * Avantage vs capture manuelle : pas de limite d'autorisation de 7 jours.
 */
export async function createEscrowPayment(params: {
  kind: "listing" | "gig";
  referenceId: string;
  buyerId: string;
  sellerId: string;
  amountEuros: number;
  customerId: string;
  description: string;
}) {
  const amount = toCents(params.amountEuros);
  const fee = platformFeeCents(amount);

  const { data: tx, error } = await supabaseAdmin
    .from("transactions")
    .insert({
      reference_id: params.referenceId,
      type: params.kind,
      buyer_id: params.buyerId,
      seller_id: params.sellerId,
      amount: amount / 100,
      platform_fee: fee / 100,
      status: "pending",
    })
    .select("id")
    .single();
  if (error || !tx) throw new Error("transaction_insert_failed");

  const intent = await stripe.paymentIntents.create(
    {
      amount,
      currency: "eur",
      customer: params.customerId,
      description: params.description,
      // Active Apple Pay / Google Pay / CB selon le dashboard Stripe.
      automatic_payment_methods: { enabled: true },
      transfer_group: tx.id,
      metadata: {
        transaction_id: tx.id,
        kind: params.kind,
        reference_id: params.referenceId,
        seller_id: params.sellerId,
      },
    },
    { idempotencyKey: `pi-${tx.id}` },
  );

  await supabaseAdmin
    .from("transactions")
    .update({ stripe_payment_intent_id: intent.id })
    .eq("id", tx.id);

  return { clientSecret: intent.client_secret, transactionId: tx.id };
}
