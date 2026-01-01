import { BaseModule } from "@/core/BaseModule";
import { ReminderService } from "./reminder.service";
import { ReminderController } from "./reminder.controller";
import { ReminderRoutes } from "./reminder.route";
import { AppLogger } from "@/core/logging/logger";

// ---------------------------------------------
// ✅ Reminder Module
// ---------------------------------------------
export class ReminderModule extends BaseModule {
  public readonly name = "ReminderModule";
  public readonly version = "1.0.0";
  public readonly dependencies = [];

  private service!: ReminderService;
  private controller!: ReminderController;
  private routes!: ReminderRoutes;

  /**
   * Setup module services
   */
  protected async setupServices(): Promise<void> {
    this.service = new ReminderService(this.context.prisma);
    AppLogger.info("ReminderService initialized successfully");
  }

  /**
   * Setup module routes
   */
  protected async setupRoutes(): Promise<void> {
    this.controller = new ReminderController(this.service);
    this.routes = new ReminderRoutes(this.controller);

    this.router.use("/api/reminders", this.routes.getRouter());
    AppLogger.info("ReminderRoutes initialized successfully");
  }
}
