// fileName: client.validation.ts

import { z } from "zod";
import { stringToNumber } from "@/utils/stringToNumber";

// ---------------------------------------------
// ✅ Base Schemas for Reusability (NEW)
// ---------------------------------------------

// Base schema for adding a single client 
const BaseAddClientSchema = z
  .object({
    company: z
      .string()
      .min(2, "Company name must be at least 2 characters")
      .max(100, "Company name must not exceed 100 characters")
      .trim(),
    name: z
      .string()
      .min(2, "Client name must be at least 2 characters")
      .max(100, "Client name must not exceed 100 characters")
      .trim(),
    email: z
      .string()
      .email("Invalid email address")
      .max(255, "Email must not exceed 255 characters"),
    phone: z
      .string()
      .regex(/^[0-9+\-()\s]*$/, "Invalid phone number format")
      .max(20)
      .optional(),
    cranes: z
      .preprocess(
        (val) => stringToNumber(val) || 0,
        z.number().int().min(0)
      )
      .default(0),
    location: z.string().max(255).optional(),
    additionalNote: z.string().max(500).optional(),
    status: z.enum(["active", "inactive", "archived"]),
    ownerId: z.string().uuid("Invalid owner ID"),
  })
  .strict();


// ---------------------------------------------
// ✅ Client Validation Schema (Updated Body)
// ---------------------------------------------
export const ClientValidation = {
  // ... (params and query remain the same) ...
  params: {
    id: z.object({
      id: z.string().uuid("Invalid client ID"),
    }),
  },

  query: { /* ... (list and search schemas remain the same) ... */ 
    list: z
      .object({
        page: z.preprocess(
          (val) => stringToNumber(val) || 1,
          z.number().int().min(1).default(1)
        ),
        limit: z.preprocess((val) => {
          const num = stringToNumber(val) || 10;
          return Math.min(Math.max(num, 1), 100); // Clamp between 1–100
        }, z.number().int().min(1).max(100).default(10)),
        search: z.string().optional(),
        status: z.enum(["active", "inactive", "archived"]).optional(),
        sortBy: z
          .enum([
            "id",
            "company",
            "name",
            "email",
            "phone",
            "status",
            "cranes",
            "createdAt",
            "updatedAt",
          ])
          .default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      })
      .transform((data) => ({
        ...data,
        search:
          data.search && data.search.trim() !== "" ? data.search : undefined,
        status:
          typeof data.status === "string" && data.status.trim() === ""
            ? undefined
            : data.status,
      })),

    search: z
      .object({
        q: z.string().min(1, "Search term is required").optional(),
        search: z.string().min(1, "Search term is required").optional(),
        limit: z.preprocess((val) => {
          const num = stringToNumber(val) || 10;
          return Math.min(Math.max(num, 1), 50);
        }, z.number().int().min(1).max(50).default(10)),
      })
      .refine((data) => data.q || data.search, {
        message: 'Either "q" or "search" parameter is required',
        path: ["q"],
      }),
  },
  
  //
  // ✅ Body Validation (add / update / batch)
  //
  body: {
    // Manual Single Client Add 
    addClient: BaseAddClientSchema,

    //  Batch/Multiple Client Add Schema
    addMultipleClients: z
      .array(BaseAddClientSchema) // Apply the single client validation to every item
      .min(1, "The payload must contain at least one client object.")
      .max(100, "Batch limit exceeded. Cannot process more than 100 clients at once.")
      // Optional: Check for duplicate emails within the batch
      .refine(
        (clients) => {
          const emails = clients.map(client => client.email?.toLowerCase()).filter(Boolean);
          return new Set(emails).size === emails.length;
        },
        {
          message: "Duplicate emails found within the batch.",
          path: ['email_uniqueness_check'],
        }
      ),

    //  Update Client 
    updateClient: z
      .object({
        company: z
          .string()
          .min(2, "Company name must be at least 2 characters")
          .max(100)
          .trim()
          .optional(),
        name: z
          .string()
          .min(2, "Client name must be at least 2 characters")
          .max(100)
          .trim()
          .optional(),
        email: z.string().email("Invalid email address").max(255).optional(),
        phone: z
          .string()
          .regex(/^[0-9+\-()\s]*$/, "Invalid phone number format")
          .max(20)
          .optional(),
        cranes: z
          .preprocess((val) => stringToNumber(val), z.number().int().min(0))
          .optional(),
        location: z.string().max(255).optional(),
        additionalNote: z.string().max(500).optional(),
        status: z.enum(["active", "inactive", "archived"]).optional(),
      })
      .strict()
      .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field must be provided for update",
      }),
  },
};

// ---------------------------------------------
// ✅ Type Exports for TS Integration (Updated)
// ---------------------------------------------
export type ClientIdParams = z.infer<typeof ClientValidation.params.id>;
export type ClientListQuery = z.infer<typeof ClientValidation.query.list>;
export type ClientSearchQuery = z.infer<typeof ClientValidation.query.search>;
export type AddClientInput = z.infer<typeof ClientValidation.body.addClient>;
export type AddMultipleClientsInput = z.infer<typeof ClientValidation.body.addMultipleClients>;
export type UpdateClientInput = z.infer<typeof ClientValidation.body.updateClient>;