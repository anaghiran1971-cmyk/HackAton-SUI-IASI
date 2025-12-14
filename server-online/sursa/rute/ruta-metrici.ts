import type { FastifyPluginAsync } from "fastify";
import { exportaMetriciPrometheus } from "../observabilitate/colector-metrici.js";

export const rutaMetrici: FastifyPluginAsync = async (app) => {
  app.get("/metrics", async (_, reply) => {
    reply.header("Content-Type", "text/plain; version=0.0.4");
    return exportaMetriciPrometheus();
  });
};

