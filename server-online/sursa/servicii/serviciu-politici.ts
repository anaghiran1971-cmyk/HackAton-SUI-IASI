import fs from "node:fs";
import path from "node:path";
import type { VerdictRisc } from "../utilitare/tipuri-api.js";

type Regula = { id: string; descriere: string; puncte: number };

export type Politici = {
  allowlist: Set<string>;
  denylist: Set<string>;
  reguli: Regula[];
};

function citesteJson<T>(cale: string): T {
  const continut = fs.readFileSync(cale, "utf-8");
  return JSON.parse(continut) as T;
}

export function incarcaPolitici(caleBaza: string): Politici {
  const allowlist = new Set(
    citesteJson<string[]>(path.join(caleBaza, "liste/allowlist.json"))
  );
  const denylist = new Set(
    citesteJson<string[]>(path.join(caleBaza, "liste/denylist.json"))
  );
  const reguli = citesteJson<Regula[]>(path.join(caleBaza, "reguli-risc.json"));
  return { allowlist, denylist, reguli };
}

// Heuristici de risc (MVP). Le îmbunătățim după wallet pack Move.
export function evalueazaRisc(opts: {
  destinatar?: string;
  contracteAtinge?: string[];
  gazTotal?: number;
  atingeOwnershipSauCapabilitati?: boolean;
  interactiuneContractNecunoscut?: boolean;
}, politici: Politici): VerdictRisc {
  const motive: string[] = [];
  const recomandari: string[] = [];
  let scor = 0;

  const contracte = opts.contracteAtinge ?? [];

  if (opts.destinatar && politici.denylist.has(opts.destinatar)) {
    return { nivel: "ridicat", scor: 95, motive: ["Destinatar pe denylist."], recomandari: ["Nu semna această tranzacție."] };
  }
  for (const c of contracte) {
    if (politici.denylist.has(c)) {
      return { nivel: "ridicat", scor: 95, motive: [`Contract pe denylist: ${c}`], recomandari: ["Nu semna această tranzacție."] };
    }
  }

  if (opts.destinatar && politici.allowlist.has(opts.destinatar)) {
    motive.push("Destinatar pe allowlist (încredere crescută).");
    scor -= 10;
  }

  if (opts.interactiuneContractNecunoscut) {
    scor += 25;
    motive.push("Interacțiune cu contract necunoscut/neverificat.");
    recomandari.push("Verifică sursa dApp-ului și contractul (packageId) înainte de semnare.");
  }

  if ((opts.gazTotal ?? 0) > 5_000_000_000) {
    scor += 15;
    motive.push("Consum de gaz neobișnuit (posibil comportament atipic).");
    recomandari.push("Rulează simulare și compară gazul cu tranzacții similare.");
  }

  if (opts.atingeOwnershipSauCapabilitati) {
    scor += 30;
    motive.push("Tranzacția pare să modifice ownership / capabilități (risc mai mare).");
    recomandari.push("Citește cu atenție rezumatul: cine devine owner, ce obiecte sunt transferate.");
  }

  scor = Math.max(0, Math.min(100, scor));
  const nivel: VerdictRisc["nivel"] = scor >= 70 ? "ridicat" : scor >= 35 ? "mediu" : "scazut";

  if (motive.length === 0) motive.push("Nu au fost detectate semnale clare de risc în regulile MVP.");
  return { nivel, scor, motive, recomandari: recomandari.length ? recomandari : undefined };
}
