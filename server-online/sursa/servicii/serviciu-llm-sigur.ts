import type { MesajChat } from "../utilitare/tipuri-api.js";
import { redacteazaTextSensibil } from "../utilitare/redactare.js";
import { detecteazaPromo, politicaNeutralitate } from "../utilitare/anti-bias.js";
import { genereazaRaspunsLLM } from "./serviciu-llm.js";

export type PoliticaLLM = {
  safeMode: boolean;
  maxCaractereInput: number;
  interzise: string[];
  adaugaNeutralitate: boolean;
};

export const politicaLLMImplicit: PoliticaLLM = {
  safeMode: true,
  maxCaractereInput: 6000,
  interzise: [
    "seed", "mnemonic", "private key", "cheie privată", "fraza de recuperare",
    "trimite tot", "drain", "fura", "hack", "bypass", "exploit"
  ],
  adaugaNeutralitate: true
};

function blocheazaDacaPericulos(text: string, politica: PoliticaLLM): string | null {
  const t = text.toLowerCase();
  for (const k of politica.interzise) {
    if (t.includes(k.toLowerCase())) return `Cerere blocată (siguranță): conține termen interzis: ${k}`;
  }
  return null;
}

export async function genereazaRaspunsLLMSigur(opts: {
  llmUrl: string;
  model: string;
  mesaje: MesajChat[];
  politica?: Partial<PoliticaLLM>;
}): Promise<{ raspuns: string; redactari: number; promoDetectat: boolean }> {
  const politica = { ...politicaLLMImplicit, ...(opts.politica ?? {}) };

  const doarUtilizator = opts.mesaje
  .filter(m => m.rol === "utilizator")
  .map(m => m.continut)
  .join("\n");

const blocaj = blocheazaDacaPericulos(doarUtilizator, politica);

  if (blocaj) return { raspuns: blocaj, redactari: 0, promoDetectat: false };

  // Limitare input
  const mesajeLimitate = opts.mesaje.map(m => ({
    ...m,
    continut: m.continut.slice(0, politica.maxCaractereInput)
  }));

  // Redactare dacă safe mode
  let redactari = 0;
  const mesajeRedactate = politica.safeMode
    ? mesajeLimitate.map(m => {
        const r = redacteazaTextSensibil(m.continut);
        redactari += r.inlocuiri;
        return { ...m, continut: r.text };
      })
    : mesajeLimitate;

  // Injectăm politică de neutralitate ca mesaj de sistem (anti-bias)
  const mesajeFinale: MesajChat[] = politica.adaugaNeutralitate
    ? [
        { rol: "sistem", continut: politicaNeutralitate() },
        ...mesajeRedactate
      ]
    : mesajeRedactate;

  const raspuns = await genereazaRaspunsLLM({
    llmUrl: opts.llmUrl,
    model: opts.model,
    mesaje: mesajeFinale
  });

  return { raspuns: raspuns.trim(), redactari, promoDetectat: detecteazaPromo(raspuns) };
}
