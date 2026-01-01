import { z } from "zod";
import { stringToNumber } from "@/utils/stringToNumber";

// ---------------------------------------------
// ✅ CertificationTemplate Validation Schema
// ---------------------------------------------
export const CertificationTemplateValidation = {
  //
  // ✅ Params Validation
  //
  params: {
    id: z.object({
      id: z.string().uuid("Invalid certification template ID"),
    }),
  },

  //
  // ✅ Query Validation (list, search, filters)
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
        search: z.string().optional(),
        sortBy: z.enum(["name", "createdAt", "updatedAt"]).default("name"),
        sortOrder: z.enum(["asc", "desc"]).default("asc"),
        includeDeleted: z
          .preprocess(
            (val) => val === "true" || val === true,
            z.boolean().default(false)
          )
          .optional(),
      })
      .transform((data) => ({
        ...data,
        search:
          data.search && data.search.trim() !== "" ? data.search : undefined,
      })),
  },

  //
  // ✅ Body Validation (add / update)
  //
  body: {
    addTemplate: z
      .object({
        name: z
          .string()
          .min(2, "Template name must be at least 2 characters")
          .max(255),
        description: z.string().max(1000).optional().nullable(),
      })
      .strict(),

    updateTemplate: z
      .object({
        name: z.string().min(2).max(255).optional(),
        description: z.string().max(1000).optional().nullable(),
        isDeleted: z.boolean().optional(),
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
export type CertificationTemplateIdParams = z.infer<
  typeof CertificationTemplateValidation.params.id
>;
export type CertificationTemplateListQuery = z.infer<
  typeof CertificationTemplateValidation.query.list
>;
export type AddCertificationTemplateInput = z.infer<
  typeof CertificationTemplateValidation.body.addTemplate
>;
export type UpdateCertificationTemplateInput = z.infer<
  typeof CertificationTemplateValidation.body.updateTemplate
>;