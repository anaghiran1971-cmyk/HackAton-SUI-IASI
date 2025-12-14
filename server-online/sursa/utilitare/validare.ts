import { z } from "zod";

export const schemaTxDigest = z.object({
  txDigest: z.string().min(10)
});

export const schemaObjectId = z.object({
  objectId: z.string().min(10)
});

export const schemaMesajChat = z.object({
  mesaje: z.array(z.object({
    rol: z.enum(["sistem", "utilizator", "asistent"]),
    continut: z.string().min(1)
  })).min(1)
});

export const schemaMonitorizare = z.object({
  adrese: z.array(z.string().min(10)).min(1),
  webhook: z.string().url().optional()
});
