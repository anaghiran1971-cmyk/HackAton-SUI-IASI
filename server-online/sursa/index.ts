import dotenv from "dotenv";
dotenv.config({ override: true });

import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { fileURLToPath } from "node:url";

import { citesteMediul } from "./configurari/mediu.js";
import { logger } from "./configurari/logger.js";
import { creeazaClientSui } from "./servicii/serviciu-sui.js";
import { incarcaPolitici, type Politici } from "./servicii/serviciu-politici.js";
import { creeazaCacheRedis, type CacheRedis } from "./servicii/serviciu-cache.js";
import { citesteAliasActivDinSuiCli } from "./servicii/serviciu-config-sui-cli.js";
import { creeazaClientBazaDate, type ClientBazaDate } from "./baza-de-date/conexiune.js";
import { metrici } from "./observabilitate/colector-metrici.js";
import { reguliRateLimit } from "./utilitare/rate-limit.js";

// ✅ Trust Q&A (RAG-lite)
import { incarcaCunostinte } from "./servicii/serviciu-cunostinte.js";
import { rutaCunostinte } from "./rute/ruta-cunostinte.js";

// Rute existente
import { rutaStare } from "./rute/ruta-stare.js";
import { rutaSanatate } from "./rute/ruta-sanatate.js";
import { rutaMetrici } from "./rute/ruta-metrici.js";
import { rutaChat } from "./rute/ruta-chat.js";
import { rutaTranzactii } from "./rute/ruta-tranzactii.js";
import { rutaRisc } from "./rute/ruta-risc.js";
import { rutaObiecte } from "./rute/ruta-obiecte.js";
import { rutaRiscAi } from "./rute/ruta-risc-ai.js";

// Rute noi (secure rails)
import { rutaConsimtamant } from "./rute/ruta-consimtamant.js";
import { rutaContacte } from "./rute/ruta-contacte.js";
import { rutaIntentii } from "./rute/ruta-intentii.js";
import { rutaRezolvaContact } from "./rute/ruta-rezolva-contact.js";
import { rutaPrevizualizare } from "./rute/ruta-previzualizare.js";

declare module "fastify" {
  interface FastifyInstance {
    mediu: ReturnType<typeof citesteMediul> & { SUI_RETEA: string };
    suiClient: ReturnType<typeof creeazaClientSui>;
    politici: Politici;
    cacheRedis: CacheRedis | null;
    db: ClientBazaDate | null;

    // ✅ Trust Q&A
    cunostinte: ReturnType<typeof incarcaCunostinte>;
  }
}

const mediu = citesteMediul();
const aliasDinCli = citesteAliasActivDinSuiCli();

const mediuFinal = {
  ...mediu,
  SUI_RETEA: mediu.SUI_RETEA ?? aliasDinCli ?? "hackaton",
};

console.log("LLM_DEZACTIVAT (din mediuFinal):", mediuFinal.LLM_DEZACTIVAT);
console.log("LLM_URL:", mediuFinal.LLM_URL);
console.log("LLM_MODEL:", mediuFinal.LLM_MODEL);

const app = Fastify({ logger });

app.decorate("mediu", mediuFinal);
app.decorate("suiClient", creeazaClientSui(mediuFinal.SUI_RPC_URL));

// FIX Windows PATH pentru reguli
const caleReguli = fileURLToPath(new URL("./reguli", import.meta.url));
app.decorate("politici", incarcaPolitici(caleReguli));

// ✅ Trust Q&A: încarcă folderul sursa/cunostinte
const caleCunostinte = fileURLToPath(new URL("./cunostinte", import.meta.url));
app.decorate("cunostinte", incarcaCunostinte(caleCunostinte));

// Redis (opțional + safe)
let cacheRedis: CacheRedis | null = null;
if (mediuFinal.REDIS_URL) {
  try {
    cacheRedis = await creeazaCacheRedis(mediuFinal.REDIS_URL);
  } catch (e) {
    app.log.warn({ err: e }, "Redis indisponibil, continui fara cache");
    cacheRedis = null;
  }
}
app.decorate("cacheRedis", cacheRedis);

// DB (opțional)
let db: ClientBazaDate | null = null;
if (mediuFinal.DATABASE_URL) db = creeazaClientBazaDate(mediuFinal.DATABASE_URL);
app.decorate("db", db);

// Metrici + handler erori
app.addHook("onRequest", async () => {
  metrici.cereriTotale += 1;
});

app.setErrorHandler((err, req, reply) => {
  metrici.eroriTotale += 1;
  req.log.error(err);

  const eDev = process.env.NODE_ENV !== "production";
  reply.code(500).send({
    eroare: "Eroare internă",
    detalii: eDev ? ((err as any)?.message ?? String(err)) : undefined,
  });
});

// CORS
await app.register(cors, {
  origin: mediuFinal.CORS_ORIGINI.split(",").map((s) => s.trim()),
  credentials: true,
});

// Rate limit
await app.register(rateLimit, {
  max: reguliRateLimit.maxCereriPeMinut,
  timeWindow: reguliRateLimit.fereastra,
});

// Cheie API server (opțional)
app.addHook("preHandler", async (req, reply) => {
  if (!mediuFinal.CHEIE_API_SERVER) return;
  const cheie = req.headers["x-api-key"];
  if (cheie !== mediuFinal.CHEIE_API_SERVER) {
    return reply.code(401).send({ eroare: "Neautorizat" });
  }
});

// Rute “rails”
await app.register(rutaConsimtamant);
await app.register(rutaContacte);
await app.register(rutaIntentii);
await app.register(rutaPrevizualizare);
await app.register(rutaRezolvaContact);
await app.register(rutaRiscAi);

// ✅ Trust Q&A route (debug/search)
await app.register(rutaCunostinte);

// Rute existente
await app.register(rutaStare);
await app.register(rutaSanatate);
await app.register(rutaMetrici);
await app.register(rutaChat);
await app.register(rutaTranzactii);
await app.register(rutaRisc);
await app.register(rutaObiecte);

app.listen({ port: mediuFinal.PORT, host: "0.0.0.0" })
  .then(() => app.log.info(`Server pornit pe port ${mediuFinal.PORT} (rețea: ${mediuFinal.SUI_RETEA})`))
  .catch((e) => {
    app.log.error(e);
    process.exit(1);
  });
