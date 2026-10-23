export const LEGAL_VERSION = "2026-10-01";

export const DISPUTE_REASONS = [
  { key: "no_show", label: "L'autre personne n'est pas venue" },
  { key: "not_as_described", label: "Pas conforme à l'annonce" },
  { key: "damaged", label: "Objet cassé ou défectueux" },
  { key: "code_not_given", label: "J'ai remis l'objet mais je n'ai pas eu le code" },
  { key: "mission_not_done", label: "Mission non réalisée" },
  { key: "other", label: "Autre problème" },
] as const;

export const REPORT_REASONS = [
  { key: "scam", label: "Arnaque ou fraude" },
  { key: "professional", label: "Vendeur professionnel ou revendeur" },
  { key: "sublet", label: "Sous-location ou reprise de bail payante" },
  { key: "illegal", label: "Objet ou service illégal" },
  { key: "harassment", label: "Harcèlement ou propos haineux" },
  { key: "inappropriate", label: "Contenu inapproprié" },
  { key: "other", label: "Autre" },
] as const;

/** Délais du séquestre (en jours). */
export const ESCROW_REMINDER_DAYS = 7;
export const ESCROW_EXPIRY_DAYS = 14;
