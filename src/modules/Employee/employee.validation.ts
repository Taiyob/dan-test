import { z } from "zod";
import { stringToNumber } from "@/utils/stringToNumber";

// ---------------------------------------------
// ✅ Employee Validation Schema
// ---------------------------------------------
export const EmployeeValidation = {
  //
  // ✅ Params Validation
  //
  params: {
    id: z.object({
      id: z.string().uuid("Invalid employee ID"),
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
        role: z.string().optional(),
        sortBy: z
          .enum([
            "id",
            "firstName",
            "lastName",
            "email",
            "phone",
            "role",
            "createdAt",
            "updatedAt",
          ])
          .default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
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
  // ✅ Body Validation (add / update)
  //
  body: {
    addEmployee: z
      .object({
        firstName: z
          .string()
          .min(2, "First name must be at least 2 characters")
          .max(100)
          .trim(),
        lastName: z
          .string()
          .min(2, "Last name must be at least 2 characters")
          .max(100)
          .trim(),
        email: z.string().email("Invalid email address").max(255),
        phone: z
          .string()
          .regex(/^[0-9+\-()\s]*$/, "Invalid phone number format")
          .max(20)
          .optional(),
        employeeId: z.string().max(50).optional(),
        employerId: z.string().uuid("Invalid employer ID"),
        role: z.string().max(50).optional(),
        additionalNotes: z.string().max(500).optional(),

        // ✅ Optional soft-delete fields
        isDeleted: z.boolean().default(false).optional(),
      })
      .strict(),

    updateEmployee: z
      .object({
        firstName: z.string().min(2).max(100).trim().optional(),
        lastName: z.string().min(2).max(100).trim().optional(),
        email: z.string().email().max(255).optional(),
        phone: z
          .string()
          .regex(/^[0-9+\-()\s]*$/, "Invalid phone number format")
          .max(20)
          .optional(),
        employeeId: z.string().max(50).optional(),
        role: z.string().max(50).optional(),
        additionalNotes: z.string().max(500).optional(),

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
export type EmployeeIdParams = z.infer<typeof EmployeeValidation.params.id>;
export type EmployeeListQuery = z.infer<typeof EmployeeValidation.query.list>;
export type EmployeeSearchQuery = z.infer<typeof EmployeeValidation.query.search>;
export type AddEmployeeInput = z.infer<typeof EmployeeValidation.body.addEmployee>;
export type UpdateEmployeeInput = z.infer<typeof EmployeeValidation.body.updateEmployee>;
