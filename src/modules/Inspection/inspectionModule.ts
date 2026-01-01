import { BaseModule } from "@/core/BaseModule";
import { InspectionService } from "./inspection.service";
import { InspectionController } from "./inspection.controller";
import { InspectionRoutes } from "./inspection.route";
import { AppLogger } from "@/core/logging/logger";

export class InspectionModule extends BaseModule {
  public readonly name = "InspectionModule";
  public readonly version = "1.0.0";
  public readonly dependencies = [];

  private inspectionService!: InspectionService;
  private inspectionController!: InspectionController;
  private inspectionRoutes!: InspectionRoutes;

  /**
   * Setup module services
   */
  protected async setupServices(): Promise<void> {
    this.inspectionService = new InspectionService(this.context.prisma);
    AppLogger.info("InspectionService initialized successfully");
  }

  protected async setupRoutes(): Promise<void> {
    this.inspectionController = new InspectionController(this.inspectionService);
    AppLogger.info("InspectionController initialized successfully");

    this.inspectionRoutes = new InspectionRoutes(this.inspectionController);
    AppLogger.info("InspectionRoutes initialized successfully");

    this.router.use("/api/inspections", this.inspectionRoutes.getRouter());
  }
}