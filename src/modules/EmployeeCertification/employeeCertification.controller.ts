import { BaseController } from "@/core/BaseController";
import { EmployeeCertificationService } from "./employeeCertificaton.service";
import { Request, Response } from "express";
import { HTTPStatusCode } from "@/types/HTTPStatusCode";

export class EmployeeCertificationController extends BaseController {
  constructor(private employeeCertificationService: EmployeeCertificationService) {
    super();
  }

  /**
   * Create a new EmployeeCertification
   * POST /api/employee-certifications
   */
  public createEmployeeCert = async (req: Request, res: Response) => {
    const body = req.validatedBody;
    this.logAction("createEmployeeCert", req, { body });

    const result =
      await this.employeeCertificationService.createEmployeeCert(body);

    return this.sendCreatedResponse(
      res,
      result,
      "Employee certification created successfully"
    );
  };

  /**
   * Get all EmployeeCertifications
   * GET /api/employee-certifications
   */
  public getAllEmployeeCerts = async (req: Request, res: Response) => {
    const query = req.validatedQuery;
    const result =
      await this.employeeCertificationService.getEmployeeCerts(query);

    this.logAction("getAllEmployeeCerts", req, { count: result.data.length });

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
      "Employee certifications retrieved successfully",
      result.data
    );
  };

  /**
   * Get an employee cert by ID
   * GET /api/employee-certifications/:id
   */
  public getEmployeeCertById = async (req: Request, res: Response) => {
    const params = req.validatedParams;
    const { id } = params;
    this.logAction("getEmployeeCertById", req, { id });

    const result =
      await this.employeeCertificationService.getEmployeeCertById(id);

    return this.sendResponse(
      res,
      "Employee certification retrieved successfully",
      HTTPStatusCode.OK,
      result
    );
  };

  /**
   * Update an employee cert by ID
   * PATCH /api/employee-certifications/:id
   */
  public updateEmployeeCertById = async (req: Request, res: Response) => {
    const params = req.validatedParams;
    const body = req.validatedBody;
    const { id } = params;
    this.logAction("updateEmployeeCertById", req, { id, body });

    const result = await this.employeeCertificationService.updateEmployeeCert(
      id,
      body
    );

    return this.sendResponse(
      res,
      "Employee certification updated successfully",
      HTTPStatusCode.OK,
      result
    );
  };

  /**
   * Delete an employee cert by ID
   * DELETE /api/employee-certifications/:id
   */
  public deleteEmployeeCert = async (req: Request, res: Response) => {
    const params = req.validatedParams;
    const { id } = params;
    this.logAction("deleteEmployeeCert", req, { employeeCertId: id });

    const result =
      await this.employeeCertificationService.deleteEmployeeCert(id);

    return this.sendResponse(
      res,
      "Employee certification deleted successfully",
      HTTPStatusCode.OK,
      result
    );
  };
}