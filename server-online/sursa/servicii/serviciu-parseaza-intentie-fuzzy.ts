export type IntentieTransfer = {
  actiune: "transfer_sui";
  destinatar_alias: string;
  suma_sui: number;
  nota?: string;
};

function normalizareText(s: string) {
  return s
    .toLowerCase()
    .replace(/[ăâ]/g, "a")
    .replace(/î/g, "i")
    .replace(/ș/g, "s")
    .replace(/ț/g, "t")
    .replace(/\s+/g, " ")
    .trim();
}

// parser “fuzzy” determinist (tolerant la greșeli minore)
export function parseazaIntentieFuzzy(prompt: string): IntentieTransfer | null {
  const t = normalizareText(prompt);

  // acceptă variații gen: "trimite", "trimite-i", "transfera", "da-i"
  const areComanda =
    /\b(trimite|trimiti|transfera|da|da-i|da i|send|transfer)\b/.test(t);

  // detectează suma (cu , sau .)
  const mSuma = t.match(/(\d+(?:[.,]\d+)?)/);
  const suma = mSuma ? Number(mSuma[1].replace(",", ".")) : NaN;

  // detectează "sui"
  const areSui = /\b(sui)\b/.test(t);

  // alias: după "lui"/"catre"/"către"/"to"
  const mAlias = t.match(/\b(lui|catre|către|to)\s+([a-z0-9_-]{2,64})\b/);
  const alias = mAlias?.[2];

  if (!areComanda || !areSui || !alias || !Number.isFinite(suma) || suma <= 0) {
    return null;
  }

  return { actiune: "transfer_sui", destinatar_alias: alias, suma_sui: suma };
}
