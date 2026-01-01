import { z } from "zod";
import { stringToNumber } from "@/utils/stringToNumber";

// ✅ Asset Validation Schema
export const AssetValidation = {
  params: {
    id: z.object({
      id: z.string().uuid("Invalid asset ID"),
    }),
  },

  query: {
    list: z
      .object({
        page: z.preprocess((val) => stringToNumber(val) || 1, z.number().int().min(1).default(1)),
        limit: z.preprocess(
          (val) => Math.min(Math.max(stringToNumber(val) || 10, 1), 100),
          z.number().int().min(1).max(100).default(10)
        ),
        search: z.string().optional(),
        clientId: z.string().uuid("Invalid client ID filter").optional(),
        status: z.string().optional(),
        sortBy: z.enum(["id", "name", "serialNo", "createdAt", "updatedAt"]).default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      })
      .transform((data) => ({
        ...data,
        search: data.search && data.search.trim() !== "" ? data.search : undefined,
      })),
  },

  body: {
    addAsset: z
      .object({
        clientId: z.string().uuid("Invalid client ID is required"),
        name: z.string().max(100).optional(),
        model: z.string().max(100).optional(),
        description: z.string().max(500).optional(),
        serialNo: z.string().max(100).optional(),
        location: z.string().max(255).optional(),
        status: z.string().max(50).optional(),
      })
      .strict(),

    updateAsset: z
      .object({
        name: z.string().max(100).optional(),
        model: z.string().max(100).optional(),
        description: z.string().max(500).optional(),
        serialNo: z.string().max(100).optional(),
        location: z.string().max(255).optional(),
        status: z.string().max(50).optional(),
      })
      .strict()
      .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field must be provided for update",
      }),
  },
};

// ✅ Type exports
export type AssetIdParams = z.infer<typeof AssetValidation.params.id>;
export type AssetListQuery = z.infer<typeof AssetValidation.query.list>;
export type AddAssetInput = z.infer<typeof AssetValidation.body.addAsset>;
export type UpdateAssetInput = z.infer<typeof AssetValidation.body.updateAsset>;
