import { BaseController } from "@/core/BaseController";
import { Request, Response } from "express";
import { StatsService } from "./stats.service";
import { AppLogger } from "@/core/logging/logger";

export class statsController extends BaseController {
  constructor(private statsService: StatsService) {
    super();
  }

  // GET /api/stats/dashboard/overview-stats
  async getDashboardStats(req: Request, res: Response) {
    try {
      const stats = await this.statsService.getDashboardStats();
      return res.status(200).json({ success: true, data: stats });
    } catch (error) {
      AppLogger.error("Error fetching dashboard stats", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }


}
