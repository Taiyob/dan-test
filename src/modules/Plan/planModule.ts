import { BaseModule } from "@/core/BaseModule";
import { PlanService } from "./plan.service";
import { PlanController } from "./plan.controller";
import { PlanRoutes } from "./plan.route";
import { AppLogger } from "@/core/logging/logger";
import { StripeService } from "@/services/StripeService";

export class PlanModule extends BaseModule {
  public readonly name = "PlanModule";
  public readonly version = "1.0.0";
  public readonly dependencies = [];

  private service!: PlanService;
  private controller!: PlanController;
  private routes!: PlanRoutes;

  protected async setupServices(): Promise<void> {
    const stripe = new StripeService();
    this.service = new PlanService(this.context.prisma, stripe);
    AppLogger.info("PlanService initialized successfully");
  }

  protected async setupRoutes(): Promise<void> {
    this.controller = new PlanController(this.service);
    this.routes = new PlanRoutes(this.controller);
    this.router.use("/api/plans", this.routes.getRouter());
    AppLogger.info("PlanRoutes initialized successfully");
  }
}
