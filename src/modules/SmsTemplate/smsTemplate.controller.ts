import { BaseController } from "@/core/BaseController";
import { Request, Response } from "express";
import { HTTPStatusCode } from "@/types/HTTPStatusCode";
import { SMSTemplateService } from "./smsTemplate.service";

export class SMSTemplateController extends BaseController {
  constructor(private smsTemplateService: SMSTemplateService) {
    super();
  }

  /**
   * ✅ Create a new SMS Template
   * POST /api/sms-templates
   */
  public createTemplate = async (req: Request, res: Response) => {
    const body = req.validatedBody || req.body;
    this.logAction("createTemplate", req, { body });
    console.log("User ID in createTemplate:", req?.userId);

    const result = await this.smsTemplateService.createTemplate(body, req?.userId);

    return this.sendCreatedResponse(
      res,
      result,
      "SMS Template created successfully"
    );
  };

  /**
   * ✅ Get all SMS Templates
   * GET /api/sms-templates
   */
  public getAllTemplates = async (req: Request, res: Response) => {
    const query = req.validatedQuery || req.query;
    const result = await this.smsTemplateService.getTemplates(query);

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
      "SMS Templates retrieved successfully",
      result.data
    );
  };

  public getTemplatesByUser = async (req: Request, res: Response) => {
  const query = req.validatedQuery || req.query;
  const userId = req?.userId; 

  if (!userId) {
    throw new Error("User ID is required");
  }

  const result = await this.smsTemplateService.getTemplatesByUser(query, userId);

  this.logAction("getTemplatesByUser", req, { userId, count: result.data.length });

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
    "SMS Templates retrieved successfully",
    result.data
  );
};


  /**
   * ✅ Get a SMS Template by ID
   * GET /api/sms-templates/:id
   */
  public getTemplateById = async (req: Request, res: Response) => {
    const { id } = req.validatedParams || req.params;
    const result = await this.smsTemplateService.getTemplateById(id);

    return this.sendResponse(
      res,
      "SMS Template retrieved successfully",
      HTTPStatusCode.OK,
      result
    );
  };

  /**
   * ✅ Update SMS Template by ID
   * PATCH /api/sms-templates/:id
   */
  public updateTemplateById = async (req: Request, res: Response) => {
    const { id } = req.validatedParams || req.params;
    const body = req.validatedBody || req.body;

    const result = await this.smsTemplateService.updateTemplate(id, body);

    return this.sendResponse(
      res,
      "SMS Template updated successfully",
      HTTPStatusCode.OK,
      result
    );
  };

  /**
   * ✅ Delete SMS Template by ID
   * DELETE /api/sms-templates/:id
   */
  public deleteTemplate = async (req: Request, res: Response) => {
    const { id } = req.validatedParams || req.params;
    const result = await this.smsTemplateService.deleteTemplate(id);

    this.logAction("deleteTemplate", req, { templateId: id });

    return this.sendResponse(
      res,
      "SMS Template deleted successfully",
      HTTPStatusCode.OK,
      result
    );
  };
}
