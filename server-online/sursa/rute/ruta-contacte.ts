import type { FastifyPluginAsync } from "fastify";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { scrieAudit } from "../servicii/serviciu-audit.js";

const schemaContact = z.object({
  alias: z.string().min(1).max(64).regex(/^[a-z0-9_-]+$/i, "Alias invalid"),
  adresa: z.string().regex(/^0x[a-fA-F0-9]{20,}$/, "Adresă Sui invalidă")
});

type Contact = z.infer<typeof schemaContact>;

const schemaFisier = z.object({
  versiune: z.number(),
  contacte: z.array(schemaContact)
});

function caleContacte(): string {
  // sursa/date/contacte.json
  return path.join(process.cwd(), "sursa", "date", "contacte.json");
}

function citesteContacte(): { versiune: number; contacte: Contact[] } {
  const cale = caleContacte();
  const raw = fs.readFileSync(cale, "utf-8");
  const json = JSON.parse(raw);
  return schemaFisier.parse(json);
}

function scrieContacte(data: { versiune: number; contacte: Contact[] }) {
  const cale = caleContacte();
  fs.writeFileSync(cale, JSON.stringify(data, null, 2), "utf-8");
}

export const rutaContacte: FastifyPluginAsync = async (app) => {
  app.get("/api/contacte", async () => {
    const data = citesteContacte();
    // Nu returnăm altceva decât alias + adresă (safe)
    return data.contacte;
  });

  app.post("/api/contacte", async (req, reply) => {
    const body = req.body as unknown;
    const contact = schemaContact.safeParse(body);
    if (!contact.success) {
      return reply.code(400).send({ eroare: "Date contact invalide", detalii: contact.error.flatten() });
    }

    const data = citesteContacte();
    const alias = contact.data.alias.toLowerCase();

    const exista = data.contacte.find(c => c.alias.toLowerCase() === alias);
    if (exista) {
      return reply.code(409).send({ eroare: "Alias existent" });
    }

    data.contacte.push({ alias, adresa: contact.data.adresa });
    scrieContacte(data);

    if (app.mediu.AUDIT_ACTIV) {
      scrieAudit({
        timp: new Date().toISOString(),
        tip: "contacte",
        meta: { actiune: "adauga", alias }
      });
    }

    return { ok: true };
  });

  app.delete("/api/contacte/:alias", async (req, reply) => {
    const alias = (req.params as any).alias as string;
    if (!alias) return reply.code(400).send({ eroare: "Alias lipsă" });

    const data = citesteContacte();
    const inainte = data.contacte.length;
    data.contacte = data.contacte.filter(c => c.alias.toLowerCase() !== alias.toLowerCase());

    if (data.contacte.length === inainte) {
      return reply.code(404).send({ eroare: "Alias inexistent" });
    }

    scrieContacte(data);

    if (app.mediu.AUDIT_ACTIV) {
      scrieAudit({
        timp: new Date().toISOString(),
        tip: "contacte",
        meta: { actiune: "sterge", alias }
      });
    }

    return { ok: true };
  });
};
