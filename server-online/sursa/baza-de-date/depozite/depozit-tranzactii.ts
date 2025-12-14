import type { ClientBazaDate } from "../conexiune.js";

export async function salveazaAnalizaTranzactie(db: ClientBazaDate, input: {
  digest: string;
  retea: string;
  rezumat?: string;
  scorRisc?: number;
  nivelRisc?: string;
}) {
  await db`
    INSERT INTO tranzactii_analizate (digest, retea, rezumat, scor_risc, nivel_risc)
    VALUES (${input.digest}, ${input.retea}, ${input.rezumat ?? null}, ${input.scorRisc ?? null}, ${input.nivelRisc ?? null})
    ON CONFLICT (digest) DO UPDATE
      SET rezumat = EXCLUDED.rezumat,
          scor_risc = EXCLUDED.scor_risc,
          nivel_risc = EXCLUDED.nivel_risc
  `;
}
