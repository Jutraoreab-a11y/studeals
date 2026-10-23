"use client";
import { useState } from "react";
import { Elements, ExpressCheckoutElement, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { stripePromise } from "@/lib/stripe-client";

type Props =
  | { kind: "listing"; listingId: string; amountLabel: string }
  | { kind: "gig"; gigId: string; workerId: string; amountLabel: string };

/** Tunnel d'achat : 1 tap Apple Pay / Google Pay, sinon carte. */
export function PaymentSheet(props: Props) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function start() {
    setLoading(true);
    setError(null);
    const res = await fetch(props.kind === "listing" ? "/api/payments/listing" : "/api/payments/gig", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        props.kind === "listing" ? { listingId: props.listingId } : { gigId: props.gigId, workerId: props.workerId },
      ),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error);
    setClientSecret(data.clientSecret);
    setTransactionId(data.transactionId);
  }

  if (!clientSecret) {
    return (
      <div>
        <button
          onClick={start}
          disabled={loading}
          className="w-full rounded-full bg-ink py-4 font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Préparation…" : `Payer ${props.amountLabel}`}
        </button>
        {error && <p role="alert" className="mt-2 text-sm text-signal">{error}</p>}
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        locale: "fr",
        appearance: {
          theme: "flat",
          variables: { colorPrimary: "#1a1b4b", borderRadius: "14px", fontFamily: "system-ui, sans-serif" },
        },
      }}
    >
      <PayForm transactionId={transactionId!} amountLabel={props.amountLabel} />
    </Elements>
  );
}

function PayForm({ transactionId, amountLabel }: { transactionId: string; amountLabel: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const returnUrl = `${window.location.origin}/purchases/${transactionId}`;

  async function confirm() {
    if (!stripe || !elements) return;
    setBusy(true);
    const { error } = await stripe.confirmPayment({ elements, confirmParams: { return_url: returnUrl } });
    if (error) setError(error.message ?? "Paiement refusé.");
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <ExpressCheckoutElement
        options={{ buttonHeight: 52, buttonType: { applePay: "buy", googlePay: "buy" } }}
        onConfirm={confirm}
      />
      <p className="text-center text-sm text-ink-soft">ou par carte</p>
      <PaymentElement options={{ layout: "accordion" }} />
      <button
        onClick={confirm}
        disabled={busy || !stripe}
        className="w-full rounded-full bg-ink py-4 font-semibold text-white disabled:opacity-60"
      >
        {busy ? "Paiement…" : `Payer ${amountLabel}`}
      </button>
      {error && <p role="alert" className="text-sm text-signal">{error}</p>}
      <p className="text-xs text-ink-soft">
        L&apos;argent reste bloqué chez Studeals jusqu&apos;à ce que tu donnes ton code au vendeur.
      </p>
    </div>
  );
}
