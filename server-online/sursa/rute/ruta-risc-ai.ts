import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { evalueazaRiscCuAI } from "../servicii/serviciu-risc-ai.js";

const schema = z.object({
  tip: z.enum(["transfer_sui", "token", "nft"]),
  expeditor: z.string().optional(),
  destinatar: z.string().optional(),
  suma_sui: z.number().optional(),
  asset: z
    .object({
      tip: z.enum(["token", "nft"]),
      simbol: z.string().optional(),
      nume: z.string().optional(),
      objectId: z.string().optional(),
      pachet: z.string().optional(),
      modul: z.string().optional(),
      functie: z.string().optional(),
      pret_sui: z.number().optional(),
      sursa: z.string().optional(),
    })
    .optional(),
  context: z
    .object({
      retea: z.string().optional(),
      prima_interactiune: z.boolean().optional(),
      suma_mare: z.boolean().optional(),
      destinatar_necunoscut: z.boolean().optional(),
      proiect_necunoscut: z.boolean().optional(),
      lipsa_metadate: z.boolean().optional(),
    })
    .optional(),
});

export const rutaRiscAi: FastifyPluginAsync = async (app) => {
  app.post("/api/risc/evalueaza", async (req, reply) => {
    const p = schema.safeParse(req.body);
    if (!p.success) {
      return reply.code(400).send({
        eroare: "Cerere invalidă",
        detalii: p.error.flatten(),
      });
    }

    const data = p.data;

    // -------------------------
    // 1) CONTEXT calculat server-side (mai “trustworthy” decât din UI)
    // -------------------------
    const contextCalculat = {
      ...data.context,
      retea: app.mediu.SUI_RETEA,
      // semnale simple (poți rafina ulterior cu DB + istoric)
      lipsa_metadate:
        data.tip !== "transfer_sui"
          ? (!data.asset?.pachet && !data.asset?.objectId)
          : data.context?.lipsa_metadate,
      suma_mare:
        data.tip === "transfer_sui"
          ? typeof data.suma_sui === "number" && data.suma_sui > app.mediu.LIMITA_TRANSFER_SUI
          : data.context?.suma_mare,
    };

    // -------------------------
    // 2) HARD RAILS (nu negociem cu AI)
    //    dacă depășește limita => RIDICAT, direct
    // -------------------------
    if (data.tip === "transfer_sui") {
      const suma = data.suma_sui ?? 0;
      const limita = app.mediu.LIMITA_TRANSFER_SUI;

      if (!(suma > 0)) {
        return reply.code(400).send({ eroare: "suma_sui invalidă" });
      }

      if (!data.destinatar) {
        return reply.code(400).send({ eroare: "destinatar lipsă" });
      }

      if (suma > limita) {
        return {
          risc: {
            nivel: "ridicat" as const,
            scor: 90,
            factori: [
              {
                cod: "DEPASESTE_LIMITA",
                severitate: "crit" as const,
                mesaj: `Suma (${suma} SUI) depășește limita de siguranță (${limita} SUI).`,
              },
            ],
            recomandare:
              "Blocare automată (safe-by-default). Scade suma sau mărește limita doar dacă ești sigur.",
          },
          disclaimer:
            "Copilotul evaluează riscul și explică. Nu este consultanță financiară. Confirmarea finală este întotdeauna în wallet.",
        };
      }
    }

    // -------------------------
    // 3) AI RISK (doar după rails)
    // -------------------------
    const rezultat = await evalueazaRiscCuAI({
      llmUrl: app.mediu.LLM_URL,
      model: app.mediu.LLM_MODEL,
      cerere: {
        ...data,
        context: contextCalculat,
      },
      safeMode: app.mediu.SAFE_MODE,
    });

    return {
      risc: rezultat,
      disclaimer:
        "Copilotul evaluează riscul și explică. Nu este consultanță financiară. Confirmarea finală este întotdeauna în wallet.",
    };
  });
};
