import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

const schema = z.object({
  intrebare: z.string().min(3),
});

export const rutaCunostinte: FastifyPluginAsync = async (app) => {
  app.post("/api/cunostinte/cauta", async (req, reply) => {
    const p = schema.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ eroare: "Cerere invalidă" });

    const fragmente = app.cunostinte.cauta(p.data.intrebare, 5);

    return {
      rezultate: fragmente.map(f => ({
        sursa: f.sursa,
        titlu: f.titlu,
        scor: Number(f.scor.toFixed(3)),
        fragment: f.text.slice(0, 350) + (f.text.length > 350 ? "..." : ""),
      })),
    };
  });
};
