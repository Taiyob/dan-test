import { BaseModule } from "@/core/BaseModule";
import { AssetService } from "./asset.service";
import { AssetController } from "./asset.controller";
import { AssetRoutes } from "./asset.route";
import { AppLogger } from "@/core/logging/logger";

export class AssetModule extends BaseModule {
  public readonly name = "AssetModule";
  public readonly version = "1.0.0";
  public readonly dependencies = [];

  private assetService!: AssetService;
  private assetController!: AssetController;
  private assetRoutes!: AssetRoutes;

  /**
   * Setup module services
   */
  protected async setupServices(): Promise<void> {
    this.assetService = new AssetService(this.context.prisma);
    AppLogger.info("AssetService initialized successfully");
  }

  protected async setupRoutes(): Promise<void> {
    this.assetController = new AssetController(this.assetService);
    AppLogger.info("AssetController initialized successfully");

    this.assetRoutes = new AssetRoutes(this.assetController);
    AppLogger.info("AssetRoutes initialized successfully");

    this.router.use("/api/assets", this.assetRoutes.getRouter());
  }
}
