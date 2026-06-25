import { en, es } from "./messages";
import type { Locale, Messages } from "./types";

export type { HowToStep, Locale, Messages } from "./types";
export { en, es } from "./messages";

export const messages: Record<Locale, Messages> = { es, en };

export function getMessages(locale: Locale): Messages {
  return messages[locale];
}

/** Default Spanish messages for server metadata */
export const t = es;
