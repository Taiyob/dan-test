import { BaseController } from "@/core/BaseController";
import { Request, Response } from "express";
import { AccessControlService } from "./accessControl.Service";
import { HTTPStatusCode } from "@/types/HTTPStatusCode";

export class AccessControlController extends BaseController {
  constructor(private service: AccessControlService) {
    super();
  }

  public createAccessControl = async (req: Request, res: Response) => {
    const body = req.validatedBody || req.body;
    this.logAction("createAccessControl", req, { body });

    const result = await this.service.createAccessControl(body);
    return this.sendCreatedResponse(res, result, "AccessControl created successfully");
  };

  public getAccessControls = async (req: Request, res: Response) => {
    const query = req.validatedQuery || req.query;
    const result = await this.service.getAccessControls(query);

    this.logAction("getAccessControls", req, { count: result.data.length });

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
      "AccessControls retrieved successfully",
      result.data
    );
  };

  public getAccessControlById = async (req: Request, res: Response) => {
    const { id } = req.validatedParams || req.params;
    this.logAction("getAccessControlById", req, { id });

    const result = await this.service.getAccessControlById(id);
    return this.sendResponse(res, "AccessControl retrieved successfully", HTTPStatusCode.OK, result);
  };

  public updateAccessControl = async (req: Request, res: Response) => {
    const { id } = req.validatedParams || req.params;
    const body = req.validatedBody || req.body;
    this.logAction("updateAccessControl", req, { id, body });

    const result = await this.service.updateAccessControl(id, body);
    return this.sendResponse(res, "AccessControl updated successfully", HTTPStatusCode.OK, result);
  };

  public deleteAccessControl = async (req: Request, res: Response) => {
    const { id } = req.validatedParams || req.params;
    this.logAction("deleteAccessControl", req, { id });

    const result = await this.service.deleteAccessControl(id);
    return this.sendResponse(res, "AccessControl deleted successfully", HTTPStatusCode.OK, result);
  };
}
