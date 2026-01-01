import { BaseModule } from "@/core/BaseModule";
import { EmployeeCertificationService } from "./employeeCertificaton.service";
import { EmployeeCertificationController } from "./employeeCertification.controller";
import { EmployeeCertificationRoutes } from "./employeeCertification.route";
import { AppLogger } from "@/core/logging/logger";

export class EmployeeCertificationModule extends BaseModule {
  public readonly name = "EmployeeCertificationModule";
  public readonly version = "1.0.0";
  public readonly dependencies = [];

  private employeeCertificationService!: EmployeeCertificationService;
  private employeeCertificationController!: EmployeeCertificationController;
  private employeeCertificationRoutes!: EmployeeCertificationRoutes;

  /**
   * Setup module services
   */
  protected async setupServices(): Promise<void> {
    this.employeeCertificationService = new EmployeeCertificationService(
      this.context.prisma
    );
    AppLogger.info("EmployeeCertificationService initialized successfully");
  }

  protected async setupRoutes(): Promise<void> {
    this.employeeCertificationController = new EmployeeCertificationController(
      this.employeeCertificationService
    );
    AppLogger.info("EmployeeCertificationController initialized successfully");

    this.employeeCertificationRoutes = new EmployeeCertificationRoutes(
      this.employeeCertificationController
    );
    AppLogger.info("EmployeeCertificationRoutes initialized successfully");

    this.router.use(
      "/api/employee-certifications",
      this.employeeCertificationRoutes.getRouter()
    );
  }
}