import { z } from "zod";

export const createContactSchema = z.object({
  phoneNumber: z.string().optional(),
  email: z.string().email().optional(),
  linkedId: z.number().optional(),
  linkPrecedence: z.enum(["primary", "secondary"]).optional(),
});

export const identifySchema = z.object({
  email: z.string().email().optional(),
  phoneNumber: z.string().optional(),
});
