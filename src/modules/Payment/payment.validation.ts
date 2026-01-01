import { z } from "zod";

export const PaymentValidation = {
  body: {
    checkout: z.object({
      planId: z.string().uuid(),
      billing: z.enum(["monthly", "annual"]).default("annual"),
      userId: z.string().uuid(),
      email: z.string().email().optional(),
    }).strict(),
  },
};

export type CreateCheckoutInput = z.infer<typeof PaymentValidation.body.checkout>;
