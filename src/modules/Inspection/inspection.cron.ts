// // src/modules/inspection/inspection.cron.ts
// import cron from "node-cron";
// import { PrismaClient } from "@prisma/client";
// import { AppLogger } from "@/core/logging/logger";
// import { computeStatusFromScheduledDate } from "@/utils/ScheduleStatus";

// const prisma = new PrismaClient();

// export function startInspectionCronJob() {
//     AppLogger.info("✅ Inspection cron job initialized.");

//     // Run every midnight for testing
//     cron.schedule("0 0 * * *", async () => {
//         AppLogger.info("🕒 Inspection cron job triggered.");
//         try {
//             const inspections = await prisma.inspection.findMany({
//                 where: { deletedAt: null },
//                 select: { id: true, dueDate: true, status: true },
//             });

//             let updatedCount = 0;

//             for (const insp of inspections) {
//                 if (!insp.dueDate) continue;
//                 const newStatus = computeStatusFromScheduledDate(insp.dueDate);
//                 if (newStatus !== insp.status) {
//                     await prisma.inspection.update({
//                         where: { id: insp.id },
//                         data: { status: newStatus },
//                     });
//                     updatedCount++;
//                 }
//             }
//             AppLogger.info(`✅ Status update complete. ${updatedCount} inspection(s) updated.`);
//         } catch (err) {
//             AppLogger.error("❌ Error updating inspection statuses", err);
//         }
//     });
// }

import cron from "node-cron";
import { PrismaClient, InspectionType, NotificationMethod } from "@prisma/client";
import { AppLogger } from "@/core/logging/logger";
import { InspectionService } from "./inspection.service";
import { addDays, addMonths, isBefore, format } from "date-fns";

const prisma = new PrismaClient();
const inspectionService = new InspectionService(prisma);

function getNextDueDate(current: Date, type: InspectionType): Date {
  switch (type) {
    case InspectionType.weekly:
      return addDays(current, 7);
    case InspectionType.monthly:
      return addMonths(current, 1);
    case InspectionType.quarterly:
      return addMonths(current, 3);
    case InspectionType.semi_annual:
      return addMonths(current, 6);
    case InspectionType.annual:
      return addMonths(current, 12);
    default:
      return current;
  }
}

export function startInspectionCronJob() {
  AppLogger.info("Recurring Inspection Cron Started");

  cron.schedule("0 2 * * *", async () => {
    AppLogger.info("Running recurring inspection check...");

    const now = new Date();

    const recurringTypes: InspectionType[] = [
      InspectionType.weekly,
      InspectionType.monthly,
      InspectionType.quarterly,
      InspectionType.semi_annual,
      InspectionType.annual,
    ];

    const pastDueInspections = await prisma.inspection.findMany({
      where: {
        inspectionType: { in: recurringTypes },
        dueDate: { lt: now },
        isDeleted: false,
      },
      include: {
        inspectors: {
          include: {
            employee: {
              select: { id: true },
            },
          },
        },
      },
    });

    for (const insp of pastDueInspections) {
      if (!insp.dueDate) continue;

      const nextDue = getNextDueDate(insp.dueDate, insp.inspectionType);

      const exists = await prisma.inspection.findFirst({
        where: {
          clientId: insp.clientId,
          assetId: insp.assetId,
          inspectionType: insp.inspectionType,
          dueDate: nextDue,
          isDeleted: false,
        },
      });

      if (exists) continue;

      const inspectorIds: string[] = insp.inspectors.map((assignment) => assignment.employee.id);

      const latestReminder = await prisma.reminder.findFirst({
        where: {
          clientId: insp.clientId,
          assetId: insp.assetId,
          reminderDate: insp.dueDate,
          isDeleted: false,
        },
        orderBy: { createdAt: "desc" },
      });

      try {
        // এখানে nextDue কে Date অবজেক্ট হিসেবে পাঠাচ্ছি (string না)
        // কারণ validation-এ preprocess আছে, কিন্তু type Date চায়
        await inspectionService.createInspection({
          clientId: insp.clientId,
          assetId: insp.assetId,
          inspectionType: insp.inspectionType,
          dueDate: nextDue, // <--- এখানে Date object দিচ্ছি, string না!
          location: insp.location ?? undefined,
          inspectionNotes: insp.inspectionNotes ?? undefined,
          inspectorIds,
          notificationMethod: (latestReminder?.notificationMethod ?? "email") as NotificationMethod,
          emailTemplateId: latestReminder?.emailTemplateId ?? undefined,
          smsTemplateId: latestReminder?.smsTemplateId ?? undefined,
          manualReminderMessage: latestReminder?.manualReminderMessage ?? undefined,
          reminderMessageSource: latestReminder?.manualReminderMessage ? "manual" : "template",
        });

        AppLogger.info(
          `Auto-created next recurring inspection for asset ${insp.assetId} → due ${format(nextDue, "yyyy-MM-dd")}`
        );
      } catch (error: any) {
        AppLogger.error("Failed to create next recurring inspection", {
          assetId: insp.assetId,
          nextDue: nextDue.toISOString(),
          error: error.message,
        });
      }
    }

    AppLogger.info("Recurring inspection check completed");
  });
}
