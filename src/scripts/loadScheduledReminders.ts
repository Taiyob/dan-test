import { PrismaClient } from '@prisma/client';
import { scheduleJob } from '@/services/schedulerService';
import { AppLogger } from '@/core/logging/logger';

export class ReminderLoaderService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  public async loadScheduledReminders(): Promise<void> {
    AppLogger.info('🔁 Loading existing scheduled reminders...');

    const now = new Date();

    const reminders = await this.prisma.reminder.findMany({
      where: {
        reminderDate: {
          gte: now,
        },
      },
    });

    AppLogger.info(`📝 Found ${reminders.length} pending reminders`);

    for (const reminder of reminders) {
      if (!reminder.reminderDate) continue; // safety for nullable field

      scheduleJob(`reminder_${reminder.id}`, reminder.reminderDate, async () => {
        AppLogger.info(`🔔 Reminder triggered for reminder ${reminder.id}`);
      });
    }

    AppLogger.info('🎉 All reminders scheduled.');
  }
}
