import { BaseService } from "@/core/BaseService";
import { AppLogger } from "@/core/logging/logger";
import { NotFoundError, ConflictError } from "@/core/errors/AppError";
import { PrismaClient, AccessControl } from "@prisma/client";
import {
  AddAccessControlInput,
  AccessControlListQuery,
  UpdateAccessControlInput,
} from "./accessControl.validation";

// ---------------------------------------------
// ✅ AccessControl Service
// ---------------------------------------------
export class AccessControlService extends BaseService<AccessControl> {
  constructor(prisma: PrismaClient) {
    super(prisma, "AccessControl", {
      enableSoftDelete: true,
      enableAuditFields: true,
    });
  }

  protected getModel() {
    return this.prisma.accessControl;
  }

  /**
   * Create a new AccessControl
   */
  async createAccessControl(data: AddAccessControlInput): Promise<AccessControl> {
    // Ensure membership does not already have AccessControl
    const existing = await this.findOne({ membershipId: data.membershipId });
    if (existing) {
      throw new ConflictError("AccessControl for this membership already exists");
    }

    const accessControl = await this.create(data);
    AppLogger.info(`AccessControl created (ID: ${accessControl.id})`);
    return accessControl;
  }

  /**
   * Get all AccessControls with pagination
   */
  async getAccessControls(query: AccessControlListQuery) {
    const { page, limit, sortBy = "createdAt", sortOrder = "desc" } = query;

    const result = await this.findMany(
      {},
      { page, limit, offset: (page - 1) * limit },
      { [sortBy]: sortOrder },
      {}
    );

    AppLogger.info(`AccessControls found: ${result.data.length}`);
    return result;
  }

  /**
   * Get AccessControl by ID
   */
  async getAccessControlById(id: string): Promise<AccessControl> {
    const accessControl = await this.findById(id);
    if (!accessControl) throw new NotFoundError("AccessControl");
    return accessControl;
  }

  /**
   * Update AccessControl by ID
   */
  async updateAccessControl(id: string, data: UpdateAccessControlInput): Promise<AccessControl> {
    const exists = await this.exists({ id });
    if (!exists) throw new NotFoundError("AccessControl");

    const updated = await this.updateById(id, data);
    AppLogger.info(`AccessControl updated (ID: ${updated.id})`);
    return updated;
  }

  /**
   * Soft Delete AccessControl by ID
   */
  async deleteAccessControl(id: string): Promise<AccessControl> {
    const exists = await this.exists({ id });
    if (!exists) throw new NotFoundError("AccessControl");

    const deleted = await this.deleteById(id);
    AppLogger.info(`AccessControl deleted (ID: ${deleted.id})`);
    return deleted;
  }
}
