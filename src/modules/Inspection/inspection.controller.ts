import { BaseController } from "@/core/BaseController";
import { InspectionService } from "./inspection.service";
import { Request, Response } from "express";
import { HTTPStatusCode } from "@/types/HTTPStatusCode";
import { RequestWithUser } from "@/middleware/auth";

export class InspectionController extends BaseController {
  constructor(private inspectionService: InspectionService) {
    super();
  }

  /**
   * Create a new Inspection
   * POST /api/inspections
   */
  public createInspection = async (req: Request, res: Response) => {
    const body = req.validatedBody || req.body;
    this.logAction("createInspection", req, { body });
    const emailTemplateId = body.emailTemplateId || "";
    console.log("Email Template ID in controller:", body);

    const result = await this.inspectionService.createInspection(body);

    return this.sendCreatedResponse(
      res,
      result,
      "Inspection created successfully"
    );
  };

  /**
   * Get all Inspections with filtering, sorting, and pagination
   * GET /api/inspections
   */
  public getAllInspections = async (req: Request, res: Response) => {
    const query = req.validatedQuery || req.query;
    const result = await this.inspectionService.getInspections(query);

    this.logAction("getAllInspections", req, { count: result.data.length });

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
      "Inspections retrieved successfully",
      result.data
    );
  };

  public getInspectionsByClient = async (req: RequestWithUser, res: Response) => {
    const query = req.validatedQuery || req.query;
    const userId = req.userId!;        
    const role = req.userRole!;

    this.logAction("getInspectionsByClient", req, { userId, role });

    const result = await this.inspectionService.getInspectionsByClient(query, userId, role);

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
      "User's client inspections retrieved successfully",
      result.data
    );
  };

  /**
   * Get an inspection by ID
   * GET /api/inspections/:id
   */
  public getInspectionById = async (req: Request, res: Response) => {
    const params = req.validatedParams || req.params;
    const { id } = params;

    this.logAction("getInspectionById", req, { id });

    const result = await this.inspectionService.getInspectionById(id);

    return this.sendResponse(
      res,
      "Inspection retrieved successfully",
      HTTPStatusCode.OK,
      result
    );
  };

  /**
   * Update an Inspection by ID
   * PATCH /api/inspections/:id
   */
  public updateInspectionById = async (req: Request, res: Response) => {
    const params = req.validatedParams || req.params;
    const body = req.validatedBody || req.body;
    const { id } = params;

    this.logAction("updateInspectionById", req, { id, body });

    const result = await this.inspectionService.updateInspection(id, body);

    return this.sendResponse(
      res,
      "Inspection updated successfully",
      HTTPStatusCode.OK,
      result
    );
  };

  /**
   * Delete an inspection by ID
   * DELETE /api/inspections/:id
   */
  public deleteInspection = async (req: Request, res: Response) => {
    const params = req.validatedParams || req.params;
    const { id } = params;

    const result = await this.inspectionService.deleteInspection(id);

    this.logAction("deleteInspection", req, { inspectionId: id });
    
    return this.sendResponse(
      res,
      "Inspection deleted successfully",
      HTTPStatusCode.OK,
      result
    );
  };
}