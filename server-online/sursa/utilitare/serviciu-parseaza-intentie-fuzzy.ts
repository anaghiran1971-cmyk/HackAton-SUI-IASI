import { normalizeazaText } from "../utilitare/normalizare-text.js";
import { extrageSumaSui } from "../utilitare/extrage-suma.js";
import { extrageDestinatar } from "../utilitare/extrage-destinatar.js";

export type IntentieTransfer = {
  actiune: "transfer_sui";
  destinatar_alias: string;
  suma_sui: number;
  nota?: string;
};

export function parseazaIntentieFuzzy(prompt: string): IntentieTransfer | null {
  const t = normalizeazaText(prompt);

  // trebuie să apară un verb de intenție
  const areActiune = /\btrimite\b|\btransfer\b|\bda\b/.test(t);
  if (!areActiune) return null;

  const suma = extrageSumaSui(t);
  const dest = extrageDestinatar(t);

  if (!suma || !dest?.alias) return null;

  return {
    actiune: "transfer_sui",
    destinatar_alias: dest.alias,
    suma_sui: suma,
  };
}
