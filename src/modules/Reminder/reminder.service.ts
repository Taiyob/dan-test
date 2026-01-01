import { BaseService } from "@/core/BaseService";
import { AppLogger } from "@/core/logging/logger";
import { NotFoundError } from "@/core/errors/AppError";
import { PrismaClient, Reminder } from "@prisma/client";

import {
  AddReminderInput,
  ReminderListQuery,
  UpdateReminderInput,
} from "./reminder.validation";

// ---------------------------------------------
// Reminder Service
// ---------------------------------------------
export class ReminderService extends BaseService<Reminder> {

  protected mergeFilters(baseFilters: any, extraFilters: any) {
    return { ...baseFilters, ...extraFilters };
  }

  protected applyFilters(query: any): any {
    // Example: convert your query into Prisma filters
    const filters: any = {};

    if (query.clientId) filters.clientId = query.clientId;
    if (query.assetId) filters.assetId = query.assetId;
    if (query.reminderType) filters.reminderType = query.reminderType;

    return filters;
  }

  constructor(prisma: PrismaClient) {
    super(prisma, "Reminder", {
      enableSoftDelete: true,
      enableAuditFields: true,
    });
  }

  protected getModel() {
    return this.prisma.reminder;
  }

  /**
   * Create a new Reminder
   */

  async createReminder(
  data: AddReminderInput & { inspectorIds?: string[] }
): Promise<Reminder> {
  const {
    clientId,
    assetId,
    inspectorIds = [],
    notificationMethod,
    emailTemplateId, 
    ...rest
  } = data;

  const finalNotificationMethod = Array.isArray(notificationMethod)
    ? notificationMethod
    : [notificationMethod].filter(Boolean);

  return this.prisma.$transaction(async (tx) => {
    const reminder = await tx.reminder.create({
      data: {
        clientId,
        assetId,
        notificationMethod: notificationMethod,
        reminderType: rest.reminderType,
        reminderDate: new Date(rest.reminderDate),
        manualReminderMessage: rest.manualReminderMessage,
        additionalNotes: rest.additionalNotes || `Auto-generated reminder`,
        reminderStatus: "scheduled",
        smsTemplateId: rest.smsTemplateId || undefined,
        // ei line important — jodi na thake null hobe
        emailTemplateId: emailTemplateId || undefined, 
      },
    });

    if (inspectorIds.length > 0) {
      await tx.reminderInspector.createMany({
        data: inspectorIds.map((id) => ({
          reminderId: reminder.id,
          employeeId: id,
        })),
        skipDuplicates: true,
      });
    }
    // if (inspectorIds.length > 0) {
    //   for (const employeeId of inspectorIds) {
    //     await tx.reminderInspector.upsert({
    //       where: {
    //         reminderId_employeeId: {
    //           reminderId: reminder.id,
    //           employeeId,
    //         },
    //       },
    //       update: {},
    //       create: {
    //         reminderId: reminder.id,
    //         employeeId,
    //       },
    //     });
    //   }
    // }

    return reminder;
  });
}

  // async createReminder(data: AddReminderInput): Promise<Reminder> {
  //   AppLogger.info(`Creating Reminder for client ${data.clientId}`);

  //   // ✅ FIX: Transform the notificationMethod string into an array
  //   const transformedData = {
  //     ...data,
  //     notificationMethod: [data.notificationMethod], 
  //   };

  //   transformedData.reminderStatus="scheduled";

  //   const reminder = await this.create(transformedData);
  //   AppLogger.info(`Reminder created (ID: ${reminder.id})`);
  //   return reminder;
  // }

  // async createReminder(data: AddReminderInput & { inspectorIds?: string[] }): Promise<Reminder> {
  //   const {
  //     clientId,
  //     assetId,
  //     inspectorIds = [],
  //     notificationMethod,
  //     emailTemplateId,
  //     smsTemplateId,
  //     manualEmailBody,
  //     manualSmsBody,
  //     reminderMessageSource,
  //     ...rest
  //   } = data;

  //   return this.prisma.$transaction(async (tx) => {
  //     const reminder = await tx.reminder.create({
  //       data: {
  //         clientId,
  //         assetId,
  //         notificationMethod,
  //         reminderType: rest.reminderType,
  //         reminderDate: rest.reminderDate ? new Date(rest.reminderDate) : null,
  //         additionalNotes: rest.additionalNotes,
  //         reminderStatus: "scheduled",

