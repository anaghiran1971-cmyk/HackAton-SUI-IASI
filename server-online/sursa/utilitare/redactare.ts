export type RezultatRedactare = {
  text: string;
  inlocuiri: number;
};

const regexAdresaSui = /\b0x[a-fA-F0-9]{20,}\b/g;
const regexEmail = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const regexCheiSauSeed = /\b(seed|mnemonic|private\s*key|secret|cheie\s*privat[ăa]|fraza\s+de\s+recuperare)\b[\s\S]{0,120}/gi;

export function redacteazaTextSensibil(input: string): RezultatRedactare {
  let inlocuiri = 0;
  let out = input;

  // Redactează adrese Sui (nu ascunde complet, dar reduce leak)
  out = out.replace(regexAdresaSui, (m) => {
    inlocuiri++;
    return m.slice(0, 6) + "…" + m.slice(-4);
  });

  // Redactează email-uri
  out = out.replace(regexEmail, () => {
    inlocuiri++;
    return "[email-redactat]";
  });

  // Blochează fragmente care par a conține secrete
  out = out.replace(regexCheiSauSeed, () => {
    inlocuiri++;
    return "[posibil-secret-redactat]";
  });

  return { text: out, inlocuiri };
}
