import { BaseService } from "@/core/BaseService";
import { AppError, ConflictError, NotFoundError } from "@/core/errors/AppError";
import { AppLogger } from "@/core/logging/logger";
import { scheduleJob } from "@/services/schedulerService";
import { config } from "@/core/config";
import { Inspection, InspectionType, PrismaClient, Reminder, ReminderType } from "@prisma/client";
import { addMinutes, subDays, format, addDays, addMonths, isBefore } from "date-fns";
import {
  AddInspectionInput,
  InspectionListQuery,
  UpdateInspectionInput,
} from "./inspection.validation";
import { MailtrapEmailService } from "@/services/MailtrapEmailService";
import { ReminderService } from "../Reminder/reminder.service";
import TwilioSMSService from "@/services/TwilioSMSService";

export class InspectionService extends BaseService<Inspection> {
  constructor(prisma: PrismaClient) {
    super(prisma, "Inspection", {
      enableSoftDelete: true,
      enableAuditFields: true,
    });
  }

  protected getModel() {
    return this.prisma.inspection;
  }

  private isRecurringType(type: InspectionType): boolean {
    return ["weekly", "monthly", "quarterly", "semi_annual", "annual"].includes(type);
  }

  private getNextDueDate(currentDue: Date, type: InspectionType): Date {
    switch (type) {
      case "weekly": return addDays(currentDue, 7);
      case "monthly": return addMonths(currentDue, 1);
      case "quarterly": return addMonths(currentDue, 3);
      case "semi_annual": return addMonths(currentDue, 6);
      case "annual": return addMonths(currentDue, 12);
      default: return currentDue;
    }
  }

  private getReminderDaysBefore(reminderType: ReminderType): number {
    switch (reminderType) {
      case ReminderType.days_2_before:
        return 2;
      case ReminderType.days_15_before:
        return 15;
      case ReminderType.days_30_before:
        return 30;
      // Add more if needed
      default:
        return 0; // On the day
    }
  }

  // async createInspection(data: AddInspectionInput): Promise<Inspection> {
  //   const {
  //     clientId,
  //     assetId,
  //     dueDate,
  //     inspectorIds = [],
  //     inspectionType,
  //     notificationMethod,
  //     reminderMessageSource,
  //     manualReminderMessage,
  //     emailTemplateId: inputEmailTemplateId,
  //     smsTemplateId: inputSmsTemplateId,
  //     ...rest
  //   } = data;

  //   console.log("Incoming data for createInspection:", data);

  //   const status = dueDate ? "scheduled" : "not_scheduled";

  //   // Check for duplicate inspection
  //   const existingInspection = await this.findOne({ clientId, assetId, dueDate });
  //   if (existingInspection) throw new ConflictError("Inspection already exists");

  //   // Create inspection
  //   const inspection = await this.create({
  //     clientId,
  //     assetId,
  //     dueDate,
  //     inspectionType,
  //     status,
  //     location: rest.location,
  //     inspectionNotes: rest.inspectionNotes,
  //   });

  //   // Assign inspectors
  //   if (inspectorIds.length > 0) {
  //     await this.prisma.inspectionInspectors.createMany({
  //       data: inspectorIds.map((employeeId) => ({
  //         inspectionId: inspection.id,
  //         employeeId,
  //       })),
  //       skipDuplicates: true,
  //     });
  //   }

  //   // Check if reminder already exists
  //   const existingReminder = await this.prisma.reminder.findFirst({
  //     where: {
  //       clientId,
  //       assetId,
  //       reminderDate: dueDate ? new Date(dueDate) : null,
  //       isDeleted: false,
  //     },
  //   });

  //   console.log("Existing Reminder Check:", existingReminder?.id || "None");

  //   // Only create reminder if dueDate + inspectors exist + no existing reminder
  //   if (!existingReminder && dueDate && inspectorIds.length > 0) {
  //     const reminderService = new ReminderService(this.prisma);

  //     // Determine mode
  //     const mode = reminderMessageSource || "template";
  //     const isManualMode = mode === "manual";

  //     // Fetch templates only if needed
  //     const emailTemplate = inputEmailTemplateId
  //       ? await this.prisma.emailTemplate.findUnique({
  //           where: { id: inputEmailTemplateId },
  //           select: { id: true, mailtrapId: true },
  //         })
  //       : null;

  //     const smsTemplate = inputSmsTemplateId
  //       ? await this.prisma.sMSTemplate.findUnique({
  //           where: { id: inputSmsTemplateId },
  //           select: { id: true },
  //         })
  //       : null;

  //     console.log("Mode:", isManualMode ? "Manual" : "Template");
  //     console.log("Email Template:", emailTemplate?.id || "None");
  //     console.log("SMS Template:", smsTemplate?.id || "None");

