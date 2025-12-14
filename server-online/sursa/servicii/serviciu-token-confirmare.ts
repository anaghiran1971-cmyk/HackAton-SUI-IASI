import crypto from "node:crypto";
import type { CacheRedis } from "./serviciu-cache.js";

export type PayloadConfirmare = {
  tip: "transfer_sui";
  expeditor: string;   // adresa userului (din wallet)
  destinatar: string;  // adresa rezolvată
  suma_sui: number;
};

type Intrare = {
  payload: PayloadConfirmare;
  expiraLa: number; // epoch ms
  folosit: boolean;
};

const storeMemorie = new Map<string, Intrare>();

function acumMs() {
  return Date.now();
}

function curataMemorie() {
  const t = acumMs();
  for (const [token, intrare] of storeMemorie.entries()) {
    if (intrare.expiraLa <= t) storeMemorie.delete(token);
  }
}

function prefix() {
  return "confirmare:";
}

function cheiePayload(token: string) {
  return `${prefix()}${token}:payload`;
}

function cheieUsed(token: string) {
  return `${prefix()}${token}:used`;
}

function normalizat(p: PayloadConfirmare): PayloadConfirmare {
  return {
    tip: p.tip,
    expeditor: p.expeditor.trim(),
    destinatar: p.destinatar.trim(),
    suma_sui: Number(p.suma_sui),
  };
}

function payloadEgal(a: PayloadConfirmare, b: PayloadConfirmare) {
  return (
    a.tip === b.tip &&
    a.expeditor.toLowerCase() === b.expeditor.toLowerCase() &&
    a.destinatar.toLowerCase() === b.destinatar.toLowerCase() &&
    Number(a.suma_sui) === Number(b.suma_sui)
  );
}

/**
 * Emite token confirmare.
 * - Dacă există Redis: stochează payload în Redis cu TTL
 * - Dacă nu: stochează în memorie
 */
export async function emiteTokenConfirmare(
  cache: CacheRedis | null,
  payload: PayloadConfirmare,
  ttlSec: number
) {
  const p = normalizat(payload);

  const token = crypto.randomBytes(24).toString("base64url");
  const expiraLa = acumMs() + ttlSec * 1000;

  if (!cache) {
    curataMemorie();
    storeMemorie.set(token, { payload: p, expiraLa, folosit: false });
    return { token, expiraLa };
  }

  // Redis: payload cu TTL, iar used se marchează la consum cu NX
  await cache.setex(cheiePayload(token), ttlSec, JSON.stringify({ payload: p, expiraLa }));
  return { token, expiraLa };
}

/**
 * Validează + consumă (one-time).
 * - Redis: compară payload, apoi încearcă SET NX pe "used" => atomic-ish (doar unul reușește)
 * - Memorie: flag folosit
 */
export async function valideazaSiConsumaToken(
  cache: CacheRedis | null,
  token: string,
  payloadAsteptat: PayloadConfirmare,
  ttlSec: number
) {
  const asteptat = normalizat(payloadAsteptat);

  if (!cache) {
    curataMemorie();
    const intrare = storeMemorie.get(token);
    if (!intrare) return { ok: false as const, motiv: "Token inexistent sau expirat" };
    if (intrare.folosit) return { ok: false as const, motiv: "Token deja folosit" };

    if (!payloadEgal(intrare.payload, asteptat)) {
      return { ok: false as const, motiv: "Token nu corespunde intenției" };
    }

    intrare.folosit = true;
    return { ok: true as const };
  }

  // Redis path
  const raw = await cache.get(cheiePayload(token));
  if (!raw) return { ok: false as const, motiv: "Token inexistent sau expirat" };

  let salvat: { payload: PayloadConfirmare; expiraLa: number };
  try {
    salvat = JSON.parse(raw);
  } catch {
    return { ok: false as const, motiv: "Token corupt" };
  }

  if (!payloadEgal(salvat.payload, asteptat)) {
    return { ok: false as const, motiv: "Token nu corespunde intenției" };
  }

  // One-time: doar primul care setează "used" cu NX câștigă
  const setat = await cache.setNxEx(cheieUsed(token), ttlSec, "1");
  if (!setat) return { ok: false as const, motiv: "Token deja folosit" };

  return { ok: true as const };
}
