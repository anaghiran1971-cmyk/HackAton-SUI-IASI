import type { ClientBazaDate } from "../conexiune.js";
import type { MesajChat } from "../../utilitare/tipuri-api.js";

export async function creeazaConversatie(db: ClientBazaDate, cheieSesiune: string): Promise<number> {
  const rows = await db`
    INSERT INTO conversatii (cheie_sesiune) VALUES (${cheieSesiune})
    RETURNING id
  `;
  return Number(rows[0].id);
}

export async function adaugaMesaje(db: ClientBazaDate, conversatieId: number, mesaje: MesajChat[]) {
  for (const m of mesaje) {
    await db`
      INSERT INTO mesaje (conversatie_id, rol, continut)
      VALUES (${conversatieId}, ${m.rol}, ${m.continut})
    `;
  }
}
