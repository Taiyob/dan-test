import { z } from "zod";
import { stringToNumber } from "@/utils/stringToNumber";

// ---------------------------------------------
// ✅ EmployeeCertification Validation Schema
// ---------------------------------------------
export const EmployeeCertificationValidation = {
  //
  // ✅ Params Validation
  //
  params: {
    id: z.object({
      id: z.string().uuid("Invalid employee certification ID"),
    }),
  },

  //
  // ✅ Query Validation (list, filters)
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
        // --- Key Filters ---
        employeeId: z.string().uuid("Invalid employee ID").optional(),
        certificationTemplateId: z.string().uuid("Invalid template ID").optional(),
        // ---
        sortBy: z
          .enum(["issueDate", "expiryDate", "createdAt"])
          .default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
        includeDeleted: z
          .preprocess(
            (val) => val === "true" || val === true,
            z.boolean().default(false)
          )
          .optional(),
      })
      .refine(
        (data) => data.employeeId || data.certificationTemplateId,
        "Either employeeId or certificationTemplateId must be provided"
      ),
  },

  //
  // ✅ Body Validation (add / update)
  //
  body: {
    addEmployeeCert: z
      .object({
        employeeId: z.string().uuid("Employee ID is required"),
        certificationTemplateId: z.string().uuid("Template ID is required"),
        issueDate: z
          .preprocess(
            (val) => (val ? new Date(val as string) : undefined),
            z.date().optional()
          )
          .nullable(),
        expiryDate: z
          .preprocess(
            (val) => (val ? new Date(val as string) : undefined),
            z.date().optional()
          )
          .nullable(),
        documentLinks: z.string().url("Invalid URL").optional().nullable(),
        additionalNotes: z.string().max(1000).optional().nullable(),
      })
      .strict(),

    updateEmployeeCert: z
      .object({
        issueDate: z
          .preprocess(
            (val) => (val ? new Date(val as string) : undefined),
            z.date().optional()
          )
          .nullable(),
        expiryDate: z
          .preprocess(
            (val) => (val ? new Date(val as string) : undefined),
            z.date().optional()
          )
          .nullable(),
        documentLinks: z.string().url("Invalid URL").optional().nullable(),
        additionalNotes: z.string().max(1000).optional().nullable(),
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
export type EmployeeCertificationIdParams = z.infer<
  typeof EmployeeCertificationValidation.params.id
>;
export type EmployeeCertificationListQuery = z.infer<
  typeof EmployeeCertificationValidation.query.list
>;
export type AddEmployeeCertificationInput = z.infer<
  typeof EmployeeCertificationValidation.body.addEmployeeCert
>;
export type UpdateEmployeeCertificationInput = z.infer<
  typeof EmployeeCertificationValidation.body.updateEmployeeCert
>;