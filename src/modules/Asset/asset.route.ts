import { Request, Response, Router } from "express";
import { AssetController } from "./asset.controller";
import { validateRequest } from "@/middleware/validation";
import { AssetValidation } from "./asset.validation";
import { asyncHandler } from "@/middleware/asyncHandler";
import { authenticate } from "@/middleware/auth";

export class AssetRoutes {
  private router: Router;
  private assetController: AssetController;

  constructor(assetController: AssetController) {
    this.router = Router();
    this.assetController = assetController;
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // create new asset
    this.router.post(
      "/",
      authenticate,
      validateRequest({
        body: AssetValidation.body.addAsset,
      }),
      asyncHandler((req: Request, res: Response) =>
        this.assetController.createAsset(req, res)
      )
    );

    // get all assets
    this.router.get(
      "/",
      authenticate,
      validateRequest({
        query: AssetValidation.query.list,
      }),
      asyncHandler((req: Request, res: Response) =>
        this.assetController.getAllAssets(req, res)
      )
    );

    // get all assets (ONLY user's clients)
    this.router.get(
      "/by-client",
      authenticate,
      validateRequest({
        query: AssetValidation.query.list,
      }),
      asyncHandler((req: Request, res: Response) =>
        this.assetController.getAssetsByClient(req, res)
      )
    );

    // get asset by id
    this.router.get(
      "/:id",
      authenticate,
      validateRequest({
        params: AssetValidation.params.id,
      }),
      asyncHandler((req: Request, res: Response) =>
        this.assetController.getAssetById(req, res)
      )
    );

    // get asset by id
    this.router.get(
      "/by-client/:id",
      authenticate,
      validateRequest({
        params: AssetValidation.params.id,
      }),
      asyncHandler((req: Request, res: Response) =>
        this.assetController.getAssetByClientId(req, res)
      )
    );

    // update asset by id
    this.router.patch(
      "/:id",
      validateRequest({
        params: AssetValidation.params.id,
        body: AssetValidation.body.updateAsset,
      }),
      asyncHandler((req: Request, res: Response) =>
        this.assetController.updateAssetById(req, res)
      )
    );

    // delete asset by id
    this.router.delete(
      "/:id",
      authenticate,
      validateRequest({
        params: AssetValidation.params.id,
      }),
      asyncHandler((req: Request, res: Response) =>
        this.assetController.deleteAsset(req, res)
      )
    );
  }

  public getRouter(): Router {
    return this.router;
  }
}
