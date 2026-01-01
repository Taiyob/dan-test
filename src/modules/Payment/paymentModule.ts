import { BaseModule } from "@/core/BaseModule";
import { PaymentService } from "./payment.service";
import { PaymentController } from "./payment.controller";
import { PaymentRoutes } from "./payment.route";
import { AppLogger } from "@/core/logging/logger";
import { StripeService } from "@/services/StripeService";

export class PaymentModule extends BaseModule {
  public readonly name = "PaymentModule";
  public readonly version = "1.0.0";
  public readonly dependencies = [];

  private service!: PaymentService;
  private controller!: PaymentController;
  private routes!: PaymentRoutes;

  protected async setupServices(): Promise<void> {
    const stripe = new StripeService();
    this.service = new PaymentService(this.context.prisma, stripe);
    AppLogger.info("PaymentService initialized successfully");
  }

  protected async setupRoutes(): Promise<void> {
    this.controller = new PaymentController(this.service);
    this.routes = new PaymentRoutes(this.controller);
    this.router.use("/api/payment", this.routes.getRouter());
    AppLogger.info("PaymentRoutes initialized successfully");
  }
}
