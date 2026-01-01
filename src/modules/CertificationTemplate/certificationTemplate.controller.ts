import { BaseController } from "@/core/BaseController";
import { CertificationTemplateService } from "./certificationTemplate.service";
import { Request, Response } from "express";
import { HTTPStatusCode } from "@/types/HTTPStatusCode";

export class CertificationTemplateController extends BaseController {
  constructor(private certificationTemplateService: CertificationTemplateService) {
    super();
  }

  /**
   * Create a new CertificationTemplate
   * POST /api/certification-templates
   */
  public createTemplate = async (req: Request, res: Response) => {
    const body = req.validatedBody;
    this.logAction("createTemplate", req, { body });

    const result = await this.certificationTemplateService.createTemplate(body);

    return this.sendCreatedResponse(
      res,
      result,
      "Certification template created successfully"
    );
  };

  /**
   * Get all CertificationTemplates
   * GET /api/certification-templates
   */
  public getAllTemplates = async (req: Request, res: Response) => {
    const query = req.validatedQuery;
    const result = await this.certificationTemplateService.getTemplates(query);

    this.logAction("getAllTemplates", req, { count: result.data.length });

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
      "Certification templates retrieved successfully",
      result.data
    );
  };

  /**
   * Get a template by ID
   * GET /api/certification-templates/:id
   */
  public getTemplateById = async (req: Request, res: Response) => {
    const params = req.validatedParams;
    const { id } = params;
    this.logAction("getTemplateById", req, { id });

    const result = await this.certificationTemplateService.getTemplateById(id);

    return this.sendResponse(
      res,
      "Certification template retrieved successfully",
      HTTPStatusCode.OK,
      result
    );
  };

  /**
   * Update a template by ID
   * PATCH /api/certification-templates/:id
   */
  public updateTemplateById = async (req: Request, res: Response) => {
    const params = req.validatedParams;
    const body = req.validatedBody;
    const { id } = params;
    this.logAction("updateTemplateById", req, { id, body });

    const result = await this.certificationTemplateService.updateTemplate(id, body);

    return this.sendResponse(
      res,
      "Certification template updated successfully",
      HTTPStatusCode.OK,
      result
    );
  };

  /**
   * Delete a template by ID
   * DELETE /api/certification-templates/:id
   */
  public deleteTemplate = async (req: Request, res: Response) => {
    const params = req.validatedParams;
    const { id } = params;
    this.logAction("deleteTemplate", req, { templateId: id });

    const result = await this.certificationTemplateService.deleteTemplate(id);

    return this.sendResponse(
      res,
      "Certification template deleted successfully",
      HTTPStatusCode.OK,
      result
    );
  };
}