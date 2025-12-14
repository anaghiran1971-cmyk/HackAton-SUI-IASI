import type { FastifyPluginAsync } from "fastify";
import { schemaTxDigest } from "../utilitare/validare.js";
import { cheiCache } from "../servicii/serviciu-chei-cache.js";
import { citesteDinCache, scrieInCache } from "../servicii/serviciu-cache.js";
import { metrici } from "../observabilitate/colector-metrici.js";
import { evalueazaRisc } from "../servicii/serviciu-politici.js";
import { salveazaAnalizaTranzactie } from "../baza-de-date/depozite/depozit-tranzactii.js";
import type { VerdictRisc } from "../utilitare/tipuri-api.js";

function extragePackageIdDinTip(tip: string): string | null {
  const m = tip.match(/^(0x[a-fA-F0-9]+)::/);
  return m ? m[1] : null;
}

export const rutaRisc: FastifyPluginAsync = async (app) => {
  app.post("/api/risc/verifica", async (cerere, raspuns) => {
    metrici.verificariRisc += 1;

    const validare = schemaTxDigest.safeParse(cerere.body ?? {});
    if (!validare.success) {
      return raspuns.code(400).send({ eroare: "txDigest invalid" });
    }

    const { txDigest } = validare.data;
    const cheie = cheiCache.txRisc(txDigest);

    const cached = await citesteDinCache<{ txDigest: string; verdict: VerdictRisc }>(app.cacheRedis, cheie);
    if (cached) {
      metrici.cacheHit += 1;
      return cached;
    }
    metrici.cacheMiss += 1;

    const tx = await app.suiClient.getTransactionBlock({
      digest: txDigest,
      options: { showEffects: true, showInput: true, showObjectChanges: true, showBalanceChanges: true }
    });

    const gazComputation = Number(tx.effects?.gasUsed?.computationCost ?? "0");
    const gazStorage = Number(tx.effects?.gasUsed?.storageCost ?? "0");
    const gazRebate = Number(tx.effects?.gasUsed?.storageRebate ?? "0");
    const gazTotal = Math.max(0, gazComputation + gazStorage - gazRebate);

    // package-uri atinse (heuristic) din objectChanges
    const packageSet = new Set<string>();
    for (const ch of (tx.objectChanges ?? [])) {
      const tip = (ch as any)?.objectType as string | undefined;
      if (tip) {
        const pid = extragePackageIdDinTip(tip);
        if (pid) packageSet.add(pid);
      }
    }

    // contract necunoscut dacă nu e în allowlist (MVP)
    let interactiuneNecunoscuta = packageSet.size > 0;
    for (const pid of packageSet) {
      if (app.politici.allowlist.has(pid)) {
        interactiuneNecunoscuta = false;
        break;
      }
    }

    const verdict = evalueazaRisc(
      {
        contracteAtinge: Array.from(packageSet),
        gazTotal,
        atingeOwnershipSauCapabilitati: false, // TODO: când integrăm Move pack detectăm capabilități reale
        interactiuneContractNecunoscut: interactiuneNecunoscuta
      },
      app.politici
    );

    // Persistență (opțional)
    if (app.db) {
      await salveazaAnalizaTranzactie(app.db, {
        digest: txDigest,
        retea: app.mediu.SUI_RETEA,
        scorRisc: verdict.scor,
        nivelRisc: verdict.nivel
      });
    }

    const payload = { txDigest, verdict };
    await scrieInCache(app.cacheRedis, cheie, payload, 6 * 60 * 60); // 6h

    return payload;
  });
};

