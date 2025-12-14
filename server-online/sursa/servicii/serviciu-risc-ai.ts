import { z } from "zod";
import { genereazaRaspunsLLM } from "./serviciu-llm.js";

export type NivelRisc = "scazut" | "mediu" | "ridicat";

export type FactorRisc = {
  cod?: string;
  severitate: "info" | "warn" | "crit";
  mesaj: string;
};

export type RaspunsRisc = {
  nivel: NivelRisc;
  scor: number; // 0..100
  factori: FactorRisc[];
  recomandare: string;
};

export type CerereRisc = {
  tip: "transfer_sui" | "token" | "nft";
  expeditor?: string;
  destinatar?: string;
  suma_sui?: number;

  // pentru token/nft
  asset?: {
    tip: "token" | "nft";
    simbol?: string;     // ex: "SUI", "USDC", "DEGEN"
    nume?: string;       // ex: nume colecție nft
    objectId?: string;   // nft objectId / coin object id (dacă ai)
    pachet?: string;     // packageId / contract
    modul?: string;
    functie?: string;
    pret_sui?: number;   // preț estimat (dacă îl știi)
    sursa?: string;      // ex: "suifrens", "kriya", "turbos"
  };

  // context “trust”
  context?: {
    retea?: string; // hackaton/testnet/mainnet
    prima_interactiune?: boolean;
    suma_mare?: boolean;
    destinatar_necunoscut?: boolean;
    proiect_necunoscut?: boolean;
    lipsa_metadate?: boolean;
  };
};

const schemaRaspuns = z.object({
  nivel: z.enum(["scazut", "mediu", "ridicat"]),
  scor: z.number().min(0).max(100),
  factori: z.array(
    z.object({
      cod: z.string().optional(),
      severitate: z.enum(["info", "warn", "crit"]),
      mesaj: z.string().min(3),
    })
  ),
  recomandare: z.string().min(3),
});

function fallbackDeterminist(cerere: CerereRisc): RaspunsRisc {
  // fallback sigur: nu “sfat financiar”, doar semnale de risc
  const factori: FactorRisc[] = [];
  let scor = 0;

  if (cerere.tip === "transfer_sui") {
    const suma = cerere.suma_sui ?? 0;
    if (!cerere.destinatar) {
      scor += 60;
      factori.push({ severitate: "crit", mesaj: "Destinatar lipsă." });
    }
    if (suma <= 0) {
      scor += 50;
      factori.push({ severitate: "crit", mesaj: "Suma invalidă." });
    }
    if (cerere.context?.suma_mare) {
      scor += 20;
      factori.push({ severitate: "warn", mesaj: "Suma pare mare față de setările de siguranță." });
    }
  }

  if (cerere.tip === "token" || cerere.tip === "nft") {
    if (cerere.context?.proiect_necunoscut) {
      scor += 35;
      factori.push({ severitate: "warn", mesaj: "Asset/proiect necunoscut (risc sporit de scam/ilichiditate)." });
    }
    if (!cerere.asset?.pachet && !cerere.asset?.objectId) {
      scor += 20;
      factori.push({ severitate: "warn", mesaj: "Nu avem identificatori on-chain (package/object). Verifică manual." });
    }
    if (cerere.context?.lipsa_metadate) {
      scor += 20;
      factori.push({ severitate: "warn", mesaj: "Metadate insuficiente (nume/sursă/preț). Risc mai mare." });
    }
  }

  const nivel: NivelRisc = scor >= 60 ? "ridicat" : scor >= 25 ? "mediu" : "scazut";
  return {
    nivel,
    scor: Math.min(100, scor),
    factori,
    recomandare:
      nivel === "ridicat"
        ? "Nu recomand să continui până nu verifici manual toate detaliile (destinatar/asset/sursă)."
        : nivel === "mediu"
          ? "Continuă doar dacă ai verificat manual destinatarul/asset-ul și înțelegi riscurile."
          : "Risc scăzut. Totuși, verifică detaliile înainte de confirmare.",
  };
}

function extrageJsonDinText(text: string): unknown {
  // încearcă să extragă primul obiect JSON din răspuns (în caz că LLM “vorbește”)
  const t = (text ?? "").trim();

  // caz: răspuns curat JSON
  if (t.startsWith("{") && t.endsWith("}")) {
    return JSON.parse(t);
  }

  // caz: text + JSON în interior
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const candidate = t.slice(start, end + 1);
    return JSON.parse(candidate);
  }

  throw new Error("LLM nu a returnat JSON");
}

export async function evalueazaRiscCuAI(opts: {
  llmUrl: string;
  model: string;
  cerere: CerereRisc;
  safeMode: boolean;
}): Promise<RaspunsRisc> {
  // dacă safeMode e true, îi cerem să fie conservator
  const sistem = `Ești un motor de evaluare de risc pentru un wallet crypto (Sui).
Reguli:
- Răspunde STRICT în JSON valid, fără text extra.
- NU oferi sfaturi financiare (buy/sell). Doar risc și factori.
- Dacă informațiile sunt insuficiente, crește riscul (conservator).
- Nu inventa date (adresă, preț, audit etc.).
Output exact:
{
  "nivel": "scazut|mediu|ridicat",
  "scor": 0-100,
  "factori": [{"severitate":"info|warn|crit","mesaj":"...","cod":"optional"}],
  "recomandare":"..."
}`;

  const utilizator = `Context:
- safeMode: ${opts.safeMode ? "true" : "false"}
Cerere de evaluare:
${JSON.stringify(opts.cerere, null, 2)}`;

  let text: string;
  try {
    text = await genereazaRaspunsLLM({
      llmUrl: opts.llmUrl,
      model: opts.model,
      mesaje: [
        { rol: "sistem", continut: sistem },
        { rol: "utilizator", continut: utilizator },
      ],
    });
  } catch {
    // LLM indisponibil -> fallback determinist
    return fallbackDeterminist(opts.cerere);
  }

  try {
    const json = extrageJsonDinText(text);
    const parsed = schemaRaspuns.safeParse(json);
    if (!parsed.success) {
      // invalid -> fallback
      return fallbackDeterminist(opts.cerere);
    }
    return parsed.data;
  } catch {
    return fallbackDeterminist(opts.cerere);
  }
}
