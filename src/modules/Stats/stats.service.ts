import { PrismaClient } from "@prisma/client";
import { AppLogger } from "@/core/logging/logger";
import { startOfMonth, endOfMonth } from "date-fns";

export class StatsService {
  constructor(private prisma: PrismaClient) {}

  async getDashboardStats() {
    const now = new Date();
    const startMonth = startOfMonth(now);
    const endMonth = endOfMonth(now);

    const totalClients = await this.prisma.client.count();

    const totalInspections = await this.prisma.inspection.count();
    const completedThisMonth = await this.prisma.inspection.count({
      where: {
        status: "completed",
        createdAt: { gte: startMonth, lte: endMonth },
      },
    });
    const overDueInspections = await this.prisma.inspection.count({
      where: {
        status: "overdue",
      },
    });

    AppLogger.info("Dashboard stats fetched successfully");

    return {
      clients: totalClients,
      inspections: {
        total: totalInspections,
        completedThisMonth,
        due: overDueInspections,
      },
    };
  }
}
