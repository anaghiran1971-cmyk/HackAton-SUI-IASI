export type NivelRisc = "scazut" | "mediu" | "ridicat";

export type VerdictSiguranta = {
  nivel: NivelRisc;
  scor: number; // 0..100
  recomandare: "continua" | "verifica_manual" | "blocheaza";
  motive: string[];
};

export function recomandaDinRisc(nivel: NivelRisc, scor: number, motive: string[]): VerdictSiguranta {
  if (nivel === "ridicat" || scor >= 80) return { nivel, scor, recomandare: "blocheaza", motive };
  if (nivel === "mediu" || scor >= 40) return { nivel, scor, recomandare: "verifica_manual", motive };
  return { nivel, scor, recomandare: "continua", motive };
}
