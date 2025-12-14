import type { FastifyPluginAsync } from "fastify";

export const rutaStare: FastifyPluginAsync = async (app) => {
  app.get("/api/stare", async () => {
    return {
      ok: true,
      serviciu: "copilot-sui",
      retea: app.mediu.SUI_RETEA,
      timp: new Date().toISOString()
    };
  });
};

