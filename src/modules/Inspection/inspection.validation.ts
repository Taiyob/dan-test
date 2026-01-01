import { z } from "zod";
import { stringToNumber } from "@/utils/stringToNumber";
import { InspectionType, NotificationMethod } from "@prisma/client";

// ---------------------------------------------
// ENUMS (from Prisma schema)
// ---------------------------------------------

export const InspectionTypeEnum = z.enum([
  "pre_operation",
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "semi_annual",
  "annual",
  "preventive_maintenance",
  "corrective_maintenance",
  "repair",
  "safety",
  "calibration",
  "performance",
  "load_test",
  "electrical",
  "structural",
  "environmental",
  "fire_safety",
  "installation",
  "post_incident",
  "shutdown",
  "commissioning",
  "special",
  'days_2_before',     
  'days_15_before',
  'days_30_before',
]); //

export const InspectionStatusEnum = z.enum([
  "scheduled",
  "not_scheduled",
  "in_progress",
  "completed",
  "overdue",
  "due_soon",
  "cancelled",
]);

// --------------------------------------------
// ✅ Inspection Validation Schema
// --------------------------------------------

export const InspectionValidation = {
  //
  // ✅ Params Validation
  //
  params: {
    id: z.object({
      id: z.string().uuid("Invalid inspection ID"),
    }),
  },

  //
  // ✅ Query Validation (list, filters, pagination)
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
        status: InspectionStatusEnum.optional(),
        sortBy: z
          .enum([
            "id",
            "dueDate",
            "lastInspected",
            "completedAt",
            "createdAt",
            "updatedAt",
          ])
          .default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
        clientId: z.string().uuid("Invalid client ID").optional(),
      })
      .transform((data) => ({
        ...data,
        search:
          data.search && data.search.trim() !== "" ? data.search : undefined,
      })),
  },

  //
  // Body Validation (add / update)
  //
  body: {
    // -------------------
    // Add Inspection
    // -------------------
    addInspection: z
  .object({
    clientId: z.uuid("Invalid client ID"),
    assetId: z.uuid("Invalid asset ID"),
    inspectionType: z.nativeEnum(InspectionType),
    inspectorIds: z.array(z.string().uuid("Invalid inspector ID")).optional(),
    dueDate: z.preprocess(
      (val) => (val ? new Date(val as string) : undefined),
      z.date().optional()
    ),
    lastInspected: z.preprocess(
      (val) => (val ? new Date(val as string) : undefined),
      z.date().optional()
    ),
    completedAt: z.preprocess(
      (val) => (val ? new Date(val as string) : undefined),
      z.date().optional()
    ),
    status: InspectionStatusEnum.optional(),
    location: z.string().max(255).optional(),
    inspectionNotes: z.string().max(500).optional(),
    emailTemplateId: z.string().uuid().optional().nullable(),
    smsTemplateId: z.string().uuid().optional().nullable(),
    notificationMethod: z.enum(["sms", "email", "both"]),
    reminderMessageSource: z.enum(["template", "manual"]).optional(), // optional করলাম, default template ধরে নেব
    manualReminderMessage: z.string().min(10, "Manual message must be at least 10 characters").optional(),
  })
  .superRefine((data, ctx) => {
    // যদি manual mode হয়, তাহলে templateId required না
    const isManual = data.reminderMessageSource === "manual";

    if (!isManual) {
      // Template mode → templateId required
      if (
        (data.notificationMethod === "email" || data.notificationMethod === "both") &&
        !data.emailTemplateId
      ) {
        ctx.addIssue({
          path: ["emailTemplateId"],
          message: "emailTemplateId is required for email notifications when using template",
          code: z.ZodIssueCode.custom,
        });
      }

      if (
        (data.notificationMethod === "sms" || data.notificationMethod === "both") &&
        !data.smsTemplateId
      ) {
        ctx.addIssue({
          path: ["smsTemplateId"],
          message: "smsTemplateId is required for SMS notifications when using template",
          code: z.ZodIssueCode.custom,
        });
      }
    }

    // Manual mode এ যদি message না থাকে, তাহলে error
    if (isManual && (!data.manualReminderMessage || data.manualReminderMessage.trim().length < 10)) {
      ctx.addIssue({
        path: ["manualReminderMessage"],
        message: "Manual reminder message is required and must be at least 10 characters when using manual mode",
        code: z.ZodIssueCode.custom,
      });
    }
  }),
      // .strict(),

    // -------------------
    // Update Inspection
    // -------------------
    updateInspection: z
      .object({
        inspectionType: z.nativeEnum(InspectionType).optional(),
        status: InspectionStatusEnum.optional(),
        dueDate: z.preprocess(
          (val) => (val ? new Date(val as string) : undefined),
          z.date().optional()
        ),
        lastInspected: z.preprocess(
          (val) => (val ? new Date(val as string) : undefined),
          z.date().optional()
        ),
        completedAt: z.preprocess(
          (val) => (val ? new Date(val as string) : undefined),
          z.date().optional()
        ),
        location: z.string().max(255).optional(),
        inspectionNotes: z.string().max(500).optional(),
        inspectorIds: z
          .array(z.string().uuid("Invalid inspector ID"))
          .optional(),
      })
      .strict()
      .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field must be provided for update",
      }),
  },
};

// ---------------------------------------------
// Type Exports for TS Integration
// ---------------------------------------------
export type InspectionIdParams = z.infer<typeof InspectionValidation.params.id>;
export type InspectionListQuery = z.infer<typeof InspectionValidation.query.list>;
export type AddInspectionInput = z.infer<typeof InspectionValidation.body.addInspection>;
export type UpdateInspectionInput = z.infer<typeof InspectionValidation.body.updateInspection>;
