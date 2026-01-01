import { BaseModule } from "@/core/BaseModule";
import { MembershipService } from "./membership.service";
import { MembershipRoutes } from "./membership.route";
import { AppLogger } from "@/core/logging/logger";
import { MembershipController } from "./membersip.controller";
import { StripeService } from "@/services/StripeService";

// ---------------------------------------------
// Membership Module
// ---------------------------------------------
export class MembershipModule extends BaseModule {
  public readonly name = "MembershipModule";
  public readonly version = "1.0.0";
  public readonly dependencies = [];

  private service!: MembershipService;
  private controller!: MembershipController;
  private routes!: MembershipRoutes;

  /**
   * Setup module services
   */
  protected async setupServices(): Promise<void> {
    const stripe = new StripeService();
    this.service = new MembershipService(this.context.prisma, stripe);
    AppLogger.info("MembershipService initialized successfully");
  }
  // protected async setupServices(): Promise<void> {
  //   this.service = new MembershipService(this.context.prisma);
  //   AppLogger.info("MembershipService initialized successfully");
  // }

  /**
   * Setup module routes
   */
  protected async setupRoutes(): Promise<void> {
    this.controller = new MembershipController(this.service);
    AppLogger.info("MembershipController initialized successfully");

    this.routes = new MembershipRoutes(this.controller);
    AppLogger.info("MembershipRoutes initialized successfully");

    this.router.use("/api/memberships", this.routes.getRouter());
  }
}