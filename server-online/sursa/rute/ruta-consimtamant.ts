import type { FastifyPluginAsync } from "fastify";
import { scrieAudit } from "../servicii/serviciu-audit.js";

export const rutaConsimtamant: FastifyPluginAsync = async (app) => {
  app.get("/api/consimtamant", async () => {
    return {
      scop: "Copilot AI pentru Sui (asistență, explicații, evaluare risc).",
      clarificari: [
        "Copilotul NU deține chei private și NU semnează tranzacții.",
        "Recomandările sunt suport decizional; utilizatorul confirmă în wallet.",
        "Nu reprezintă consultanță financiară sau juridică."
      ]
    };
  });

  app.post("/api/consimtamant", async (req) => {
    if (app.mediu.AUDIT_ACTIV) {
      scrieAudit({
        timp: new Date().toISOString(),
        tip: "consimtamant",
        meta: {
          ip: req.ip ?? null,
          agent: req.headers["user-agent"] ?? null
        }
      });
    }
    return { ok: true };
  });
};
