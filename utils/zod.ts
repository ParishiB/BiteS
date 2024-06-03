import { z } from "zod";

export const createContactSchema = z.object({
  phoneNumber: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  linkedId: z.number().nullable().optional(),
  linkPrecedence: z.string().nullable().optional(),
});

export const identifySchema = z.object({
  email: z.string().email().optional(),
  phoneNumber: z.string().optional(),
});
