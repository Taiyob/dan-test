import { z } from "zod";

export const PlanValidation = {
  params: {
    id: z.object({ id: z.string().uuid("Invalid plan ID") }),
  },
  query: {
    list: z.object({
      page: z.preprocess((v) => {
        const num = typeof v === 'string' ? parseInt(v, 10) : typeof v === 'number' ? v : 1;
        return Number.isFinite(num) && num > 0 ? num : 1;
      }, z.number().int().min(1).default(1)),
      limit: z.preprocess((v) => {
        const num = typeof v === 'string' ? parseInt(v, 10) : typeof v === 'number' ? v : 10;
        const clamped = Math.min(Math.max(Number.isFinite(num) ? num : 10, 1), 100);
        return clamped;
      }, z.number().int().min(1).max(100).default(10)),
      sortBy: z.enum(["createdAt","updatedAt","name","price"]).default("createdAt"),
      sortOrder: z.enum(["asc","desc"]).default("desc"),
    }),
  },
  body: {
    create: z.object({
      name: z.string().min(2),
      description: z.string().optional(),
      price: z.preprocess((v) => {
        const num = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : 0;
        return Number.isFinite(num) ? num : 0;
      }, z.number().min(0)),
      billingCycle: z.enum(["monthly","annual"]).default("monthly"),
      features: z.array(z.string()).default([]),
      limits: z.any().optional(),
    }).strict(),

    // নতুন add করো: update schema
    update: z.object({
      name: z.string().min(2).optional(),
      description: z.string().optional(),
      price: z.preprocess((v) => {
        const num = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : undefined;
        return num;
      }, z.number().min(0).optional()),
      billingCycle: z.enum(["monthly","annual"]).optional(),
      features: z.array(z.string()).optional(),
      limits: z.any().optional(),
    }).strict(),

    seedDefaults: z.object({
      applyAnnualDiscount: z.boolean().default(true),
      discountPercent: z.preprocess((v) => {
        const num = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : 10;
        return Number.isFinite(num) ? num : 10;
      }, z.number().min(0).max(100).default(10)),
    }).strict(),

    changeStatus: z.object({
      status: z.enum(["active", "inactive", "draft", "archived"]),
    }).strict(),
  },
};

// Types export করো
export type AddPlanInput = z.infer<typeof PlanValidation.body.create>;
export type UpdatePlanInput = z.infer<typeof PlanValidation.body.update>;  
export type SeedPlanInput = z.infer<typeof PlanValidation.body.seedDefaults>;
export type ChangePlanStatusInput = z.infer<typeof PlanValidation.body.changeStatus>;

// import { z } from "zod";

// export const PlanValidation = {
//   params: {
//     id: z.object({ id: z.string().uuid("Invalid plan ID") }),
//   },
//   query: {
//     list: z.object({
//       page: z.preprocess((v) => {
//         const num = typeof v === 'string' ? parseInt(v, 10) : typeof v === 'number' ? v : 1;
//         return Number.isFinite(num) && num > 0 ? num : 1;
//       }, z.number().int().min(1).default(1)),
//       limit: z.preprocess((v) => {
//         const num = typeof v === 'string' ? parseInt(v, 10) : typeof v === 'number' ? v : 10;
//         const clamped = Math.min(Math.max(Number.isFinite(num) ? num : 10, 1), 100);
//         return clamped;
//       }, z.number().int().min(1).max(100).default(10)),
//       sortBy: z.enum(["createdAt","updatedAt","name","price"]).default("createdAt"),
//       sortOrder: z.enum(["asc","desc"]).default("desc"),
//     }),
//   },
//   body: {
//     create: z.object({
//       name: z.string().min(2),
//       description: z.string().optional(),
//       price: z.preprocess((v) => {
//         const num = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : 0;
//         return Number.isFinite(num) ? num : 0;
//       }, z.number().min(0)),
//       billingCycle: z.enum(["monthly","annual"]).default("monthly"),
//       features: z.array(z.string()).default([]),
//       limits: z.any().optional(),
//     }).strict(),
//     seedDefaults: z.object({
//       applyAnnualDiscount: z.boolean().default(true),
//       discountPercent: z.preprocess((v) => {
//         const num = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : 10;
//         return Number.isFinite(num) ? num : 10;
//       }, z.number().min(0).max(100).default(10)),
//     }).strict(),
//   },
// };

// export type AddPlanInput = z.infer<typeof PlanValidation.body.create>;
// export type SeedPlanInput = z.infer<typeof PlanValidation.body.seedDefaults>;