  //     // Validation
  //     if (!notificationMethod) {
  //       throw new Error("notificationMethod is required");
  //     }

  //     if (!isManualMode) {
  //       // Template mode → require template IDs
  //       if ((notificationMethod === "email" || notificationMethod === "both") && !emailTemplate?.id) {
  //         throw new Error("emailTemplateId is required for email notifications when using template");
  //       }
  //       if ((notificationMethod === "sms" || notificationMethod === "both") && !smsTemplate?.id) {
  //         throw new Error("smsTemplateId is required for SMS notifications when using template");
  //       }
  //     } else {
  //       // Manual mode → require message
  //       if (!manualReminderMessage || manualReminderMessage.trim().length < 10) {
  //         throw new Error("manualReminderMessage is required and must be at least 10 characters in manual mode");
  //       }
  //     }

  //     // Create reminder
  //     let createdReminder: Reminder | null = null;
  //     try {
  //       createdReminder = await reminderService.createReminder({
  //         clientId,
  //         assetId,
  //         reminderType: this.mapToReminderType(inspectionType),
  //         reminderDate: new Date(dueDate).toISOString(),
  //         notificationMethod,
  //         additionalNotes: `Auto-generated from Inspection #${inspection.id}`,
  //         inspectorIds,
  //         emailTemplateId: isManualMode ? undefined : emailTemplate?.id,
  //         smsTemplateId: isManualMode ? undefined : smsTemplate?.id,
  //         manualReminderMessage: isManualMode ? manualReminderMessage : undefined,
  //       });

  //       console.log("Reminder created successfully:", createdReminder.id);

  //       // Immediate send
  //       if (createdReminder) {
  //         console.log(`Immediate sending triggered: ${notificationMethod}`);

  //         if (notificationMethod === "email" || notificationMethod === "both") {
  //           await this.sendReminderEmails(inspection.id);
  //           console.log("Immediate email sent");
  //         }

  //         if (notificationMethod === "sms" || notificationMethod === "both") {
  //           await this.sendSMSReminder(inspection.id);
  //           console.log("Immediate SMS sent");
  //         }

  //         // Schedule 1 day before (Email)
  //         if ((notificationMethod === "email" || notificationMethod === "both") && dueDate) {
  //           const dueDateObj = new Date(dueDate);
  //           const triggerDate = subDays(dueDateObj, 1);
  //           triggerDate.setHours(9, 0, 0, 0);

  //           if (triggerDate > new Date()) {
  //             const jobId = `email_reminder_1day_before_${inspection.id}`;
  //             scheduleJob(jobId, triggerDate, async () => {
  //               try {
  //                 await this.sendReminderEmails(inspection.id);
  //                 AppLogger.info(`Scheduled email reminder sent for inspection ${inspection.id}`);
  //               } catch (err: any) {
  //                 AppLogger.error("Scheduled email failed", { error: err.message });
  //               }
  //             });
  //             console.log("Scheduled email job created for:", format(triggerDate, "yyyy-MM-dd HH:mm"));
  //           }
  //         }

  //         // Schedule 1 day before (SMS)
  //         if ((notificationMethod === "sms" || notificationMethod === "both") && dueDate) {
  //           const dueDateObj = new Date(dueDate);
  //           const triggerDate = subDays(dueDateObj, 1);
  //           triggerDate.setHours(9, 0, 0, 0);

  //           if (triggerDate > new Date()) {
  //             const jobId = `sms_reminder_1day_before_${inspection.id}`;
  //             scheduleJob(jobId, triggerDate, async () => {
  //               try {
  //                 await this.sendSMSReminder(inspection.id);
  //                 AppLogger.info(`Scheduled SMS reminder sent for inspection ${inspection.id}`);
  //               } catch (err: any) {
  //                 AppLogger.error("Scheduled SMS failed", { error: err.message });
  //               }
  //             });
  //             console.log("Scheduled SMS job created for:", format(triggerDate, "yyyy-MM-dd HH:mm"));
  //           }
  //         }
  //       }
  //     } catch (error: any) {
  //       console.error("Failed during reminder creation or sending:", error);
  //       AppLogger.error("Reminder flow failed", {
  //         error: error.message,
  //         stack: error.stack,
  //         inspectionId: inspection.id,
  //       });
  //       // Don't throw — inspection already created
  //     }
  //   } else {
  //     console.log("Skipping reminder creation — already exists or no dueDate/inspectors");
  //   }

  //   return inspection;
  // }

