import { z } from "zod";
import { stringToNumber } from "@/utils/stringToNumber";

// ---------------------------------------------
// ✅ SMS Template Validation Schema
// ---------------------------------------------
export const SMSTemplateValidation = {
  //
  // ✅ Params Validation
  //
  params: {
    id: z.object({
      id: z.string().uuid("Invalid SMS template ID"),
    }),
    userId: z.object({
      userId: z.string().uuid("Invalid User ID"),
    }),
  },

  //
  // ✅ Query Validation (list, search, filters, etc.)
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
            return Math.min(Math.max(num, 1), 100); // Clamp between 1–100
          },
          z.number().int().min(1).max(100).default(10)
        ),
        search: z.string().optional(),
        sortBy: z
          .enum(["id", "name", "content", "createdAt", "updatedAt"])
          .default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      })
      .transform((data) => ({
        ...data,
        search:
          data.search && data.search.trim() !== "" ? data.search : undefined,
      })),

    search: z
      .object({
        q: z.string().min(1, "Search term is required").optional(),
        search: z.string().min(1, "Search term is required").optional(),
        limit: z.preprocess(
          (val) => {
            const num = stringToNumber(val) || 10;
            return Math.min(Math.max(num, 1), 50);
          },
          z.number().int().min(1).max(50).default(10)
        ),
      })
      .refine((data) => data.q || data.search, {
        message: 'Either "q" or "search" parameter is required',
        path: ["q"],
      }),
  },

  //
  // ✅ Body Validation (create / update)
  //
  body: {
    addTemplate: z
      .object({
        name: z
          .string()
          .min(2, "Template name must be at least 2 characters")
          .max(100)
          .trim(),
        content: z
          .string()
          .min(5, "Content must be at least 5 characters long")
          .max(1000)
          .trim(),
      })
      .strict(),

    updateTemplate: z
      .object({
        name: z.string().min(2).max(100).trim().optional(),
        content: z.string().min(5).max(1000).trim().optional(),
      })
      .strict()
      .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field must be provided for update",
      }),
  },
};

// ---------------------------------------------
// ✅ Type Exports for TS Integration
// ---------------------------------------------
export type SMSTemplateIdParams = z.infer<typeof SMSTemplateValidation.params.id>;
export type SMSTemplateListQuery = z.infer<typeof SMSTemplateValidation.query.list>;
export type SMSTemplateSearchQuery = z.infer<typeof SMSTemplateValidation.query.search>;
export type AddSMSTemplateInput = z.infer<typeof SMSTemplateValidation.body.addTemplate>;
export type UpdateSMSTemplateInput = z.infer<typeof SMSTemplateValidation.body.updateTemplate>;
