import { BaseService } from "@/core/BaseService";
import { AppLogger } from "@/core/logging/logger";
import { ConflictError, NotFoundError } from "@/core/errors/AppError";
import { PrismaClient, SMSTemplate } from "@prisma/client";
import { AddSMSTemplateInput, SMSTemplateListQuery } from "./smsTemplate.validation";

export class SMSTemplateService extends BaseService<SMSTemplate> {
  constructor(prisma: PrismaClient) {
    super(prisma, "SMSTemplate", {
      enableSoftDelete: false,
      enableAuditFields: true,
    });
  }

  protected getModel() {
    return this.prisma.sMSTemplate;
  }

  /**
   * Create a new SMS Template
   */
  async createTemplate(data: AddSMSTemplateInput, userId: string | undefined): Promise<SMSTemplate> {
    console.log("Creating template for User ID:", userId);
    const { name, content } = data;

    const existingTemplate = await this.findOne({ name });

    if (existingTemplate) {
      AppLogger.warn(`SMS Template with name "${name}" already exists.`);
      throw new ConflictError("SMS Template with this name already exists");
    }

    AppLogger.info(`Creating new SMS Template: ${name}`);

    const newTemplate = await this.create({ name, content, userId });

    AppLogger.info(
      `New SMS Template created: ${newTemplate.name} (ID: ${newTemplate.id})`
    );

    return newTemplate;
  }

  /**
   * Get all SMS Templates with filtering, sorting, pagination
   */
  async getTemplates(query: SMSTemplateListQuery) {
    const {
      page,
      limit,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query;

    let filters: any = {};

    if (search) {
      filters.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
      ];
    }

    const result = await this.findMany(
      filters,
      { page, limit, offset: (page - 1) * limit },
      { [sortBy]: sortOrder },
      {}
    );

    AppLogger.info(`📩 SMS Templates found: ${result.data.length}`);

    return result;
  }

  async getTemplatesByUser(query: SMSTemplateListQuery, userId: string) {
  const { page, limit, search, sortBy = "createdAt", sortOrder = "desc" } = query;

  let filters: any = { userId };

  if (search) {
    filters.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { content: { contains: search, mode: "insensitive" } },
    ];
  }

  const result = await this.findMany(
    filters,
    { page, limit, offset: (page - 1) * limit },
    { [sortBy]: sortOrder },
    {}
  );

  AppLogger.info(`📩 SMS templates found: ${result.data.length}`);
  return result;
}


  /**
   * Get a SMS Template by ID
   */
  async getTemplateById(id: string): Promise<SMSTemplate> {
    const template = await this.findById(id);
    if (!template) {
      throw new NotFoundError("SMS Template");
    }
    return template;
  }

  /**
   * Update SMS Template by ID
   */
  async updateTemplate(
    id: string,
    data: Partial<AddSMSTemplateInput>
  ): Promise<SMSTemplate> {
    const template = await this.exists({ id });
    if (!template) {
      throw new NotFoundError("SMS Template");
    }

    const updated = await this.updateById(id, data);
    AppLogger.info(
      `SMS Template updated: ${updated.name} (ID: ${updated.id})`
    );
    return updated;
  }

  /**
   * Delete a SMS Template by ID
   */
  async deleteTemplate(id: string): Promise<SMSTemplate> {
    const template = await this.exists({ id });
    if (!template) {
      throw new NotFoundError("SMS Template");
    }

    const deleted = await this.deleteById(id);
    AppLogger.info(
      `SMS Template deleted: ${deleted.name} (ID: ${deleted.id})`
    );

    return deleted;
  }
}