  async createInspection(data: AddInspectionInput): Promise<Inspection> {
  const {
    clientId,
    assetId,
    dueDate,
    inspectorIds = [],
    inspectionType,
    notificationMethod,
    reminderMessageSource,
    manualReminderMessage,
    emailTemplateId: inputEmailTemplateId,
    smsTemplateId: inputSmsTemplateId,
    ...rest
  } = data;

  if (!dueDate) throw new Error("dueDate is required for recurring inspections");

  const dueDateObj = new Date(dueDate);
  const status = "scheduled";

  // Prevent duplicate for same date
  const existing = await this.prisma.inspection.findFirst({
    where: {
      clientId,
      assetId,
      inspectionType,
      dueDate: dueDateObj,
      isDeleted: false,
    },
  });
  if (existing) throw new ConflictError("Inspection already exists for this date");

  // Create the inspection
  const inspection = await this.create({
    clientId,
    assetId,
    dueDate: dueDateObj,
    inspectionType,
    status,
    location: rest.location,
    inspectionNotes: rest.inspectionNotes,
  });

  // Assign inspectors
  if (inspectorIds.length > 0) {
    await this.prisma.inspectionInspectors.createMany({
      data: inspectorIds.map((employeeId) => ({
        inspectionId: inspection.id,
        employeeId,
      })),
      skipDuplicates: true,
    });
  }

  // Auto-create reminder for THIS due date
  if (inspectorIds.length > 0) {
    const mode = reminderMessageSource || "template";
    const isManual = mode === "manual";

    const emailTemplate = inputEmailTemplateId
      ? await this.prisma.emailTemplate.findUnique({ where: { id: inputEmailTemplateId } })
      : null;
    const smsTemplate = inputSmsTemplateId
      ? await this.prisma.sMSTemplate.findUnique({ where: { id: inputSmsTemplateId } })
      : null;

    // Validation same as before...
    if (!notificationMethod) throw new Error("notificationMethod required");
    if (!isManual) {
      if ((notificationMethod === "email" || notificationMethod === "both") && !emailTemplate)
        throw new Error("emailTemplateId required");
      if ((notificationMethod === "sms" || notificationMethod === "both") && !smsTemplate)
        throw new Error("smsTemplateId required");
    } else if (!manualReminderMessage || manualReminderMessage.trim().length < 10)
      throw new Error("manual message required");

    const reminderService = new ReminderService(this.prisma);
    const createdReminder = await reminderService.createReminder({
      clientId,
      assetId,
      reminderType: this.mapToReminderType(inspectionType),
      reminderDate: dueDateObj.toISOString(),
      notificationMethod,
      additionalNotes: `Auto-generated recurring reminder for Inspection #${inspection.id}`,
      inspectorIds,
      emailTemplateId: isManual ? undefined : emailTemplate?.id,
      smsTemplateId: isManual ? undefined : smsTemplate?.id,
      manualReminderMessage: isManual ? manualReminderMessage : undefined,
    });

    // Schedule reminders: 30, 15, 2 days before + on the day
    // const beforeDays = [30, 15, 2, 0];
    // for (const days of beforeDays) {
    //   const triggerDate = subDays(dueDateObj, days);
    //   triggerDate.setHours(9, 0, 0, 0);

    //   if (isBefore(new Date(), triggerDate)) {
    //     const baseJobId = `reminder_${days}d_before_${inspection.id}`;

    //     if (notificationMethod === "email" || notificationMethod === "both") {
    //       scheduleJob(`${baseJobId}_email`, triggerDate, () => this.sendReminderEmails(inspection.id));
    //     }
    //     if (notificationMethod === "sms" || notificationMethod === "both") {
    //       scheduleJob(`${baseJobId}_sms`, triggerDate, () => this.sendSMSReminder(inspection.id));
    //     }
    //   }
    // }
    const daysBefore = this.getReminderDaysBefore(createdReminder.reminderType);
    const beforeDays = [daysBefore, 0]; 
    for (const days of beforeDays) {
      const triggerDate = subDays(dueDateObj, days);
      triggerDate.setHours(9, 0, 0, 0);

      if (!isBefore(new Date(), triggerDate)) continue;

      const baseJobId = `reminder_${days}d_before_${inspection.id}`;

      if (notificationMethod === "email" || notificationMethod === "both") {
        scheduleJob(`${baseJobId}_email`, triggerDate, () => this.sendReminderEmails(inspection.id));
      }
      if (notificationMethod === "sms" || notificationMethod === "both") {
        scheduleJob(`${baseJobId}_sms`, triggerDate, () => this.sendSMSReminder(inspection.id));
      }
    }
  }

  return inspection;
}


private mapToReminderType(type: InspectionType): ReminderType {
  switch (type) {
    case "weekly": return "weekly";
    case "monthly": return "monthly";
    case "quarterly": return "quarterly";
    case "semi_annual": return "semi_annual";
    case "annual": return "annual";
    default: return "one_time";
  }
}


private async sendReminderEmails(inspectionId: string): Promise<void> {
  console.log("Sending reminder emails for inspection:", inspectionId);
  
  const inspection = await this.prisma.inspection.findUnique({
    where: { id: inspectionId },
    include: {
      client: { select: { company: true, email: true } },
      asset: { select: { name: true, serialNo: true, location: true } },
      inspectors: {
        include: {
          employee: { select: { firstName: true, lastName: true, email: true } },
        },
      },
    },
  });

  if (!inspection) {
    AppLogger.warn("Inspection not found", { inspectionId });
    return;
  }

  const reminder = await this.prisma.reminder.findFirst({
    where: {
      clientId: inspection.clientId,
      assetId: inspection.assetId,
      isDeleted: false,
      //...(inspection.dueDate ? { reminderDate: { equals: inspection.dueDate } } : {}),
      ...(inspection.dueDate 
      ? { reminderDate: inspection.dueDate.toISOString() } 
      : {}
      ),
    },
    orderBy: { createdAt: "desc" },
    include: { emailTemplate: true },
  });

  if (!reminder) {
    AppLogger.warn("No reminder found for this inspection", { inspectionId });
    return;
  }
  console.log("Reminder found! Manual message:", !!reminder.manualReminderMessage);

  // Manual message check
  const isManual = reminder.manualReminderMessage && reminder.manualReminderMessage.trim().length > 0;

  // Collect recipients
  const recipients: string[] = [];
  if (inspection.client?.email) recipients.push(inspection.client.email);
  inspection.inspectors.forEach(i => {
    if (i.employee?.email) recipients.push(i.employee.email);
  });
  const uniqueRecipients = Array.from(new Set(recipients)).filter(Boolean);
  
  if (uniqueRecipients.length === 0) {
    AppLogger.warn("No recipients for reminder", { inspectionId, reminderId: reminder.id });
    return;
  }

  const dueText = inspection.dueDate ? format(inspection.dueDate, "dd MMM yyyy, hh:mm a") : "Not scheduled";

  const mailtrapService = new MailtrapEmailService({
    token: process.env.MAILTRAP_API_TOKEN!,
    accountId: process.env.MAILTRAP_ACCOUNT_ID!,
    defaultFromEmail: process.env.MAIL_FROM_EMAIL!,
    defaultReplyToEmail: process.env.MAIL_REPLY_TO,
  });

  try {
    if (isManual) {
      // Manual message → plain text email
      const subject = `Inspection Reminder - ${inspection.client?.company || "Client"}`;

      const fullMessage = `
Inspection Reminder

${reminder.manualReminderMessage}

Details:
- Date: ${dueText}
- Asset: ${inspection.asset?.name ?? inspection.asset?.serialNo ?? "N/A"}
- Location: ${inspection.asset?.location ?? inspection.location ?? "N/A"}
- Client: ${inspection.client?.company ?? "N/A"}

Thank you.
      `.trim();

      await mailtrapService.sendBulkPlainText({
        recipients: uniqueRecipients,
        subject,
        text: fullMessage,
      });

      AppLogger.info("Manual reminder email sent (plain text)", {
        inspectionId,
        reminderId: reminder.id,
        recipients: uniqueRecipients.length,
      });
    } else {
      // Template-based (existing)
      const mailtrapTemplateId = reminder.emailTemplate?.mailtrapId;
      if (!mailtrapTemplateId) {
        AppLogger.warn("No mailtrap template id available", { reminderId: reminder.id });
        return;
      }

      await mailtrapService.sendBulkFromTemplate({
        templateId: mailtrapTemplateId,
        recipients: uniqueRecipients,
        templateData: {
          companyName: inspection.client?.company ?? "Client",
          inspectionDate: dueText,
          assetName: inspection.asset?.name ?? inspection.asset?.serialNo ?? "N/A",
          location: inspection.asset?.location ?? inspection.location ?? "N/A",
          inspectorNames: inspection.inspectors
            .map(i => `${i.employee?.firstName ?? ""} ${i.employee?.lastName ?? ""}`.trim())
            .filter(n => n.length > 0)
            .join(", "),
        },
      });

      AppLogger.info("Template-based reminder email sent", {
        inspectionId,
        reminderId: reminder.id,
        templateId: mailtrapTemplateId,
        recipients: uniqueRecipients.length,
      });
    }
  } catch (error: any) {
    AppLogger.error("Failed to send reminder email", {
      inspectionId,
      reminderId: reminder.id,
      error: error?.message ?? error,
    });
  }
}

private async sendSMSReminder(inspectionId: string): Promise<void> {
  console.log("Sending SMS reminder for inspection:", inspectionId);

  const inspection = await this.prisma.inspection.findUnique({
    where: { id: inspectionId },
    include: {
      client: { select: { company: true, phone: true } },
      asset: { select: { name: true, serialNo: true, location: true } },
      inspectors: {
        include: {
          employee: { select: { firstName: true, lastName: true, phone: true } },
        },
      },
    },
  });

  if (!inspection) {
    AppLogger.warn("Inspection not found for SMS", { inspectionId });
    return;
  }

  const reminder = await this.prisma.reminder.findFirst({
    where: {
      clientId: inspection.clientId,
      assetId: inspection.assetId,
      isDeleted: false,
      //...(inspection.dueDate ? { reminderDate: inspection.dueDate } : {}),
      ...(inspection.dueDate 
      ? { reminderDate: inspection.dueDate.toISOString() } 
      : {}
      ),
    },
    orderBy: { createdAt: "desc" }
  });

  if (!reminder) {
    AppLogger.warn("No reminder found for SMS", { inspectionId });
    return;
  }

  const recipients: string[] = [];
  if (inspection.client?.phone) recipients.push(inspection.client.phone);
  inspection.inspectors.forEach(ins => {
    if (ins.employee?.phone) recipients.push(ins.employee.phone);
  });

  const uniqueRecipients = Array.from(new Set(recipients)).filter(Boolean);

  if (uniqueRecipients.length === 0) {
    AppLogger.warn("No SMS recipients", { inspectionId, reminderId: reminder.id });
    return;
  }

  // Manual message priority
  let smsBody: string;
  if (reminder.manualReminderMessage && reminder.manualReminderMessage.trim().length > 0) {
    smsBody = reminder.manualReminderMessage.trim();

    // যদি message ছোট হয়, তাহলে basic details append করি
    if (smsBody.length < 120) {
      const dueText = inspection.dueDate 
        ? format(inspection.dueDate, "dd MMM yyyy")
        : "Not scheduled";
      smsBody += `\n\nDate: ${dueText}\nAsset: ${inspection.asset?.name ?? inspection.asset?.serialNo ?? "N/A"}`;
    }
  } else {
    const dueText = inspection.dueDate 
      ? format(inspection.dueDate, "dd MMM yyyy, hh:mm a")
      : "Not scheduled";

    smsBody = `Reminder: Inspection scheduled\nDate: ${dueText}\nAsset: ${inspection.asset?.name ?? inspection.asset?.serialNo ?? "N/A"}\nLocation: ${inspection.asset?.location ?? inspection.location ?? "N/A"}\nClient: ${inspection.client?.company ?? "N/A"}`;
  }

  const smsService = new TwilioSMSService();

  try {
    const results = await smsService.sendBulkSMS(uniqueRecipients, smsBody);

    AppLogger.info("SMS reminders sent", {
      inspectionId,
      reminderId: reminder.id,
      recipients: uniqueRecipients.length,
      success: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });
  } catch (error: any) {
    AppLogger.error("Failed to send SMS reminders", {
      inspectionId,
      reminderId: reminder.id,
      error: error.message,
    });
  }
}


// private async sendReminderEmails(inspectionId: string): Promise<void> {
// console.log("Sending reminder emails for inspection:", inspectionId);
//   const inspection = await this.prisma.inspection.findUnique({
//     where: { id: inspectionId },
//     include: {
//       client: { select: { company: true, email: true } },
//       asset: { select: { name: true, serialNo: true, location: true } },
//       inspectors: {
//         include: {
//           employee: { select: { firstName: true, lastName: true, email: true } },
//         },
//       },
//     },
//   });

//   if (!inspection) {
//     AppLogger.warn("Inspection not found", { inspectionId });
//     return;
//   }

//   // 2) find matching reminder separately (because your schema currently doesn't declare reminders[] on Inspection)
//   const reminder = await this.prisma.reminder.findFirst({
//     where: {
//       clientId: inspection.clientId,
//       assetId: inspection.assetId,
//       isDeleted: false,
//       // if dueDate exists, match exactly; otherwise allow null filter (no date)
//       ...(inspection.dueDate ? { reminderDate: { equals: inspection.dueDate } } : {}),
//     },
//     orderBy: { createdAt: "desc" },
//     include: { emailTemplate: true },
//   });

//   if (!reminder) {
//     AppLogger.warn("No reminder found for this inspection", { inspectionId });
//     return;
//   }
//   console.log("Found reminder for inspection:", reminder);
//   // 3) ensure reminder.emailTemplateId exists (or fallback to template on emailTemplate relation)
//   const mailtrapTemplateId =  reminder.emailTemplate?.mailtrapId;
//   console.log("Mailtrap Template ID:", mailtrapTemplateId);
//   if (!mailtrapTemplateId) {
//     AppLogger.warn("No mailtrap template id available on reminder or emailTemplate", { reminderId: reminder.id });
//     return;
//   }

//   // 4) collect recipients
//   const recipients: string[] = [];
//   if (inspection.client?.email) recipients.push(inspection.client.email);
//   inspection.inspectors.forEach(i => {
//     if (i.employee?.email) recipients.push(i.employee.email);
//   });
//   const uniqueRecipients = Array.from(new Set(recipients)).filter(Boolean);
//   if (uniqueRecipients.length === 0) {
//     AppLogger.warn("No recipients for reminder", { inspectionId, reminderId: reminder.id });
//     return;
//   }

//   const dueText = inspection.dueDate ? format(inspection.dueDate, "dd MMM yyyy, hh:mm a") : "Not scheduled";

//   const mailtrapService = new MailtrapEmailService({
//     token: process.env.MAILTRAP_API_TOKEN!,
//     accountId: process.env.MAILTRAP_ACCOUNT_ID!,
//     defaultFromEmail: process.env.MAIL_FROM_EMAIL!,
//     defaultReplyToEmail: process.env.MAIL_REPLY_TO,
//   });

//   try {
//     console.log(inspection, "Preparing to send reminder email with template:", mailtrapTemplateId);
//     const result = await mailtrapService.sendBulkFromTemplate({
//       templateId: mailtrapTemplateId,
//       recipients: uniqueRecipients,
//       templateData: {
//         companyName: inspection.client?.company ?? "Client",
//         inspectionDate: dueText,
//         assetName: inspection.asset?.name ?? inspection.asset?.serialNo ?? "N/A",
//         location: inspection.asset?.location ?? inspection.location ?? "N/A",
//         inspectorNames: inspection.inspectors
//           .map(i => `${i.employee?.firstName ?? ""} ${i.employee?.lastName ?? ""}`.trim())
//           .filter(n => n.length > 0)
//           .join(", "),
//       },
//     });

//     AppLogger.info("Reminder email sent via dynamic template", {
//       inspectionId,
//       reminderId: reminder.id,
//       templateId: mailtrapTemplateId,
//       recipients: uniqueRecipients.length,
//     });
//   } catch (error: any) {
//     AppLogger.error("Failed to send reminder email", {
//       inspectionId,
//       reminderId: reminder.id,
//       templateId: mailtrapTemplateId,
//       error: error?.message ?? error,
//     });
//   }
// }



// private async sendSMSReminder(inspectionId: string): Promise<void> {
//   console.log("Sending SMS reminder for inspection:", inspectionId);

//   // 1) Fetch inspection
//   const inspection = await this.prisma.inspection.findUnique({
//     where: { id: inspectionId },
//     include: {
//       client: { select: { company: true, phone: true } },
//       asset: { select: { name: true, serialNo: true, location: true } },
//       inspectors: {
//         include: {
//           employee: { 
//             select: { 
//               firstName: true, 
//               lastName: true, 
//               phone: true 
//             } 
//           },
//         },
//       },
//     },
//   });

//   if (!inspection) {
//     AppLogger.warn("Inspection not found for SMS", { inspectionId });
//     return;
//   }

//   // 2) Fetch reminder
//   const reminder = await this.prisma.reminder.findFirst({
//     where: {
//       clientId: inspection.clientId,
//       assetId: inspection.assetId,
//       isDeleted: false,
//       ...(inspection.dueDate ? { reminderDate: inspection.dueDate } : {}),
//     },
//     orderBy: { createdAt: "desc" }
//   });

//   if (!reminder) {
//     AppLogger.warn("No reminder found for SMS", { inspectionId });
//     return;
//   }

//   // 3) Collect SMS recipients
//   const recipients: string[] = [];

//   if (inspection.client?.phone) recipients.push(inspection.client.phone);

//   inspection.inspectors.forEach(ins => {
//     if (ins.employee?.phone) recipients.push(ins.employee.phone);
//   });

//   const uniqueRecipients = Array.from(new Set(recipients)).filter(Boolean);

//   if (uniqueRecipients.length === 0) {
//     AppLogger.warn("No SMS recipients", { inspectionId, reminderId: reminder.id });
//     return;
//   }

//   // 4) Prepare SMS message
//   const dueText = inspection.dueDate 
//     ? format(inspection.dueDate, "dd MMM yyyy, hh:mm a")
//     : "Not scheduled";

//   const smsBody =
//     `Reminder: Inspection scheduled\n` +
//     `Date: ${dueText}\n` +
//     `Asset: ${inspection.asset?.name ?? inspection.asset?.serialNo ?? "N/A"}\n` +
//     `Location: ${inspection.asset?.location ?? inspection.location ?? "N/A"}\n` +
//     `Client: ${inspection.client?.company ?? "N/A"}`;

//   // 5) Send SMS via TwilioSMSService
//   const smsService = new TwilioSMSService();

//   try {
//     const results = await smsService.sendBulkSMS(uniqueRecipients, smsBody);
//     console.log("SMS send results:", results);

//     AppLogger.info("SMS reminders sent", {
//       inspectionId,
//       reminderId: reminder.id,
//       recipients: uniqueRecipients.length,
//       success: results.filter(r => r.success).length,
//       failed: results.filter(r => !r.success).length
//     });

//   } catch (error: any) {
//     AppLogger.error("Failed to send SMS reminders", {
//       inspectionId,
//       reminderId: reminder.id,
//       error: error.message,
//     });
//   }
// }



