import { z } from "zod";

export const AccessControlValidation = {
  //
  // ✅ Params Validation
  //
  params: {
    id: z.object({
      id: z.string().uuid("Invalid AccessControl ID"),
    }),
  },

  //
  // ✅ Query Validation
  //
  query: {
    list: z
      .object({
        page: z.preprocess(
          (val) => Number(val) || 1,
          z.number().int().min(1).default(1)
        ),
        limit: z.preprocess(
          (val) => Number(val) || 10,
          z.number().int().min(1).max(100).default(10)
        ),
        sortBy: z.enum([
          "id",
          "maxClients",
          "maxEmployees",
          "maxCranes",
          "maxStorageGB",
          "enableAPI",
          "enableReports",
          "createdAt",
          "updatedAt",
        ]).default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      }),
  },

  //
  // ✅ Body Validation
  //
  body: {
    addAccessControl: z
      .object({
        membershipId: z.string().uuid("Invalid membership ID"),
        maxClients: z.number().int().min(0).default(25),
        maxEmployees: z.number().int().min(0).default(10),
        maxCranes: z.number().int().min(0).default(50),
        maxStorageGB: z.number().int().min(0).default(10),
        enableAPI: z.boolean().default(false),
        enableReports: z.boolean().default(true),
      })
      .strict(),

    updateAccessControl: z
      .object({
        maxClients: z.number().int().min(0).optional(),
        maxEmployees: z.number().int().min(0).optional(),
        maxCranes: z.number().int().min(0).optional(),
        maxStorageGB: z.number().int().min(0).optional(),
        enableAPI: z.boolean().optional(),
        enableReports: z.boolean().optional(),
      })
      .strict()
      .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field must be provided for update",
      }),
  },
};

// ---------------------------------------------
// ✅ Type Exports
// ---------------------------------------------
export type AccessControlIdParams = z.infer<typeof AccessControlValidation.params.id>;
export type AccessControlListQuery = z.infer<typeof AccessControlValidation.query.list>;
export type AddAccessControlInput = z.infer<typeof AccessControlValidation.body.addAccessControl>;
export type UpdateAccessControlInput = z.infer<typeof AccessControlValidation.body.updateAccessControl>;
