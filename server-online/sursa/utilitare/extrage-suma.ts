const cuvinteNumere: Record<string, number> = {
  zero: 0,
  unu: 1,
  una: 1,
  doi: 2,
  doua: 2,
  trei: 3,
  patru: 4,
  cinci: 5,
  sase: 6,
  sapte: 7,
  opt: 8,
  noua: 9,
  zece: 10,
};

export function extrageSumaSui(text: string): number | null {
  // 1) caută număr scris: 0.01 / 0,01 / 5 / 12.5
  const m = text.match(/(\d+(?:[.,]\d+)?)/);
  if (m?.[1]) {
    const v = Number(m[1].replace(",", "."));
    if (Number.isFinite(v) && v >= 0) return v;
  }

  // 2) caută număr în cuvinte (simplu)
  for (const [cuv, val] of Object.entries(cuvinteNumere)) {
    const re = new RegExp(`\\b${cuv}\\b`, "g");
    if (re.test(text)) return val;
  }

  return null;
}