  // private async sendReminderEmails(inspectionId: string): Promise<void> {
  //   const inspection = await this.prisma.inspection.findUnique({
  //     where: { id: inspectionId },
  //     include: {
  //       client: true,
  //       asset: true,
  //       inspectors: { include: { employee: true } },
  //     },
  //   });
  //   if (!inspection) return;

  //   const recipients: string[] = [];
  //   if (inspection.client?.email) recipients.push(inspection.client.email);
  //   for (const i of inspection.inspectors || []) {
  //     if (i.employee?.email) recipients.push(i.employee.email);
  //   }
  //   const uniqueRecipients = Array.from(new Set(recipients)).filter(Boolean);
  //   if (uniqueRecipients.length === 0) return;

  //   const dueText = inspection.dueDate
  //     ? format(inspection.dueDate as unknown as Date, "yyyy-MM-dd HH:mm")
  //     : "N/A";
  //   const subject = "Inspection Reminder";
  //   const html = `
  //     <div style="font-family:Arial,sans-serif;color:#111">
  //       <h2>Inspection Reminder</h2>
  //       <p>Client: <strong>${inspection.client?.company ?? ""}</strong></p>
  //       <p>Asset ID: <strong>${inspection.assetId}</strong></p>
  //       <p>Location: <strong>${inspection.location ?? ""}</strong></p>
  //       <p>Due Date: <strong>${dueText}</strong></p>
  //       <p>Please prepare and complete the scheduled inspection.</p>
  //     </div>
  //   `;
  //   const text = `Inspection Reminder\nClient: ${inspection.client?.company ?? ""}\nAsset ID: ${inspection.assetId}\nLocation: ${inspection.location ?? ""}\nDue Date: ${dueText}`;

