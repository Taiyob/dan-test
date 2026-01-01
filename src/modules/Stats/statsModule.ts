import { BaseModule } from "@/core/BaseModule";
import { AppLogger } from "@/core/logging/logger";
import { statsController } from "./stats.controller";
import { StatsService } from "./stats.service";
import { StatsRoute } from "./stats.route";

export class StatsModule extends BaseModule {
  public readonly name = "StatsModule";
  public readonly version = "1.0.0";
  public readonly dependencies = [];

  private statsService!: StatsService;
  private statsController!: statsController;
  private statsRoutes!: StatsRoute;

  /**
   * Setup module services
   */
  protected async setupServices(): Promise<void> {
    // Validate JWT configuration
    // if (!config.security.jwt.secret) {
    //     throw new Error('JWT_SECRET is required in environment variables');
    // }

    // Initialize service
    this.statsService = new StatsService(this.context.prisma);
    AppLogger.info("StatsService initialized successfully");
  }

  protected async setupRoutes(): Promise<void> {
    this.statsController = new statsController(this.statsService);
    AppLogger.info("StatsController initialized successfully");

    this.statsRoutes = new StatsRoute(this.statsController);
    AppLogger.info("StatsRoutes initialized successfully");

    this.router.use("/api/dashboard", this.statsRoutes.getRouter());
  }
}
