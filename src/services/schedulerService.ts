import { AppLogger } from "@/core/logging/logger";
import schedule from "node-schedule";

const jobs: Record<string, schedule.Job> = {};

// Schedule a job
export function scheduleJob(
  id: string,
  dateOrRule: Date | schedule.RecurrenceRule,
  task: () => Promise<void>
) {
  if (jobs[id]) {
    jobs[id].cancel();
    AppLogger.info(`🛑 Previous job '${id}' canceled.`);
  }

  const job = schedule.scheduleJob(dateOrRule, async () => {
    AppLogger.info(`🕒 Job '${id}' triggered.`);
    try {
      await task();
    } catch (err) {
      AppLogger.error(`❌ Error in job '${id}'`, err);
    }
  });

  jobs[id] = job;
  AppLogger.info(`✅ Job '${id}' scheduled.`);
}

// Cancel a job
export function cancelJob(id: string) {
  if (jobs[id]) {
    jobs[id].cancel();
    delete jobs[id];
    AppLogger.info(`🛑 Job '${id}' canceled.`);
  }
}
