import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { genereazaRaspunsLLMSigur } from "../servicii/serviciu-llm-sigur.js";
import { scrieAudit } from "../servicii/serviciu-audit.js";
import { parseazaIntentieFuzzy } from "../servicii/serviciu-parseaza-intentie-fuzzy.js";
import { schemaIntentie, type Intentie } from "../utilitare/types.js";

const schemaCerere = z.object({
  prompt: z.string().min(3).max(500),
});

function extrageIntreMarcaje(text: string, start = "<<<JSON", end = "JSON>>>"): string | null {
  const i = text.indexOf(start);
  const j = text.indexOf(end);
  if (i === -1 || j === -1 || j <= i) return null;
  return text.slice(i + start.length, j).trim();
}

/**
 * Acceptă:
 * - forma nouă: { tip: "transfer_sui" | "cumpara_token" | "cumpara_nft", ... }
 * - forma veche: { actiune: "transfer_sui", ... }
 * și o normalizează la schema nouă (tip).
 */
function normalizeazaIntentie(anyIntentie: unknown): Intentie | null {
  if (!anyIntentie || typeof anyIntentie !== "object") return null;

  const obj = anyIntentie as any;

  // formă nouă (tip)
  if (typeof obj.tip === "string") {
    const p = schemaIntentie.safeParse(obj);
    return p.success ? p.data : null;
  }

  // formă veche (actiune -> tip)
  if (obj.actiune === "transfer_sui") {
    const intentieNoua = {
      tip: "transfer_sui",
      destinatar_alias: obj.destinatar_alias,
      suma_sui: obj.suma_sui,
      nota: obj.nota,
    };
    const p = schemaIntentie.safeParse(intentieNoua);
    return p.success ? p.data : null;
  }

  return null;
}

function parseazaDeterminist(prompt: string): Intentie | null {
  const t = prompt.toLowerCase().trim();

  // transfer
  const m1 = t.match(/trimite\s+(?:i\s+|lui\s+)?([a-z0-9_-]+)\s+(\d+(?:[.,]\d+)?)\s*sui/);
  if (m1) {
    const alias = m1[1];
    const suma = Number(m1[2].replace(",", "."));
    if (Number.isFinite(suma) && suma > 0) {
      return { tip: "transfer_sui", destinatar_alias: alias, suma_sui: suma };
    }
  }

  // cumpara token (ex: "cumpara token abc" / "cumpără token abc")
  const m2 = t.match(/cump(a|ă)r(a|ă)\s+token\s+([a-z0-9]{2,12})/);
  if (m2) {
    return { tip: "cumpara_token", simbol: m2[3].toUpperCase() };
  }

  // cumpara nft (ex: "cumpara nft din colectia monkey")
  const m3 = t.match(/cump(a|ă)r(a|ă)\s+nft(?:\s+din\s+colec(ț|t)ia)?\s+(.+)/);
  if (m3) {
    const colectie = m3[4].trim();
    if (colectie.length >= 2) return { tip: "cumpara_nft", colectie };
  }

  return null;
}

function aplicaLimitaTransfer(app: any, intentie: Intentie) {
  const limita = (app.mediu as any).LIMITA_TRANSFER_SUI as number | undefined;
  if (!limita) return null;

  if (intentie.tip === "transfer_sui" && intentie.suma_sui > limita) {
    return { suma_sui: intentie.suma_sui, limita };
  }
  return null;
}

