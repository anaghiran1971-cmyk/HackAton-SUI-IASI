export function normalizeazaText(s: string): string {
  // lowercase
  let t = (s ?? "").toLowerCase().trim();

  // diacritice -> ascii (ș/ţ etc.)
  t = t.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // înlocuiri comune / slang / greșeli frecvente
  const map: Array<[RegExp, string]> = [
    [/\bpls\b/g, " te rog "],
    [/\bplz\b/g, " te rog "],
    [/\bsuii\b/g, " sui "],
    [/\bsui\b/g, " sui "],
    [/\bsuy\b/g, " sui "],
    [/\bsuu\b/g, " sui "],
    [/\btrimite-mi\b/g, " trimite "],
    [/\bda-i\b/g, " trimite "],
    [/\bdai\b/g, " trimite "],
    [/\btransfera\b/g, " trimite "],
    [/\btransfer\b/g, " trimite "],
    [/\bcatre\b/g, " lui "],
    [/\bspre\b/g, " lui "],
  ];

  for (const [re, rep] of map) t = t.replace(re, rep);

  // normalize whitespace
  t = t.replace(/[^\w\s\.\,]/g, " "); // scoate semne ciudate
  t = t.replace(/\s+/g, " ").trim();

  return t;
}