  //   const ses = new SESEmailService({
  //     region: config.email.awsRegion,
  //     awsAccessKeyId: config.email.awsAccessKeyId,
  //     awsSecretAccessKey: config.email.awsSecretAccessKey,
  //     defaultFromEmail: config.email.defaultFromEmail,
  //     defaultReplyToEmail: config.email.defaultReplyToEmail,
  //   });

  //   const results = await ses.sendBulkEmails(uniqueRecipients, {
  //     from: config.email.defaultFromEmail,
  //     fromName: config.email.defaultFromName,
  //     subject,
  //     html,
  //     text,
  //     replyTo: config.email.defaultReplyToEmail,
  //   });
  //   const ok = results.filter(r => r.success).length;
  //   const fail = results.filter(r => !r.success).length;
  //   AppLogger.info("Inspection reminder emails processed", { inspectionId, ok, fail });
  // }

  //get inspections

//   private async sendReminderEmails(inspectionId: string): Promise<void> {
//   const inspection = await this.prisma.inspection.findUnique({
//     where: { id: inspectionId },
//     include: {
//       client: true,
//       asset: true,
//       inspectors: { include: { employee: true } },
//     },
//   });
//   if (!inspection) return;

//   const recipients: string[] = [];
//   if (inspection.client?.email) recipients.push(inspection.client.email);
//   for (const i of inspection.inspectors || []) {
//     if (i.employee?.email) recipients.push(i.employee.email);
//   }
//   const uniqueRecipients = Array.from(new Set(recipients)).filter(Boolean);
//   if (uniqueRecipients.length === 0) return;

//   const dueText = inspection.dueDate
//     ? format(inspection.dueDate as unknown as Date, "yyyy-MM-dd HH:mm")
//     : "N/A";

//   // Mailtrap
//   // const mailtrapService = new MailtrapEmailService();
//   // try {
//   //   const result = await mailtrapService.sendBulkFromTemplate({
//   //     templateId: "f43d9c53-0da5-49fd-becd-9fba7320fec4", 
//   //     recipients: uniqueRecipients,
//   //     templateData: {
//   //       firstName: inspection.client?.company || "Client",
//   //       inspectionDate: dueText,
//   //       assetId: inspection.assetId,
//   //       location: inspection.location || "N/A",
//   //     },
//   //   });

//   //   AppLogger.info("Reminder emails sent via Mailtrap", {
//   //     inspectionId,
//   //     success: result.success,
//   //     failed: result.failed,
//   //   });
//   // } catch (error) {
//   //   AppLogger.error("Failed to send reminder emails", { inspectionId, error });
//   // }

//   const mailtrapService = new MailtrapEmailService({
//     token: process.env.MAILTRAP_API_TOKEN!,
//     defaultFromEmail: process.env.MAIL_FROM_EMAIL,
//     defaultReplyToEmail: process.env.MAIL_REPLY_TO,
//     accountId: process.env.MAILTRAP_ACCOUNT_ID!,
// });

//   const result =  await mailtrapService.sendBulkFromTemplate({
//     //templateId: "f43d9c53-0da5-49fd-becd-9fba7320fec4",
//     //templateId: "6a414390-2d44-4d22-8035-5f8640876d4d",
//     templateId: "6a41d390-2d44-4d22-8035-5f6640376d4d",
//     recipients: uniqueRecipients,
//     templateData: {
//       firstName: inspection.client?.company || "Client",
//       inspectionDate: dueText,
//       assetId: inspection.assetId,
//       location: inspection.location || "N/A",
//     },
//   });

//   console.log("Mailtrap Reminder Result:", result);
// }

