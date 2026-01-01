import { BaseModule } from "@/core/BaseModule";
import { AppLogger } from "@/core/logging/logger";
import { SMSTemplateService } from "./smsTemplate.service";
import { SMSTemplateController } from "./smsTemplate.controller";
import { SMSTemplateRoutes } from "./smsTemplate.route";

export class SMSTemplateModule extends BaseModule {
  public readonly name = "SMSTemplateModule";
  public readonly version = "1.0.0";
  public readonly dependencies = [];

  private smsTemplateService!: SMSTemplateService;
  private smsTemplateController!: SMSTemplateController;
  private smsTemplateRoutes!: SMSTemplateRoutes;

  protected async setupServices(): Promise<void> {
    this.smsTemplateService = new SMSTemplateService(this.context.prisma);
    AppLogger.info("SMSTemplateService initialized successfully");
  }

  protected async setupRoutes(): Promise<void> {
    this.smsTemplateController = new SMSTemplateController(this.smsTemplateService);
    AppLogger.info("SMSTemplateController initialized successfully");

    this.smsTemplateRoutes = new SMSTemplateRoutes(this.smsTemplateController);
    AppLogger.info("SMSTemplateRoutes initialized successfully");

    this.router.use("/api/sms-templates", this.smsTemplateRoutes.getRouter());
  }
}
