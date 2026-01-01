import { Request, Response, Router } from "express";
import { EmployeeController } from "./employee.controller";
import { validateRequest } from "@/middleware/validation";
import { EmployeeValidation } from "./employee.validation";
import { asyncHandler } from "@/middleware/asyncHandler";
import multer from "multer";
import { authenticate } from "@/middleware/auth";

const upload = multer({ storage: multer.memoryStorage() });

export class EmployeeRoutes {
  private router: Router;
  private employeeController: EmployeeController;

  constructor(employeeController: EmployeeController) {
    this.router = Router();
    this.employeeController = employeeController;
    this.initializeRoutes();
  }

  private initializeRoutes(): void {

    //create new employee
    this.router.post(
        "/",
        authenticate,
        upload.single('avatar'), 
        asyncHandler((req: Request, res: Response) =>
            this.employeeController.createEmployee(req, res)
        )
    );
    // this.router.post(
    //   "/",
    //   validateRequest({
    //     body: EmployeeValidation.body.addEmployee,
    //   }),
    //   asyncHandler((req: Request, res: Response) =>
    //     this.employeeController.createEmployee(req, res)
    //   )
    // );

    //get all employees
    
    
    this.router.get(
      "/",
      validateRequest({
        query: EmployeeValidation.query.list,
      }),
      asyncHandler((req: Request, res: Response) =>
        this.employeeController.getAllEmployees(req, res)
      )
    );

    // get my employees
    this.router.get(
      "/my",
      authenticate,
      validateRequest({
        query: EmployeeValidation.query.list,
      }),
      asyncHandler((req: Request, res: Response) =>
        this.employeeController.getMyEmployees(req, res)
      )
    );

    //get employee by id
    this.router.get(
      "/:id",
      validateRequest({
        params: EmployeeValidation.params.id,
      }),
      asyncHandler((req: Request, res: Response) =>
        this.employeeController.getEmployeeById(req, res)
      )
    );

    //update employee by id
    this.router.patch(
      "/:id",
      validateRequest({
        params: EmployeeValidation.params.id,
        body: EmployeeValidation.body.updateEmployee,
      }),
      asyncHandler((req: Request, res: Response) =>
        this.employeeController.updateEmployeeById(req, res)
      )
    );

    //delete employee by id
    this.router.delete(
      "/:id",
      validateRequest({
        params: EmployeeValidation.params.id,
      }),
      asyncHandler((req: Request, res: Response) =>
        this.employeeController.deleteEmployee(req, res)
      )
    );
  }
  

  public getRouter(): Router {
    return this.router;
  }
}
