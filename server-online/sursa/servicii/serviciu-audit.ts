import fs from "node:fs";
import path from "node:path";

export type EvenimentAudit = {
  timp: string;
  tip: "chat" | "intentii" | "contacte" | "analiza_tx" | "risc" | "consimtamant";
  meta: Record<string, unknown>;
};

const fisierAudit = path.join(process.cwd(), "audit.log.jsonl");

export function scrieAudit(ev: EvenimentAudit) {
  try {
    fs.appendFileSync(fisierAudit, JSON.stringify(ev) + "\n", "utf-8");
  } catch {
    // Nu blocăm flow-ul în hackathon dacă auditul nu poate scrie.
  }
}