  async getInspections(query: InspectionListQuery) {
    const {
      page,
      limit,
      search,
      status,
      sortBy = "createdAt",
      sortOrder = "desc",
      ...rest
    } = query;

    let filters: any = {};
    if (search)
      filters.OR = [
        { location: { contains: search, mode: "insensitive" } },
        { inspectionNotes: { contains: search, mode: "insensitive" } },
      ];
    if (status) filters.status = status;

    const result = await this.findMany(
      filters,
      { page, limit, offset: (page - 1) * limit },
      { [sortBy]: sortOrder },
      {
        client: true,
        asset: true,
        inspectors: { include: { employee: true } },
      }
    );

    AppLogger.info(`Inspections found: ${result.data.length}`);
    return result;
  }

  async getInspectionsByClient(
  query: InspectionListQuery,
  userId: string,
  role: string   
) {
  const {
    page = 1,
    limit = 10,
    search,
    status,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = query;

  const filters: any = {
    isDeleted: false,
    client: {
      ownerId: userId,
    },
  };

  // Search filter
  if (search) {
    filters.OR = [
      { location: { contains: search, mode: "insensitive" } },
      { inspectionNotes: { contains: search, mode: "insensitive" } },
      { asset: { name: { contains: search, mode: "insensitive" } } },
      { asset: { serialNo: { contains: search, mode: "insensitive" } } },
      { asset: { model: { contains: search, mode: "insensitive" } } },
      { client: { company: { contains: search, mode: "insensitive" } } },
      { client: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  if (status) {
    filters.status = status;
  }

  if (query.clientId) {
    filters.client.AND = [
      { ownerId: userId },
      { id: query.clientId },
    ];
  }

  return this.findMany(
    filters,
    { page, limit, offset: (page - 1) * limit },
    { [sortBy]: sortOrder },
    {
      client: true,
      asset: true,
      inspectors: { include: { employee: true } },
    }
  );
}

  async getInspectionById(id: string): Promise<Inspection | null> {
    const inspection = await this.prisma.inspection.findUnique({
      where: { id },
      include: {
        client: true,
        asset: true,
        inspectors: { include: { employee: true } },
      },
    });
    if (!inspection) throw new NotFoundError("Inspection");
    return inspection;
  }

  async updateInspection(
    id: string,
    data: UpdateInspectionInput
  ): Promise<Inspection> {
    const exists = await this.exists({ id });
    if (!exists) throw new NotFoundError("Inspection");

    const { inspectorIds, ...updateData } = data;
    const updated = await this.updateById(id, updateData);

    if (inspectorIds) {
      await this.prisma.inspectionInspectors.deleteMany({
        where: { inspectionId: id },
      });
      await this.prisma.inspectionInspectors.createMany({
        data: inspectorIds.map((employeeId) => ({
          inspectionId: id,
          employeeId,
        })),
      });
      AppLogger.info(
        `Updated ${inspectorIds.length} inspector(s) for inspection ${id}`
      );
    }

    return updated;
  }

  async deleteInspection(id: string): Promise<Inspection> {
    const exists = await this.exists({ id });
    if (!exists) throw new NotFoundError("Inspection");
    return await this.deleteById(id);
  }
}
