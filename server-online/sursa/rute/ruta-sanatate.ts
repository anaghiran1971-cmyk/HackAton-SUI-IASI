import type { FastifyPluginAsync } from "fastify";

export const rutaSanatate: FastifyPluginAsync = async (app) => {
  app.get("/api/sanatate", async () => {
    const verificari: Record<string, { ok: boolean; detaliu?: string }> = {};

    // Sui RPC
    try {
      await app.suiClient.getLatestSuiSystemState();
      verificari["sui_rpc"] = { ok: true };
    } catch (e: any) {
      verificari["sui_rpc"] = { ok: false, detaliu: String(e?.message ?? e) };
    }

    // LLM (ex: Ollama)
    try {
      const r = await fetch(`${app.mediu.LLM_URL}/api/tags`);
      verificari["llm"] = { ok: r.ok, detaliu: r.ok ? undefined : `status=${r.status}` };
    } catch (e: any) {
      verificari["llm"] = { ok: false, detaliu: String(e?.message ?? e) };
    }

    // Redis (opțional)
    if (app.cacheRedis) {
      try {
        await app.cacheRedis.ping();
        verificari["redis"] = { ok: true };
      } catch (e: any) {
        verificari["redis"] = { ok: false, detaliu: String(e?.message ?? e) };
      }
    } else {
      verificari["redis"] = { ok: true, detaliu: "dezactivat (REDIS_URL lipsă)" };
    }

    // DB (opțional)
    if (app.db) {
      try {
        await app.db`SELECT 1`;
        verificari["db"] = { ok: true };
      } catch (e: any) {
        verificari["db"] = { ok: false, detaliu: String(e?.message ?? e) };
      }
    } else {
      verificari["db"] = { ok: true, detaliu: "dezactivat (DATABASE_URL lipsă)" };
    }

    const ok = Object.values(verificari).every(v => v.ok);
    return { ok, verificari, retea: app.mediu.SUI_RETEA };
  });
};