  //         // NEW: conditional template vs manual
  //         emailTemplateId: reminderMessageSource === "template" ? emailTemplateId : null,
  //         smsTemplateId: reminderMessageSource === "template" ? smsTemplateId : null,
  //         manualEmailBody: reminderMessageSource === "manual" ? manualEmailBody : null,
  //         manualSmsBody: reminderMessageSource === "manual" ? manualSmsBody : null,
  //       },
  //     });

  //     if (inspectorIds.length > 0) {
  //       await tx.reminderInspector.createMany({
  //         data: inspectorIds.map((employeeId) => ({
  //           reminderId: reminder.id,
  //           employeeId,
  //         })),
  //         skipDuplicates: true,
  //       });
  //     }

  //     return reminder;
  //   });
  // }

  /**
   * Get all Reminders with optional filtering, search, and pagination
   */
  async getReminders(query: ReminderListQuery) {
    const { page, limit, search, sortBy = "createdAt", sortOrder = "desc", ...rest } = query;

    let filters: any = {};
    if (search) {
      filters.OR = [
        { reminderType: { contains: search, mode: "insensitive" } },
        { notificationMethod: { has: search } }, // This .ts file
      ];
    }

    filters = this.mergeFilters(filters, this.applyFilters(rest));

    const result = await this.findMany(
      filters,
      { page, limit, offset: (page - 1) * limit },
      { [sortBy]: sortOrder },
      {
        client: true,
        asset: true 
      }
    );

    AppLogger.info(`📅 Reminders found: ${result.data.length}`);
    return result;
  }

  async getRemindersByClient(
    query: ReminderListQuery,
    userId: string,
    role: string
  ) {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
      clientId: queryClientId, 
      assetId,
      reminderType,
    } = query;

    const filters: any = {
      isDeleted: false,
      client: {
        ownerId: userId,
      },
    };

    if (queryClientId) {
      filters.client.AND = [
        { ownerId: userId },
        { id: queryClientId },
      ];
    }

    // Other filters
    if (assetId) {
      filters.assetId = assetId;
    }

    if (reminderType) {
      filters.reminderType = reminderType;
    }

    // Search
    if (search) {
      filters.OR = [
        { additionalNotes: { contains: search, mode: "insensitive" } },
        { manualReminderMessage: { contains: search, mode: "insensitive" } },
        { reminderType: { contains: search, mode: "insensitive" } },
        { asset: { name: { contains: search, mode: "insensitive" } } },
        { asset: { serialNo: { contains: search, mode: "insensitive" } } },
        { client: { company: { contains: search, mode: "insensitive" } } },
      ];
    }

    return this.findMany(
      filters,
      { page, limit, offset: (page - 1) * limit },
      { [sortBy]: sortOrder },
      {
        client: true,
        asset: true,
        //inspectors: { include: { employee: true } },
        //emailTemplate: true,
        //smsTemplate: true,
      }
    );
  }

  /**
   * Get a Reminder by ID
   */
  async getReminderById(id: string): Promise<Reminder> {
    const reminder = await this.findById(id, { asset: true });
    if (!reminder) throw new NotFoundError("Reminder");
    return reminder;
  }

  /**
   * Update a Reminder by ID
   */
  async updateReminder(id: string, data: UpdateReminderInput): Promise<Reminder> {
    const exists = await this.exists({ id });
    if (!exists) throw new NotFoundError("Reminder");

    // FIX: Also transform notificationMethod on update, if it's provided
    const transformedData: any = { ...data };
    if (data.notificationMethod) {
      transformedData.notificationMethod = [data.notificationMethod];
    }

    const updated = await this.updateById(id, transformedData);
    AppLogger.info(`Reminder updated (ID: ${updated.id})`);
    return updated;
  }

  /**
   * Soft Delete a Reminder by ID
   */
  async deleteReminder(id: string): Promise<Reminder> {
    const exists = await this.exists({ id });
    if (!exists) throw new NotFoundError("Reminder");

    const deleted = await this.deleteById(id);
    AppLogger.info(`Reminder deleted (ID: ${deleted.id})`);
    return deleted;
  }
}