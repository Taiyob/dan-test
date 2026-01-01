import { BaseModule } from "@/core/BaseModule";
import { CertificationTemplateService } from "./certificationTemplate.service";
import { CertificationTemplateController } from "./certificationTemplate.controller";
import { CertificationTemplateRoutes } from "./certificationTemplate.route";
import { AppLogger } from "@/core/logging/logger";

export class CertificationTemplateModule extends BaseModule {
  public readonly name = "CertificationTemplateModule";
  public readonly version = "1.0.0";
  public readonly dependencies = [];

  private certificationTemplateService!: CertificationTemplateService;
  private certificationTemplateController!: CertificationTemplateController;
  private certificationTemplateRoutes!: CertificationTemplateRoutes;

  /**
   * Setup module services
   */
  protected async setupServices(): Promise<void> {
    this.certificationTemplateService = new CertificationTemplateService(
      this.context.prisma
    );
    AppLogger.info("CertificationTemplateService initialized successfully");
  }

  protected async setupRoutes(): Promise<void> {
    this.certificationTemplateController = new CertificationTemplateController(
      this.certificationTemplateService
    );
    AppLogger.info("CertificationTemplateController initialized successfully");

    this.certificationTemplateRoutes = new CertificationTemplateRoutes(
      this.certificationTemplateController
    );
    AppLogger.info("CertificationTemplateRoutes initialized successfully");

    this.router.use(
      "/api/certification-templates",
      this.certificationTemplateRoutes.getRouter()
    );
  }
}