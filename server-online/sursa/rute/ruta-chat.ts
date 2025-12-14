import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { genereazaRaspunsLLM } from "../servicii/serviciu-llm.js";

const schema = z.object({
  mesaje: z.array(z.object({
    rol: z.enum(["utilizator", "sistem", "asistent"]),
    continut: z.string().min(1),
  })).min(1),
});

export const rutaChat: FastifyPluginAsync = async (app) => {
  app.post("/api/chat", async (req, reply) => {
    const p = schema.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ eroare: "Cerere invalidă" });

    if (app.mediu.LLM_DEZACTIVAT) {
      return {
        raspuns: "LLM este dezactivat momentan. Poți folosi endpoint-urile deterministe (tranzacții/risc/obiecte).",
        disclaimer: "Copilotul nu semnează tranzacții. Confirmarea este întotdeauna în wallet.",
      };
    }

    const ultim = p.data.mesaje[p.data.mesaje.length - 1];
    const intrebare = ultim.continut;

    // 🔎 RAG: caută în cunoștințe
    const fragmente = app.cunostinte.cauta(intrebare, 4);
    const scorMax = fragmente[0]?.scor ?? 0;

    // Prag de încredere (ajustabil)
    const prag = 0.35;

    if (scorMax < prag) {
      return {
        raspuns:
          "Nu sunt suficient de sigur din baza mea de cunoștințe locală pentru a răspunde precis. " +
          "Poți reformula întrebarea sau adăuga documentație în folderul surse/cunostinte/.",
        disclaimer:
          "Copilotul răspunde pe baza surselor locale. Dacă nu are surse, evită să inventeze.",
        meta: { scorMax: Number(scorMax.toFixed(3)), surse: [] },
      };
    }

    // Construim context cu citări
    const context = fragmente.map((f, i) =>
      `Sursa [${i + 1}] (${f.sursa} — ${f.titlu}):\n${f.text}`
    ).join("\n\n");

    const sistem = `Ești AI Copilot pentru Sui. Răspunzi în română, clar.
Reguli de TRUST:
- Folosește DOAR contextul din "Surse" pentru afirmații factuale.
- Dacă nu găsești ceva în Surse, spune explicit că nu apare în sursele disponibile.
- Include la final o secțiune "Surse" cu [1], [2] etc. pentru ceea ce ai folosit.
- Fără seed/private key. Fără instrucțiuni periculoase.`;

    const utilizator = `Întrebare: ${intrebare}

Surse disponibile:
${context}`;

    const raspunsText = await genereazaRaspunsLLM({
      llmUrl: app.mediu.LLM_URL,
      model: app.mediu.LLM_MODEL,
      mesaje: [
        { rol: "sistem", continut: sistem },
        { rol: "utilizator", continut: utilizator },
      ],
    });

    return {
      raspuns: raspunsText,
      disclaimer: "Răspuns generat cu suport din surse locale + guardrails. Confirmă detaliile on-chain când e necesar.",
      meta: {
        scorMax: Number(scorMax.toFixed(3)),
        surse: fragmente.map((f, i) => ({ idx: i + 1, sursa: f.sursa, titlu: f.titlu, scor: Number(f.scor.toFixed(3)) })),
      },
    };
  });
};
