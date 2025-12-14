import { z } from "zod";

const boolDinEnv = z.preprocess((v) => {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").trim().toLowerCase();
  if (["true", "1", "yes", "y", "da"].includes(s)) return true;
  if (["false", "0", "no", "n", "nu", ""].includes(s)) return false;
  return v; // va pica validarea dacă e ceva ciudat
}, z.boolean());

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(8080),
  CORS_ORIGINI: z.string().default("http://localhost:5173,http://localhost:3000"),

  // Sui
  SUI_RPC_URL: z.string().min(1),
  SUI_RETEA: z.string().optional(),

  // LLM
  LLM_URL: z.string().min(1),
  LLM_MODEL: z.string().min(1),

  // Safety rails
  SAFE_MODE: boolDinEnv.default(true),
  LLM_DEZACTIVAT: boolDinEnv.default(false),
  AUDIT_ACTIV: boolDinEnv.default(true),

  // Limită transfer
  LIMITA_TRANSFER_SUI: z.coerce.number().positive().default(1),
  CONFIRMARE_TTL_SEC: z.coerce.number().int().positive().default(120),

  // Optional
  REDIS_URL: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  CHEIE_API_SERVER: z.string().optional(),
  WEBHOOK_NOTIFICARI: z.string().optional(),
});

export function citesteMediul() {
  const rezultat = schema.safeParse(process.env);
  if (!rezultat.success) {
    throw new Error("Configurare .env invalidă: " + rezultat.error.message);
  }
  return rezultat.data;
}
