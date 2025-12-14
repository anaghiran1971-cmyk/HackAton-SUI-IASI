export const MIST_PER_SUI = 1_000_000_000;

export function mistLaSui(mist: number): number {
  return mist / MIST_PER_SUI;
}

export function rotunjeste(x: number, zecimale = 9): number {
  const p = Math.pow(10, zecimale);
  return Math.round(x * p) / p;
}

export function formatSuiDinMist(mist: number): string {
  const sui = rotunjeste(mistLaSui(mist), 9);
  return `${sui} SUI (${mist} MIST)`;
}
