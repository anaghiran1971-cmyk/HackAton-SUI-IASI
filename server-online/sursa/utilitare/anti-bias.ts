const termeniPromo = [
  "buy", "cumpără", "pump", "moon", "garantat", "100x",
  "asigură profit", "profit garantat", "cel mai bun token",
  "folosește neapărat", "partener", "affiliate", "referral"
];

export function detecteazaPromo(text: string): boolean {
  const t = text.toLowerCase();
  return termeniPromo.some(k => t.includes(k));
}

export function politicaNeutralitate(): string {
  return [
    "Politică anti-bias:",
    "- Nu recomanda tokeni sau servicii ca investiție.",
    "- Nu promova parteneri, linkuri sau oferte.",
    "- Oferă criterii de verificare, riscuri, pași concreți.",
    "- Dacă utilizatorul cere «ce să cumpăr», răspunde educațional + avertisment."
  ].join("\n");
}
