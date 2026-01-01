import { z } from "zod";
import { stringToNumber } from "@/utils/stringToNumber";

// ---------------------------------------------
// Membership Validation Schema
// ---------------------------------------------
export const MembershipValidation = {
  //
  // Params Validation
  //
  params: {
    id: z.object({
      id: z.string().uuid("Invalid membership ID"),
    }),
  },

  //
  // Query Validation (list, search, filters, etc.)
  //
  query: {
    list: z
      .object({
        page: z.preprocess(
          (val) => stringToNumber(val) || 1,
          z.number().int().min(1).default(1)
        ),
        limit: z.preprocess(
          (val) => {
            const num = stringToNumber(val) || 10;
            return Math.min(Math.max(num, 1), 100);
          },
          z.number().int().min(1).max(100).default(10)
        ),
        subscriptionStatus: z
          .enum(["active", "canceled", "expired", "pending"])
          .optional(),
        paymentStatus: z
          .enum([
            "pending",
            "processing",
            "completed",
            "failed",
            "cancelled",
            "refunded",
            "partially_refunded",
          ])
          .optional(),
        sortBy: z
          .enum(["id", "startDate", "endDate", "renewalAt", "createdAt"])
          .default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      })
  },

  //
  // Body Validation (add / update)
  //
  body: {
    addMembership: z
      .object({
        userId: z.string().uuid("Invalid user ID"),
        planId: z.string().uuid("Invalid plan ID"),
        stripeCustomerID: z.string().optional(),
        subscriptionStatus: z
          .enum(["active", "canceled", "expired", "pending"])
          .default("pending"),
        paymentStatus: z
          .enum([
            "pending",
            "processing",
            "completed",
            "failed",
            "cancelled",
            "refunded",
            "partially_refunded",
          ])
          .default("pending"),
        paymentGateway: z.enum(["stripe"]).default("stripe"),
        startDate: z.preprocess((val) => (val ? new Date(val as string) : new Date()), z.date().optional()),
        endDate: z.preprocess((val) => (val ? new Date(val as string) : undefined), z.date().optional()),
        renewalAt: z.preprocess((val) => (val ? new Date(val as string) : undefined), z.date().optional()),
        amountPaid: z.preprocess(
          (val) => (val ? Number(val) : undefined),
          z.number().min(0).optional()
        ),
        transactionId: z.string().optional(),
      })
      .strict(),

    updateMembership: z
      .object({
        planId: z.string().uuid("Invalid plan ID").optional(),
        stripeCustomerID: z.string().optional(),
        subscriptionStatus: z
          .enum(["active", "canceled", "expired", "pending"])
          .optional(),
        paymentStatus: z
          .enum([
            "pending",
            "processing",
            "completed",
            "failed",
            "cancelled",
            "refunded",
            "partially_refunded",
          ])
          .optional(),
        endDate: z.preprocess((val) => (val ? new Date(val as string) : undefined), z.date().optional()),
        canceledAt: z.preprocess((val) => (val ? new Date(val as string) : undefined), z.date().optional()),
        renewalAt: z.preprocess((val) => (val ? new Date(val as string) : undefined), z.date().optional()),
        amountPaid: z.preprocess(
          (val) => (val ? Number(val) : undefined),
          z.number().min(0).optional()
        ),
        transactionId: z.string().optional(),
      })
      .strict()
      .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field must be provided for update",
      }),
      changePlan: z
      .object({
        newPlanId: z.string().uuid("Invalid plan ID"),
        billing: z.enum(["monthly", "annual"]).default("annual"),
      })
      .strict(),
  },
};

// ---------------------------------------------
// ✅ Type Exports for TS Integration
// ---------------------------------------------
export type MembershipIdParams = z.infer<typeof MembershipValidation.params.id>;
export type MembershipListQuery = z.infer<typeof MembershipValidation.query.list>;
export type AddMembershipInput = z.infer<typeof MembershipValidation.body.addMembership>;
export type UpdateMembershipInput = z.infer<typeof MembershipValidation.body.updateMembership>;
export type ChangePlanInput = z.infer<typeof MembershipValidation.body.changePlan>;