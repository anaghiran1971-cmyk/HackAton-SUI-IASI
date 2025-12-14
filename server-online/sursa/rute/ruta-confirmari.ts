import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  emiteTokenConfirmare,
  valideazaSiConsumaToken,
  type PayloadConfirmare,
} from "../servicii/serviciu-token-confirmare.js";

const schemaEmitere = z.object({
  tip: z.literal("transfer_sui"),
  expeditor: z.string().min(3),
  destinatar: z.string().min(3),
  suma_sui: z.number().positive(),
});

const schemaConsuma = z.object({
  token: z.string().min(10),
  tip: z.literal("transfer_sui"),
  expeditor: z.string().min(3),
  destinatar: z.string().min(3),
  suma_sui: z.number().positive(),
});

export const rutaConfirmari: FastifyPluginAsync = async (app) => {
  app.post("/api/confirmari/emite", async (req, reply) => {
    const p = schemaEmitere.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ eroare: "Cerere invalidă", detalii: p.error.flatten() });

    const mediu = app.mediu;

    // Limită sumă (server-side, obligatoriu)
    if (p.data.suma_sui > mediu.LIMITA_TRANSFER_SUI) {
      return reply.code(403).send({
        eroare: "Depășește limita de siguranță",
        detalii: `Suma cerută (${p.data.suma_sui} SUI) > limita (${mediu.LIMITA_TRANSFER_SUI} SUI).`,
      });
    }

    const payload: PayloadConfirmare = {
      tip: "transfer_sui",
      expeditor: p.data.expeditor,
      destinatar: p.data.destinatar,
      suma_sui: p.data.suma_sui,
    };

    const { token, expiraLa } = await emiteTokenConfirmare(
      app.cacheRedis,
      payload,
      mediu.CONFIRMARE_TTL_SEC
    );

    return {
      token,
      expira_la: new Date(expiraLa).toISOString(),
      disclaimer: "Tokenul este one-time și expiră. Confirmarea finală rămâne în wallet.",
      meta: { redis: !!app.cacheRedis },
    };
  });

  app.post("/api/confirmari/consuma", async (req, reply) => {
    const p = schemaConsuma.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ eroare: "Cerere invalidă", detalii: p.error.flatten() });

    const mediu = app.mediu;

    const payload: PayloadConfirmare = {
      tip: "transfer_sui",
      expeditor: p.data.expeditor,
      destinatar: p.data.destinatar,
      suma_sui: p.data.suma_sui,
    };

    const rez = await valideazaSiConsumaToken(
      app.cacheRedis,
      p.data.token,
      payload,
      mediu.CONFIRMARE_TTL_SEC
    );

    if (!rez.ok) return reply.code(403).send({ eroare: "Confirmare respinsă", detalii: rez.motiv });

    return { ok: true };
  });
};
