import { BaseModule } from "@/core/BaseModule";
import { EmailTemplateService } from "./emailTemplate.service";
import { EmailTemplateController } from "./emailTemplate.controller";
import { EmailTemplateRoutes } from "./emailTemplate.route";
import { AppLogger } from "@/core/logging/logger";

// ---------------------------------------------
// ✅ EmailTemplate Module
// ---------------------------------------------
export class EmailTemplateModule extends BaseModule {
  public readonly name = "EmailTemplateModule";
  public readonly version = "1.0.0";
  public readonly dependencies = [];

  private service!: EmailTemplateService;
  private controller!: EmailTemplateController;
  private routes!: EmailTemplateRoutes;

  /**
   * Setup module services
   */
  protected async setupServices(): Promise<void> {
    this.service = new EmailTemplateService(this.context.prisma);
    AppLogger.info("EmailTemplateService initialized successfully");
  }

  /**
   * Setup module routes
   */
  protected async setupRoutes(): Promise<void> {
    this.controller = new EmailTemplateController(this.service);
    this.routes = new EmailTemplateRoutes(this.controller);

    this.router.use("/api/email-templates", this.routes.getRouter());
    AppLogger.info("EmailTemplateRoutes initialized successfully");
  }
}
