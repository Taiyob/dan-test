// fileName: report.module.ts
// import { BaseModule } from "@/core/BaseModule";
// import { ReportService } from "./report.service";
// import { ReportController } from "./report.controller";
// import { ReportRoutes } from "./report.route";
// import { AppLogger } from "@/core/logging/logger";

// export class ReportModule extends BaseModule {
//   public readonly name = "ReportModule";
//   public readonly version = "1.0.0";
//   public readonly dependencies = [];

//   private reportService!: ReportService;
//   private reportController!: ReportController;
//   private reportRoutes!: ReportRoutes;

//   protected async setupServices(): Promise<void> {
//     this.reportService = new ReportService(this.context.prisma);
//     AppLogger.info("ReportService initialized successfully");
//   }

//   protected async setupRoutes(): Promise<void> {
//     this.reportController = new ReportController(this.reportService);
//     AppLogger.info("ReportController initialized successfully");

//     this.reportRoutes = new ReportRoutes(this.reportController);
//     AppLogger.info("ReportRoutes initialized successfully");

//     this.router.use("/api/reports", this.reportRoutes.getRouter());
//   }
// }

import { BaseModule } from "@/core/BaseModule";
import { ReportService } from "./report.service";
import { ReportController } from "./report.controller";
import { ReportRoutes } from "./report.route";
import { AppLogger } from "@/core/logging/logger";

export class ReportModule extends BaseModule {
  public readonly name = "ReportModule";
  public readonly version = "1.0.0";
  public readonly dependencies = [];

  private reportService!: ReportService;
  private reportController!: ReportController;
  private reportRoutes!: ReportRoutes;

  protected async setupServices(): Promise<void> {
    this.reportService = new ReportService(this.context.prisma);
    AppLogger.info("ReportService initialized successfully");
  }

  protected async setupRoutes(): Promise<void> {
    this.reportController = new ReportController(this.reportService);
    AppLogger.info("ReportController initialized successfully");

    this.reportRoutes = new ReportRoutes(this.reportController);
    AppLogger.info("ReportRoutes initialized successfully");

    this.router.use("/api/reports", this.reportRoutes.getRouter());
  }
}
