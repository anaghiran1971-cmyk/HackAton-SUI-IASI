import { z } from "zod";

export const schemaIntentieTransfer = z.object({
  tip: z.literal("transfer_sui"),
  destinatar_alias: z.string().min(1).max(64),
  suma_sui: z.number().positive(),
  nota: z.string().max(200).optional(),
});

export const schemaIntentieCumparaToken = z.object({
  tip: z.literal("cumpara_token"),
  simbol: z.string().min(2).max(12).optional(),
  pachet: z.string().optional(), // optional până legi un DEX
  suma_sui: z.number().positive().optional(), // o ceri în chat
  nota: z.string().max(200).optional(),
});

export const schemaIntentieCumparaNft = z.object({
  tip: z.literal("cumpara_nft"),
  colectie: z.string().min(2).max(80).optional(),
  objectId: z.string().optional(),
  pret_sui: z.number().positive().optional(), // îl ceri în chat
  nota: z.string().max(200).optional(),
});

export const schemaIntentie = z.discriminatedUnion("tip", [
  schemaIntentieTransfer,
  schemaIntentieCumparaToken,
  schemaIntentieCumparaNft,
]);

export type Intentie = z.infer<typeof schemaIntentie>;
