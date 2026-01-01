import { BaseModule } from "@/core/BaseModule";
import { AccessControlService } from "./accessControl.Service";
import { AccessControlController } from "./accessControl.controller";
import { AccessControlRoutes } from "./accessControl.route";
import { AppLogger } from "@/core/logging/logger";

export class AccessControlModule extends BaseModule {
  public readonly name = "AccessControlModule";
  public readonly version = "1.0.0";
  public readonly dependencies = [];

  private service!: AccessControlService;
  private controller!: AccessControlController;
  private routes!: AccessControlRoutes;

  protected async setupServices(): Promise<void> {
    this.service = new AccessControlService(this.context.prisma);
    AppLogger.info("AccessControlService initialized successfully");
  }

  protected async setupRoutes(): Promise<void> {
    this.controller = new AccessControlController(this.service);
    this.routes = new AccessControlRoutes(this.controller);

    this.router.use("/api/access-controls", this.routes.getRouter());
    AppLogger.info("AccessControlRoutes initialized successfully");
  }
}
