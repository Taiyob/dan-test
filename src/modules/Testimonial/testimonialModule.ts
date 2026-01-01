import { BaseModule } from "@/core/BaseModule";
import { TestimonialService } from "./testimonial.service";
import { TestimonialController } from "./testimonial.controller";
import { TestimonialRoutes } from "./testimonial.route";
import { AppLogger } from "@/core/logging/logger";

// ---------------------------------------------
// ✅ Testimonial Module
// ---------------------------------------------
export class TestimonialModule extends BaseModule {
  public readonly name = "TestimonialModule";
  public readonly version = "1.0.0";
  public readonly dependencies = [];

  private service!: TestimonialService;
  private controller!: TestimonialController;
  private routes!: TestimonialRoutes;

  /**
   * Setup module services
   */
  protected async setupServices(): Promise<void> {
    this.service = new TestimonialService(this.context.prisma);
    AppLogger.info("TestimonialService initialized successfully");
  }

  /**
   * Setup module routes
   */
  protected async setupRoutes(): Promise<void> {
    this.controller = new TestimonialController(this.service);
    AppLogger.info("TestimonialController initialized successfully");

    this.routes = new TestimonialRoutes(this.controller);
    AppLogger.info("TestimonialRoutes initialized successfully");

    this.router.use("/api/testimonials", this.routes.getRouter());
  }
}