export const rutaIntentii: FastifyPluginAsync = async (app) => {
  app.post("/api/intentii/parseaza", async (req, reply) => {
    const cerere = schemaCerere.safeParse(req.body);
    if (!cerere.success) {
      return reply.code(400).send({ eroare: "Prompt invalid", detalii: cerere.error.flatten() });
    }

    const prompt = cerere.data.prompt;

    // 0) Fuzzy: poate întoarce forma veche => normalizăm
    const intentieFuzzy = normalizeazaIntentie(parseazaIntentieFuzzy(prompt));
    if (intentieFuzzy) {
      const depasire = aplicaLimitaTransfer(app, intentieFuzzy);
      if (depasire) {
        return reply.code(422).send({ eroare: "Suma depășește limita configurată", detalii: depasire });
      }

      if (app.mediu.AUDIT_ACTIV) {
        scrieAudit({
          timp: new Date().toISOString(),
          tip: "intentii",
          meta: { sursa: "fuzzy", tip: intentieFuzzy.tip },
        });
      }

      return reply.send({
        intentie: intentieFuzzy,
        disclaimer: "Copilotul propune o intenție. Confirmarea finală este întotdeauna în wallet.",
        meta: { metoda: "fuzzy" },
      });
    }

    // 1) determinist
    const determinist = parseazaDeterminist(prompt);
    if (determinist) {
      const depasire = aplicaLimitaTransfer(app, determinist);
      if (depasire) {
        return reply.code(422).send({ eroare: "Suma depășește limita configurată", detalii: depasire });
      }

      if (app.mediu.AUDIT_ACTIV) {
        scrieAudit({
          timp: new Date().toISOString(),
          tip: "intentii",
          meta: { sursa: "regex", tip: determinist.tip },
        });
      }

      return reply.send({
        intentie: determinist,
        disclaimer: "Copilotul propune o intenție. Confirmarea finală este întotdeauna în wallet.",
        meta: { metoda: "regex" },
      });
    }

    // 2) LLM fallback
    if (app.mediu.LLM_DEZACTIVAT) {
      // IMPORTANT: nu blocăm UI-ul cu eroare; întoarcem intentie:null
      return reply.send({
        intentie: null,
        disclaimer: "LLM este dezactivat. Poți folosi chat-ul pentru întrebări.",
        meta: { metoda: "llm-dezactivat" },
      });
    }

    const sistem = `
Ești un parser de intenții pentru un wallet Sui.

Răspunde DOAR cu JSON valid între <<<JSON ... JSON>>>.

Dacă utilizatorul pune o întrebare generală, răspunde EXACT: NO_INTENT (fără JSON).

Tipuri posibile:

1) Transfer SUI:
<<<JSON
{"tip":"transfer_sui","destinatar_alias":"alias","suma_sui":0.1,"nota":"optional"}
JSON>>>

2) Cumpărare token:
<<<JSON
{"tip":"cumpara_token","simbol":"ABC","pachet":"0x...","suma_sui":1,"nota":"optional"}
JSON>>>

3) Cumpărare NFT:
<<<JSON
{"tip":"cumpara_nft","objectId":"0x...","colectie":"optional","pret_sui":2.5,"nota":"optional"}
JSON>>>

Reguli:
- Nu inventa date lipsă (pachet/objectId).
- Nu cere chei, seed, mnemonic.
- Nu scrie nimic în afara marcajelor, EXCEPTÂND NO_INTENT.
`.trim();

    const { raspuns, redactari } = await genereazaRaspunsLLMSigur({
      llmUrl: app.mediu.LLM_URL,
      model: app.mediu.LLM_MODEL,
      mesaje: [
        { rol: "sistem", continut: sistem },
        { rol: "utilizator", continut: prompt },
      ],
      politica: { safeMode: app.mediu.SAFE_MODE },
    });

    if (raspuns.trim() === "NO_INTENT") {
      return reply.send({
        intentie: null,
        disclaimer: "Nu am detectat o acțiune. Îți pot răspunde ca chat.",
        meta: { metoda: "llm-no-intent", redactari },
      });
    }

    const jsonText = extrageIntreMarcaje(raspuns);
    if (!jsonText) {
      return reply.send({
        intentie: null,
        disclaimer: "Nu am detectat o intenție clară. Îți pot răspunde ca chat.",
        meta: { metoda: "llm-fara-json", redactari },
      });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      return reply.send({
        intentie: null,
        disclaimer: "Nu am detectat o intenție clară. Îți pot răspunde ca chat.",
        meta: { metoda: "llm-json-invalid", redactari },
      });
    }

    const intentie = normalizeazaIntentie(parsed);
    if (!intentie) {
      return reply.send({
        intentie: null,
        disclaimer: "Intenția nu a respectat schema. Îți pot răspunde ca chat.",
        meta: { metoda: "llm-schema-invalida", redactari },
      });
    }

    const depasire = aplicaLimitaTransfer(app, intentie);
    if (depasire) {
      return reply.code(422).send({ eroare: "Suma depășește limita configurată", detalii: depasire });
    }

    if (app.mediu.AUDIT_ACTIV) {
      scrieAudit({
        timp: new Date().toISOString(),
        tip: "intentii",
        meta: { sursa: "llm", redactari, tip: intentie.tip },
      });
    }

    return reply.send({
      intentie,
      disclaimer: "Copilotul propune o intenție. Confirmarea finală este întotdeauna în wallet.",
      meta: { metoda: "llm", redactari },
    });
  });
};
