export function extrageDestinatar(text: string): { alias?: string; adresa?: string } | null {
  // Adresă Sui (hex 0x...)
  const addr = text.match(/\b0x[a-f0-9]{20,}\b/i);
  if (addr?.[0]) return { adresa: addr[0] };

  // alias după "lui X" sau "catre X" normalizat ca "lui"
  const m = text.match(/\blui\s+([a-z0-9_\.:-]{2,})\b/i);
  if (m?.[1]) return { alias: m[1] };

  // fallback: dacă textul e "marcel 5 sui" (alias primul token)
  const tokens = text.split(" ").filter(Boolean);
  if (tokens.length >= 1) {
    const posibil = tokens[0];
    // dacă primul token nu e verbul "trimite" și nu e număr
    if (!["trimite", "vreau", "te", "rog"].includes(posibil) && !/^\d/.test(posibil)) {
      return { alias: posibil };
    }
  }

  return null;
}
