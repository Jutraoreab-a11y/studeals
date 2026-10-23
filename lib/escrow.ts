import "server-only";
import { createHash, randomInt } from "node:crypto";

export const MAX_CODE_ATTEMPTS = 5;

/** Code à 4 chiffres, généré avec un RNG cryptographique. */
export function generateValidationCode(): string {
  return randomInt(0, 10_000).toString().padStart(4, "0");
}

/** Le hash est salé par l'id de transaction pour éviter les tables précalculées. */
export function hashCode(code: string, transactionId: string): string {
  return createHash("sha256").update(`${transactionId}:${code}`).digest("hex");
}
