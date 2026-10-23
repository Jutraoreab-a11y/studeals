// Types métier. En prod, remplacez/complétez par `npm run db:types`
// (types générés par la CLI Supabase).
export type ListingCategory = "goods" | "room_match";
export type ListingStatus = "active" | "reserved" | "sold" | "removed";
export type GigStatus = "open" | "in_progress" | "completed" | "cancelled";
export type TransactionType = "listing" | "gig" | "subscription";
export type TransactionStatus = "pending" | "held" | "released" | "refunded" | "failed" | "disputed";

export interface City { id: string; name: string; slug: string }

export interface UserProfile {
  id: string;
  email: string | null;
  phone: string | null;
  display_name: string | null;
  password_set_at: string | null;
  deleted_at: string | null;
  city_id: string | null;
  birth_date: string | null;
  is_verified: boolean;
  avatar_url: string | null;
  is_premium: boolean;
  stripe_customer_id: string | null;
  stripe_account_id: string | null;
  payouts_enabled: boolean;
  is_admin: boolean;
  is_banned: boolean;
  notify_email: boolean;
  notify_push: boolean;
  legal_accepted_at: string | null;
  legal_version: string | null;
  created_at: string;
}

export interface Listing {
  id: string;
  seller_id: string;
  city_id: string;
  title: string;
  description: string | null;
  price: number;
  category: ListingCategory;
  subcategory: string | null;
  is_urgent: boolean;
  images: string[];
  lat: number | null;
  lng: number | null;
  status: ListingStatus;
  created_at: string;
}

export interface Gig {
  id: string;
  requester_id: string;
  worker_id: string | null;
  city_id: string;
  title: string;
  description: string | null;
  reward_amount: number;
  is_sos: boolean;
  status: GigStatus;
  created_at: string;
}

export interface Transaction {
  id: string;
  reference_id: string | null;
  type: TransactionType;
  buyer_id: string;
  seller_id: string | null;
  amount: number;
  platform_fee: number;
  stripe_payment_intent_id: string | null;
  stripe_transfer_id: string | null;
  status: TransactionStatus;
  created_at: string;
  released_at: string | null;
}
