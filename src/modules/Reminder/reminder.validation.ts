import { z } from "zod";

// ---------------------------
// Shared enums (match frontend modal)
const ReminderTypeEnum = z.enum([
  "weekly",
  "monthly",
  "quarterly",
  "semi_annual",
  "annual",
  "one_time",
  "days_2_before",
  "days_15_before",
  "days_30_before",
]);

const NotificationMethodEnum = z.enum(["email", "sms", "both"]);

// ---------------------------
// Reminder Validation
export const ReminderValidation = {
  params: {
    id: z.object({
      id: z.string().uuid("Invalid reminder ID"),
    }),
  },

  query: {
    list: z
      .object({
        page: z.preprocess((val) => Number(val) || 1, z.number().int().min(1).default(1)),
        limit: z.preprocess((val) => Math.min(Math.max(Number(val) || 10, 1), 100), z.number().int().min(1).max(100).default(10)),
        search: z.string().optional(),
        sortBy: z.enum(["id", "reminderType", "reminderDate", "createdAt", "updatedAt"]).default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
        // These fields were missing from the schema but are in your service.
        // Add them here if you want to validate them.
        clientId: z.string().uuid().optional(),
        assetId: z.string().uuid().optional(),
        reminderType: ReminderTypeEnum.optional(),
      })
      .transform((data) => ({
        ...data,
        search: data.search?.trim() !== "" ? data.search : undefined,
      })),
  },

  body: {
    // Add Reminder
    addReminder: z.object({
      clientId: z.string().uuid("Invalid client ID"),
      assetId: z.string().uuid("Invalid asset ID"),
      notificationMethod: NotificationMethodEnum,
      reminderType: ReminderTypeEnum,
      reminderStatus: z.string().optional(),
      reminderTemplateId: z.string().optional(),
      manualReminderMessage: z.string().min(10, "Message is required").optional(),
      reminderDate: z.string(),
      additionalNotes: z.string().optional(),
      smsTemplateId: z.string().uuid().optional(),
      emailTemplateId: z.string().uuid().optional(),
      //reminderMessageSource: z.enum(["template", "manual"]).optional(),
      //manualEmailBody: z.string().optional(),
      //manualSmsBody: z.string().optional(),
    }),

    // Update Reminder
    updateReminder: z
      .object({
        clientId: z.string().uuid().optional(),
        assetId: z.string().uuid().optional(),
        notificationMethod: NotificationMethodEnum.optional(),
        reminderType: ReminderTypeEnum.optional(),
        reminderStatus: z.string().optional(),
        reminderTemplateId: z.string().optional(),
        manualReminderMessage: z.string().min(10).optional(),
        reminderDate: z.date().optional(),
        additionalNotes: z.string().optional(),
        isDeleted: z.boolean().optional(),
      })
      .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field must be provided for update",
      }),
  },
};

// ---------------------------
// Types for TS
export type AddReminderInput = z.infer<typeof ReminderValidation.body.addReminder>;
export type UpdateReminderInput = z.infer<typeof ReminderValidation.body.updateReminder>;

// ✅ ADD THIS LINE TO FIX THE ERROR
export type ReminderListQuery = z.infer<typeof ReminderValidation.query.list>;