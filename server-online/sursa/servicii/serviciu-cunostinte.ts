import fs from "node:fs";
import path from "node:path";

export type FragmentCunostinte = {
  sursa: string;     // nume fișier
  titlu: string;     // primul header sau nume fișier
  text: string;      // fragment
  scor: number;      // scor relevanță
};

type Doc = {
  sursa: string;
  titlu: string;
  continut: string;
  fragmente: string[];
};

function normalizeaza(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .replace(/[\u0103]/g, "a")
    .replace(/[\u00e2]/g, "a")
    .replace(/[\u00ee]/g, "i")
    .replace(/[\u0219]/g, "s")
    .replace(/[\u021b]/g, "t")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extrageTitlu(md: string, fallback: string): string {
  const m = md.match(/^#\s+(.+)$/m);
  return m?.[1]?.trim() || fallback;
}

function spargeInFragmente(text: string, maxLungime = 900): string[] {
  const paragrafe = text.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
  const fragmente: string[] = [];
  let buf = "";

  for (const p of paragrafe) {
    if ((buf + "\n\n" + p).length > maxLungime) {
      if (buf.trim()) fragmente.push(buf.trim());
      buf = p;
    } else {
      buf = buf ? (buf + "\n\n" + p) : p;
    }
  }
  if (buf.trim()) fragmente.push(buf.trim());
  return fragmente;
}

function scorFragment(interogare: string, fragment: string): number {
  const q = normalizeaza(interogare);
  const f = normalizeaza(fragment);

  if (!q || !f) return 0;

  const qTokens = q.split(" ").filter(t => t.length >= 3);
  if (qTokens.length === 0) return 0;

  let hit = 0;
  for (const t of qTokens) {
    if (f.includes(t)) hit += 1;
  }

  // scor simplu: acoperire + bonus dacă are multe hit-uri
  const acoperire = hit / qTokens.length;
  const bonus = Math.min(0.25, hit * 0.03);
  return acoperire + bonus;
}

export function incarcaCunostinte(caleDirector: string): { cauta: (q: string, k?: number) => FragmentCunostinte[] } {
  const fisiere = fs.readdirSync(caleDirector).filter(f => f.toLowerCase().endsWith(".md"));

  const docs: Doc[] = fisiere.map((f) => {
    const full = path.join(caleDirector, f);
    const continut = fs.readFileSync(full, "utf8");
    const titlu = extrageTitlu(continut, f);
    const fragmente = spargeInFragmente(continut);
    return { sursa: f, titlu, continut, fragmente };
  });

  function cauta(q: string, k = 4): FragmentCunostinte[] {
    const rezultate: FragmentCunostinte[] = [];

    for (const d of docs) {
      for (const frag of d.fragmente) {
        const scor = scorFragment(q, frag);
        if (scor > 0) {
          rezultate.push({ sursa: d.sursa, titlu: d.titlu, text: frag, scor });
        }
      }
    }

    rezultate.sort((a, b) => b.scor - a.scor);
    return rezultate.slice(0, k);
  }

  return { cauta };
}
