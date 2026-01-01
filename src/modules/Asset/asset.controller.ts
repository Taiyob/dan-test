import { BaseController } from "@/core/BaseController";
import { AssetService } from "./asset.service";
import { Request, Response } from "express";
import { HTTPStatusCode } from "@/types/HTTPStatusCode";
import { RequestWithUser } from "@/middleware/auth";

export class AssetController extends BaseController {
  constructor(private assetService: AssetService) {
    super();
  }

  /**
   * Create a new Asset
   * POST /api/assets
   */
  public createAsset = async (req: Request, res: Response) => {
    const body = req.validatedBody || req.body;
    this.logAction("createAsset", req, { body });

    const result = await this.assetService.createAsset(body);

    return this.sendCreatedResponse(
      res,
      result,
      "Asset created successfully"
    );
  };

  /**
   * Get all Assets with filtering, sorting, and pagination
   * GET /api/assets
   */
  public getAllAssets = async (req: Request, res: Response) => {
    const query = req.validatedQuery || req.query;
    const result = await this.assetService.getAssets(query);

    this.logAction("getAllAssets", req, { count: result.data.length });

    return this.sendPaginatedResponse(
      res,
      {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
        hasNext: result.hasNext,
        hasPrevious: result.hasPrevious,
      },
      "Assets retrieved successfully",
      result.data
    );
  };

  public getAssetsByClient = async (req: RequestWithUser, res: Response) => {
    const query = req.validatedQuery || req.query;
    const userId = req.userId!;
    const role = req.userRole!;

    const result = await this.assetService.getAssetsByClient(query, userId, role);

    return this.sendPaginatedResponse(
      res,
      {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
        hasNext: result.hasNext,
        hasPrevious: result.hasPrevious,
      },
      "Clients Assets retrieved successfully",
      result.data
    );
  };

  public getAssetByClientId = async (req: RequestWithUser, res: Response) => {
    const { id } = req.validatedParams || req.params;
    const userId = req.userId!;
    const role = req.userRole!;

    const asset = await this.assetService.getAssetByClientId(id, userId, role);

    return this.sendResponse(
      res,
      "Asset retrieved successfully",
      HTTPStatusCode.OK,
      asset
    );
  };


  /**
   * Get an asset by ID
   * GET /api/assets/:id
   */
  public getAssetById = async (req: Request, res: Response) => {
    const params = req.validatedParams || req.params;
    const { id } = params;

    this.logAction("getAssetById", req, { id });

    const result = await this.assetService.getAssetById(id);

    return this.sendResponse(
      res,
      "Asset retrieved successfully",
      HTTPStatusCode.OK,
      result
    );
  };

  /**
   * Update an Asset by ID
   * PATCH /api/assets/:id
   */
  public updateAssetById = async (req: Request, res: Response) => {
    const params = req.validatedParams || req.params;
    const body = req.validatedBody || req.body;
    const { id } = params;

    this.logAction("updateAssetById", req, { id, body });

    const result = await this.assetService.updateAsset(id, body);

    return this.sendResponse(
      res,
      "Asset updated successfully",
      HTTPStatusCode.OK,
      result
    );
  };

  /**
   * Delete an asset by ID
   * DELETE /api/assets/:id
   */
  public deleteAsset = async (req: Request, res: Response) => {
    const params = req.validatedParams || req.params;
    const { id } = params;

    const result = await this.assetService.deleteAsset(id);

    this.logAction("deleteAsset", req, { assetId: id });
    
    return this.sendResponse(
      res,
      "Asset deleted successfully",
      HTTPStatusCode.OK,
      result
    );
  };
}
