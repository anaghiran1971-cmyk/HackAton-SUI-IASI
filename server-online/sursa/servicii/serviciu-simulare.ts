import type { SuiClient } from "@mysten/sui/client";

// Notă: simularea reală a unei tranzacții semnate/nesemnate depinde de payload-ul tău.
// Aici oferim un wrapper unde vei integra mai târziu “dryRunTransactionBlock”.
export async function simuleazaTranzactiePlaceholder(_client: SuiClient, _payload: unknown) {
  return {
    ok: false,
    mesaj: "Simularea nu e implementată încă. Integrează dryRunTransactionBlock când ai payload-ul de tranzacție."
  };
}
