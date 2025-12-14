import type { FastifyPluginAsync } from "fastify";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

const schemaCerere = z.object({
  alias: z.string().min(1).max(64)
});

const schemaFisier = z.object({
  versiune: z.number(),
  contacte: z.array(z.object({
    alias: z.string(),
    adresa: z.string()
  }))
});

function caleContacte(): string {
  return path.join(process.cwd(), "sursa", "date", "contacte.json");
}

export const rutaRezolvaContact: FastifyPluginAsync = async (app) => {
  app.post("/api/contacte/rezolva", async (req, reply) => {
    const cerere = schemaCerere.safeParse(req.body);
    if (!cerere.success) {
      return reply.code(400).send({ eroare: "Alias invalid", detalii: cerere.error.flatten() });
    }

    const cale = caleContacte();
    const raw = fs.readFileSync(cale, "utf-8");
    const json = schemaFisier.parse(JSON.parse(raw));

    const aliasCautat = cerere.data.alias.toLowerCase();
    const gasit = json.contacte.find(c => c.alias.toLowerCase() === aliasCautat);

    if (!gasit) {
      return reply.code(404).send({
        eroare: "Contact inexistent",
        sugestie: "Adaugă contactul în /api/contacte sau în sursa/date/contacte.json"
      });
    }

    return { alias: gasit.alias, adresa: gasit.adresa };
  });
};
