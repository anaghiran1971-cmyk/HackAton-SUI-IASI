import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { metrici } from "../observabilitate/colector-metrici.js";

const schema = z.object({
  tip: z.literal("transfer_sui"),
  expeditor: z.string().min(3),
  destinatar: z.string().min(3),
  suma_sui: z.number().positive(),
});

export const rutaPrevizualizare: FastifyPluginAsync = async (app) => {
  app.post("/api/tranzactii/previzualizeaza", async (req, reply) => {
    metrici.cereriTotale += 1;

    const p = schema.safeParse(req.body);
    if (!p.success) {
      return reply.code(400).send({ eroare: "Cerere invalidă", detalii: p.error.flatten() });
    }

    // Risc determinist pe intenție (fără chain)
    const mediu = app.mediu;
    const factori = [];
    let scor = 0;

    if (p.data.suma_sui > mediu.LIMITA_TRANSFER_SUI) {
      scor += 60;
      factori.push({
        cod: "DEPASESTE_LIMITA",
        severitate: "crit",
        mesaj: `Suma (${p.data.suma_sui} SUI) depășește limita (${mediu.LIMITA_TRANSFER_SUI} SUI).`,
      });
    } else if (p.data.suma_sui >= mediu.LIMITA_TRANSFER_SUI * 0.8) {
      scor += 15;
      factori.push({
        cod: "APROAPE_LIMITA",
        severitate: "warn",
        mesaj: "Suma este aproape de limita setată.",
      });
    }

    if (mediu.SUI_RETEA?.toLowerCase() === "mainnet") {
      scor += 25;
      factori.push({ cod: "MAINNET", severitate: "warn", mesaj: "Ești pe mainnet: fonduri reale." });
    }

    if (/^0x0{10,}/i.test(p.data.destinatar)) {
      scor += 40;
      factori.push({ cod: "DESTINATAR_ZERO", severitate: "crit", mesaj: "Destinatarul pare adresa zero." });
    }

    const nivel = scor >= 60 ? "ridicat" : scor >= 25 ? "mediu" : "scazut";

    return {
      risc: { nivel, scor: Math.min(100, scor), factori },
      recomandare:
        nivel === "ridicat"
          ? "Nu recomand semnarea până nu verifici destinatarul și suma."
          : nivel === "mediu"
          ? "Verifică atent detaliile în wallet înainte de semnare."
          : "OK pentru semnare, verifică totuși destinatarul și suma.",
      disclaimer: "Analiza de risc este orientativă. Confirmarea finală este întotdeauna în wallet.",
    };
  });
};
