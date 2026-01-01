import { BaseService } from "@/core/BaseService";
import { AppLogger } from "@/core/logging/logger";
import { ConflictError, NotFoundError } from "@/core/errors/AppError";
import { Asset, PrismaClient } from "@prisma/client";
import { AddAssetInput, AssetListQuery, UpdateAssetInput } from "./asset.validation";

export class AssetService extends BaseService<Asset> {
  constructor(prisma: PrismaClient) {
    super(prisma, "Asset", {
      enableSoftDelete: true,
      enableAuditFields: true,
    });
  }

  protected getModel() {
    return this.prisma.asset;
  }

  /**
   * Merge filters dynamically for queries
   */
  private mergeFilters(query: AssetListQuery) {
    const filters: any = {};

    if (query.search) {
      filters.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { model: { contains: query.search, mode: "insensitive" } },
        { serialNo: { contains: query.search, mode: "insensitive" } },
        { location: { contains: query.search, mode: "insensitive" } },
        {
          client: {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { company: { contains: query.search, mode: "insensitive" } },
            ],
          },
        },
      ];
    }

    if (query.clientId) filters.clientId = query.clientId;
    if (query.status) filters.status = query.status;

    return filters;
  }

  private mergeFiltersForClient(query: AssetListQuery, userId: string) {
    const filters: any = {
      client: {
        ownerId: userId, 
      },
    };

    if (query.search) {
      filters.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { model: { contains: query.search, mode: "insensitive" } },
        { serialNo: { contains: query.search, mode: "insensitive" } },
        { location: { contains: query.search, mode: "insensitive" } },
      ];
    }

    if (query.clientId) filters.clientId = query.clientId;
    if (query.status) filters.status = query.status;

    return filters;
  }

  async getAssetsByClient(query: AssetListQuery, userId: string, role: string) {
    const { page = 1, limit = 10, sortBy = "createdAt", sortOrder = "desc" } = query;

    console.log("From service userid", userId);

    const filters: any = {
      isDeleted: false,
      client: {
        ownerId: userId,  
      },
    };

    // Search
    if (query.search) {
      filters.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { model: { contains: query.search, mode: "insensitive" } },
        { serialNo: { contains: query.search, mode: "insensitive" } },
        { location: { contains: query.search, mode: "insensitive" } },
      ];
    }

    if (query.clientId) {
      filters.client.AND = [
        { ownerId: userId },
        { id: query.clientId },
      ];
    }

    return this.findMany(
      filters,
      { page, limit, offset: (page - 1) * limit },
      { [sortBy]: sortOrder },
      {
        client: true,
      }
    );
  }

  async getAssetByClientId(assetId: string,userId: string,role: string) {
    const where: any = {
      id: assetId,
      isDeleted: false,
    };

    // non-admin → only own client assets
    if (role !== "admin") {
      where.client = {
        ownerId: userId,
      };
    }

    const asset = await this.prisma.asset.findFirst({
      where: {
        //clientId: 
      },
      include: {
        client: true,
      },
    });

    if (!asset) {
      throw new NotFoundError("Asset");
    }

    return asset;
  }

  /**
   * Create a new asset
   */
  async createAsset(data: AddAssetInput): Promise<Asset> {
    if (data.serialNo) {
      const existingAsset = await this.findOne({ serialNo: data.serialNo });
      if (existingAsset) {
        AppLogger.warn(`Asset with serial number ${data.serialNo} already exists.`);
        throw new ConflictError("Asset with this serial number already exists");
      }
    }

    AppLogger.info(`Creating new Asset for client ${data.clientId}`);
    const newAsset = await this.create(data);
    AppLogger.info(`New Asset created: ${newAsset.id} (Serial: ${newAsset.serialNo})`);
    return newAsset;
  }

  /**
   * Get all assets with optional filters, search, and pagination
   */
  async getAssets(query: AssetListQuery) {
    const { page = 1, limit = 10, sortBy = "createdAt", sortOrder = "desc" } = query;

    const filters = this.mergeFilters(query);

    const result = await this.findMany(
      filters,
      { page, limit, offset: (page - 1) * limit },
      { [sortBy]: sortOrder },
      {}
    );

    AppLogger.info(`🎉 Assets found: ${result.data.length}`);
    return result;
  }

  /**
   * Get an asset by ID
   */
  async getAssetById(id: string): Promise<Asset | null> {
    const asset = await this.findById(id);
    if (!asset) throw new NotFoundError("Asset");
    return asset;
  }

  /**
   * Update an asset by ID
   */
  async updateAsset(id: string, data: UpdateAssetInput): Promise<Asset> {
    const asset = await this.exists({ id });
    if (!asset) throw new NotFoundError("Asset");

    if (data.serialNo) {
      const existingAssetWithSerial = await this.findOne({ serialNo: data.serialNo });
      if (existingAssetWithSerial && existingAssetWithSerial.id !== id) {
        throw new ConflictError(`Another asset with serial number ${data.serialNo} already exists.`);
      }
    }

    const updatedAsset = await this.updateById(id, data);
    AppLogger.info(`Asset updated: ${updatedAsset.id} (Serial: ${updatedAsset.serialNo})`);
    return updatedAsset;
  }

  /**
   * Delete an asset by ID
   */
  async deleteAsset(id: string): Promise<Asset> {
    const asset = await this.exists({ id });
    if (!asset) throw new NotFoundError("Asset");

    const deletedAsset = await this.deleteById(id);
    AppLogger.info(`Asset deleted: ${deletedAsset.id} (Serial: ${deletedAsset.serialNo})`);
    return deletedAsset;
  }
}
