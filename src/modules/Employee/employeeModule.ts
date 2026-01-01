import { BaseModule } from "@/core/BaseModule";
import { EmployeeService } from "./employee.service";
import { EmployeeController } from "./employee.controller";
import { EmployeeRoutes } from "./employee.route";
import { AppLogger } from "@/core/logging/logger";
import { S3Service } from "@/services/S3Service";

export class EmployeeModule extends BaseModule {
  public readonly name = "EmployeeModule";
  public readonly version = "1.0.0";
  public readonly dependencies = [];

  private employeeService!: EmployeeService;
  private employeeController!: EmployeeController;
  private employeeRoutes!: EmployeeRoutes;
  private s3Service!: S3Service;

  /**
   * Setup module services
   */
  protected async setupServices(): Promise<void> {
    // Validate JWT configuration
    // if (!config.security.jwt.secret) {
    //     throw new Error('JWT_SECRET is required in environment variables');
    // }

    // Initialize service
    this.s3Service = new S3Service();
    this.employeeService = new EmployeeService(this.context.prisma);
    AppLogger.info("EmployeeService initialized successfully");
  }

  protected async setupRoutes(): Promise<void> {
    this.employeeController = new EmployeeController(this.employeeService, this.s3Service);
    AppLogger.info("EmployeeController initialized successfully");

    this.employeeRoutes = new EmployeeRoutes(this.employeeController);
    AppLogger.info("EmployeeRoutes initialized successfully");

    this.router.use("/api/employees", this.employeeRoutes.getRouter());
  }
}
