import { BaseService } from "@/core/BaseService";
import { AppLogger } from "@/core/logging/logger";
import { ConflictError, NotFoundError } from "@/core/errors/AppError";
import { CertificationTemplate, PrismaClient } from "@prisma/client";
import {
  AddCertificationTemplateInput,
  CertificationTemplateListQuery,
  UpdateCertificationTemplateInput,
} from "./certificatoinTemplate.validation";

export class CertificationTemplateService extends BaseService<CertificationTemplate> {
  constructor(prisma: PrismaClient) {
    super(prisma, "CertificationTemplate", {
      enableSoftDelete: true,
      enableAuditFields: true,
    });
  }

  protected getModel() {
    return this.prisma.certificationTemplate;
  }

  /**
   * Create a new certification template
   */
  async createTemplate(
    data: AddCertificationTemplateInput
  ): Promise<CertificationTemplate> {

    const existingTemplate = await this.findOne({ name: data.name });
    if (existingTemplate) {
      throw new ConflictError("A certification template with this name already exists");
    }

    AppLogger.info(`Creating new CertificationTemplate: ${data.name}`);
    const newTemplate = await this.create(data);
    AppLogger.info(`New Template created: ${newTemplate.name} (ID: ${newTemplate.id})`);
    return newTemplate;
  }

  /**
   * Get all templates with filtering and pagination
   */
  async getTemplates(query: CertificationTemplateListQuery) {
    const {
      page,
      limit,
      search,
      sortBy = "name",
      sortOrder = "asc",
      ...rest
    } = query;

    let filters: any = {
       // Always filter by employer
    };

    if (search) {
      filters.name = { contains: search, mode: "insensitive" };
    }

    filters = this.mergeFilters(filters, this.applyFilters(rest));

    const result = await this.findMany(
      filters,
      { page, limit, offset: (page - 1) * limit },
      { [sortBy]: sortOrder },
      {} // No includes needed by default
    );

    AppLogger.info(`🎉 CertificationTemplates found: ${result.data.length}`);
    return result;
  }

  /**
   * Get a template by ID
   */
  async getTemplateById(id: string): Promise<CertificationTemplate | null> {
    const template = await this.findById(id);
    if (!template) {
      throw new NotFoundError("CertificationTemplate");
    }
    return template;
  }

  /**
   * Update a template by ID
   */
  async updateTemplate(
    id: string,
    data: UpdateCertificationTemplateInput
  ): Promise<CertificationTemplate> {
    const template = await this.exists({ id });
    if (!template) {
      throw new NotFoundError("CertificationTemplate");
    }
    const updatedTemplate = await this.updateById(id, data);
    AppLogger.info(`Template updated: ${updatedTemplate.name} (ID: ${updatedTemplate.id})`);
    return updatedTemplate;
  }

  /**
   * Soft Delete a template by ID
   */
  async deleteTemplate(id: string): Promise<CertificationTemplate> {
    const template = await this.exists({ id });
    if (!template) {
      throw new NotFoundError("CertificationTemplate");
    }
    const deletedTemplate = await this.deleteById(id);
    AppLogger.info(`Template deleted: ${deletedTemplate.name} (ID: ${deletedTemplate.id})`);
    return deletedTemplate;
  }
}