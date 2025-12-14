import { citesteMediul } from "../configurari/mediu.js";
import { creeazaClientSui } from "../servicii/serviciu-sui.js";
import { pornesteProgramator } from "./programator-joburi.js";
import { trimiteNotificareWebhook } from "../servicii/serviciu-notificari.js";

const mediu = citesteMediul();
const sui = creeazaClientSui(mediu.SUI_RPC_URL);

// TODO: mută în DB sau fișier config
const adreseUrmarite = ["0x...adresa_ta_de_test"];
const webhook = mediu.WEBHOOK_NOTIFICARI;

let ultimulDigest: Record<string, string | null> = {};

pornesteProgramator({
  intervalMs: 30_000,
  executa: async () => {
    if (!webhook) return;

    for (const adresa of adreseUrmarite) {
      const txs = await sui.queryTransactionBlocks({
        filter: { FromAddress: adresa },
        limit: 1
      });

      if (txs.data.length === 0) continue;
      const digest = txs.data[0].digest;

      if (ultimulDigest[adresa] === digest) continue;
      ultimulDigest[adresa] = digest;

      await trimiteNotificareWebhook(webhook, {
        tip: "tranzactie_noua",
        retea: mediu.SUI_RETEA,
        adresa,
        digest,
        timp: new Date().toISOString()
      });
    }
  }
});

console.log("Worker monitorizare pornit.");
