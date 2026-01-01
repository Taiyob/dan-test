import { BaseController } from "@/core/BaseController";
import { EmployeeService } from "./employee.service";
import { Request, Response } from "express";
import { HTTPStatusCode } from "@/types/HTTPStatusCode";
import { S3Service } from "@/services/S3Service";
import { RequestWithUser } from "@/middleware/auth";

export class EmployeeController extends BaseController {
  constructor(private employeeService: EmployeeService, private s3Service: S3Service) {
    super();
  }

  /**
   * Create a new Employee
   * POST /api/employees
   */

  public createEmployee = async (req: Request, res: Response) => {
    let employeeData = req.body.employee;

    if (typeof employeeData === 'string') {
        employeeData = JSON.parse(employeeData);
    }

    this.logAction("createEmployee", req, { email: employeeData?.email });

    let avatarUrl: string | undefined = undefined;

    if (req.file) {
        avatarUrl = await this.s3Service.uploadFile(req.file, "employees");
    }

    const loggedInUserId = this.getUserId(req);

    if (!loggedInUserId) {
        return res.status(401).json({
            success: false,
            error: {
                message: "User not authenticated",
                code: "UNAUTHENTICATED",
                statusCode: 401,
                timestamp: new Date().toISOString(),
                requestId: (res.req as any).id,
            },
        });
    }

    // const userRole = this.getUserRole(req);
    // if (userRole !== 'employer' && userRole !== 'admin') {
    //     return res.status(403).json({ ... forbidden format ... });
    // }

    try {
        const result = await this.employeeService.createEmployee({
            ...employeeData,
            employerId: loggedInUserId,      
            avatarUrl,
        });

        return this.sendCreatedResponse(
            res,
            result,
            "Employee created successfully"
        );
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            error: {
                message: error.message || "Failed to create employee",
                code: "BAD_REQUEST",
                statusCode: 400,
                timestamp: new Date().toISOString(),
                requestId: (res.req as any).id,
            },
        });
    }
  };

  /**
   * Get all Employees with filtering, sorting, and pagination
   * GET /api/employees
   */

  public getAllEmployees = async (req: Request, res: Response) => {
    const query = req.validatedQuery || req.query;
    const result = await this.employeeService.getEmployees(query);

    this.logAction("getAllEmployees", req, { count: result.data.length });

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
      "Employees retrieved successfully",
      result.data
    );
  };

  /**
 * Get employees created by logged-in employer
 * GET /api/employees/my
 */
  public getMyEmployees = async (req: RequestWithUser, res: Response) => {
    const query = req.validatedQuery || req.query;
    const employerId = req.userId!;

    this.logAction("getMyEmployees", req, { employerId });

    const result = await this.employeeService.getEmployeesByEmployer(
      employerId,
      query
    );

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
      "My employees retrieved successfully",
      result.data
    );
  };

  /**
   * Get an employee by ID
   * GET /api/employee/:id
   */

  public getEmployeeById = async (req: Request, res: Response) => {
    const params = req.validatedParams || req.params;
    const { id } = params;

    this.logAction("getEmployeeById", req, { id });

    const result = await this.employeeService.getEmployeeById(id);

    return this.sendResponse(
      res,
      "Employee retrieved successfully",
      HTTPStatusCode.OK,
      result
    );
  };

  /**
   * Update a Employee by ID
   * PATCH /api/employees/:id
   */
  public updateEmployeeById = async (req: Request, res: Response) => {
    const params = req.validatedParams || req.params;
    const body = req.validatedBody || req.body;
    const { id } = params;

    this.logAction("updateEmployeeById", req, { id, body });

    const result = await this.employeeService.updateEmployee(id, body);

    return this.sendResponse(
      res,
      "Employee updated successfully",
      HTTPStatusCode.OK,
      result
    );
  };


    /**
   * Delete a employee by ID
   * DELETE /api/employees/:id
   */
    public deleteEmployee = async (req: Request, res: Response) => {
        const params = req.validatedParams || req.params;
        const { id } = params;

        const result = await this.employeeService.deleteEmployee(id);

        this.logAction("deleteEmployee", req, { employeeId: id });
        
        return this.sendResponse(
            res,
            "Employee deleted successfully",
            HTTPStatusCode.OK,
            result
        );
    }

  
}
