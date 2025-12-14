// Validare pragmatică pentru Sui tx digest (Base58).
// Nu e nevoie de "perfect", doar să nu respingem digest-uri reale.
export function esteDigestTranzactieValid(digest: string): boolean {
  const d = (digest ?? "").trim();

  // Base58: fără 0,O,I,l; în practică digest-ul Sui are ~43-45 chars.
  // Îl facem ușor mai permisiv ca să nu rupem edge-case-uri.
  const reBase58 = /^[1-9A-HJ-NP-Za-km-z]{20,100}$/;

  return reBase58.test(d);
}
