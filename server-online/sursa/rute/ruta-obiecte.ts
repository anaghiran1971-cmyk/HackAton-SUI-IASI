import type { FastifyPluginAsync } from "fastify";
import { schemaObjectId } from "../utilitare/validare.js";
import { genereazaRaspunsLLM } from "../servicii/serviciu-llm.js";
import { cheiCache } from "../servicii/serviciu-chei-cache.js";
import { citesteDinCache, scrieInCache } from "../servicii/serviciu-cache.js";
import { metrici } from "../observabilitate/colector-metrici.js";

export const rutaObiecte: FastifyPluginAsync = async (app) => {
  app.post("/api/obiecte/explica", async (cerere, raspuns) => {
    metrici.explicatiiObiecte += 1;

    const validare = schemaObjectId.safeParse(cerere.body ?? {});
    if (!validare.success) {
      return raspuns.code(400).send({ eroare: "objectId invalid" });
    }

    const { objectId } = validare.data;
    const cheie = cheiCache.objExplicatie(objectId);

    const cached = await citesteDinCache<{ objectId: string; explicatie: string }>(app.cacheRedis, cheie);
    if (cached) {
      metrici.cacheHit += 1;
      return cached;
    }
    metrici.cacheMiss += 1;

    const obj = await app.suiClient.getObject({
      id: objectId,
      options: { showType: true, showOwner: true, showContent: true, showDisplay: true }
    });

    const sistem = `Ești AI Copilot pentru Sui Wallet. Explică obiectul clar în română:
- Ce tip e (NFT/coin/obiect utilitar).
- Ce înseamnă owner-ul.
- Ce atribute importante are (dacă există display).
- Avertizează dacă pare suspect (tip necunoscut, lipsă metadate).`;

    const utilizator = `Analizează obiectul (JSON):\n${JSON.stringify(obj, null, 2)}`;

    const explicatie = await genereazaRaspunsLLM({
      llmUrl: app.mediu.LLM_URL,
      model: app.mediu.LLM_MODEL,
      mesaje: [
        { rol: "sistem", continut: sistem },
        { rol: "utilizator", continut: utilizator }
      ]
    });

    const payload = { objectId, explicatie };
    await scrieInCache(app.cacheRedis, cheie, payload, 24 * 60 * 60);

    return payload;
  });
};
