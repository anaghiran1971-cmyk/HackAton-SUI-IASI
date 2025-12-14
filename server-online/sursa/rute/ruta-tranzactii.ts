import type { FastifyPluginAsync } from "fastify";
import { genereazaRaspunsLLM } from "../servicii/serviciu-llm.js";
import { cheiCache } from "../servicii/serviciu-chei-cache.js";
import { citesteDinCache, scrieInCache } from "../servicii/serviciu-cache.js";
import { metrici } from "../observabilitate/colector-metrici.js";
import { salveazaAnalizaTranzactie } from "../baza-de-date/depozite/depozit-tranzactii.js";
import { esteDigestTranzactieValid } from "../utilitare/validari.js";
import { construiesteAnalizaDeterminista } from "../servicii/serviciu-analiza-tranzactie.js";

type CorpExplica = { txDigest?: string; digest?: string };

function pareEngleza(text: string) {
  const t = (text ?? "").trim().toLowerCase();
  return t.startsWith("ok.") || t.includes("here's") || t.includes("this transaction");
}

export const rutaTranzactii: FastifyPluginAsync = async (app) => {
  app.post("/api/tranzactii/explica", async (cerere, raspuns) => {
    metrici.explicatiiTranzactii += 1;

    const body = (cerere.body ?? {}) as CorpExplica;
    const txDigest = String(body.txDigest ?? body.digest ?? "").trim();

    if (!txDigest || !esteDigestTranzactieValid(txDigest)) {
      return raspuns.code(400).send({ eroare: "txDigest invalid" });
    }

    const cheie = cheiCache.txExplicatie(txDigest);

    const cached = await citesteDinCache<{ txDigest: string; explicatie: string; rezumat?: string }>(
      app.cacheRedis,
      cheie
    );

    if (cached) {
      metrici.cacheHit += 1;
      return cached;
    }
    metrici.cacheMiss += 1;

    const tx = await app.suiClient.getTransactionBlock({
      digest: txDigest,
      options: {
        showInput: true,
        showEffects: true,
        showEvents: true,
        showObjectChanges: true,
        showBalanceChanges: true,
      },
    });

    // Analiză numerică deterministă (unități corecte)
    const analiza = construiesteAnalizaDeterminista({
      tx,
      retea: app.mediu.SUI_RETEA,
      limitaTransferSui: app.mediu.LIMITA_TRANSFER_SUI,
    });

    // IMPORTANT: trimitem către LLM doar sumarul determinist, nu raw amounts
    const sistem = `Ești AI Copilot pentru Sui Wallet.
Răspunde STRICT în română.
NU calcula sume. NU inventa numere. Folosește DOAR câmpurile primite în rezumatul determinist.
Format:
1) Ce s-a întâmplat (pe pași).
2) Schimbări de balanță (pe scurt).
3) Obiecte create/modificate/șterse (dacă sunt evidente).
4) Fees/gas + status.
5) Riscuri posibile (rezumă factorii primiți).
La final: REZUMAT (1-2 rânduri).`;

    const utilizator = `Rezumat determinist (unități deja corecte):\n${JSON.stringify(analiza, null, 2)}`;

    let explicatie = await genereazaRaspunsLLM({
      llmUrl: app.mediu.LLM_URL,
      model: app.mediu.LLM_MODEL,
      mesaje: [
        { rol: "sistem", continut: sistem },
        { rol: "utilizator", continut: utilizator },
      ],
    });

    // fallback dacă răspunde în engleză
    if (pareEngleza(explicatie)) {
      explicatie = await genereazaRaspunsLLM({
        llmUrl: app.mediu.LLM_URL,
        model: app.mediu.LLM_MODEL,
        mesaje: [
          { rol: "sistem", continut: "Rescrie STRICT în română, păstrând structura 1-5 + REZUMAT. Nu inventa numere." },
          { rol: "utilizator", continut: explicatie },
        ],
      });
    }

    const rezumat = (explicatie.split("\n").slice(-3).join("\n") || "").trim();
    const payload = { txDigest, explicatie, rezumat, analiza };

    // Persistență (opțional)
    if (app.db) {
      await salveazaAnalizaTranzactie(app.db, {
        digest: txDigest,
        retea: app.mediu.SUI_RETEA,
        rezumat: rezumat || undefined,
      });
    }

    await scrieInCache(app.cacheRedis, cheie, payload, 24 * 60 * 60);
    return payload;
  });
};
