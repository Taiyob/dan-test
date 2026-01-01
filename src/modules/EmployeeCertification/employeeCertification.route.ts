import { Request, Response, Router } from "express";
import { EmployeeCertificationController } from "./employeeCertification.controller";
import { validateRequest } from "@/middleware/validation";
import { EmployeeCertificationValidation } from "./employeeCertification.validation";
import { asyncHandler } from "@/middleware/asyncHandler";

export class EmployeeCertificationRoutes {
  private router: Router;
  private employeeCertificationController: EmployeeCertificationController;

  constructor(employeeCertificationController: EmployeeCertificationController) {
    this.router = Router();
    this.employeeCertificationController = employeeCertificationController;
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    //create new employee cert
    this.router.post(
      "/",
      validateRequest({
        body: EmployeeCertificationValidation.body.addEmployeeCert,
      }),
      asyncHandler((req: Request, res: Response) =>
        this.employeeCertificationController.createEmployeeCert(req, res)
      )
    );

    //get all employee certs (filtered)
    this.router.get(
      "/",
      validateRequest({
        query: EmployeeCertificationValidation.query.list,
      }),
      asyncHandler((req: Request, res: Response) =>
        this.employeeCertificationController.getAllEmployeeCerts(req, res)
      )
    );

    //get employee cert by id
    this.router.get(
      "/:id",
      validateRequest({
        params: EmployeeCertificationValidation.params.id,
      }),
      asyncHandler((req: Request, res: Response) =>
        this.employeeCertificationController.getEmployeeCertById(req, res)
      )
    );

    //update employee cert by id
    this.router.patch(
      "/:id",
      validateRequest({
        params: EmployeeCertificationValidation.params.id,
        body: EmployeeCertificationValidation.body.updateEmployeeCert,
      }),
      asyncHandler((req: Request, res: Response) =>
        this.employeeCertificationController.updateEmployeeCertById(req, res)
      )
    );

    //delete employee cert by id
    this.router.delete(
      "/:id",
      validateRequest({
        params: EmployeeCertificationValidation.params.id,
      }),
      asyncHandler((req: Request, res: Response) =>
        this.employeeCertificationController.deleteEmployeeCert(req, res)
      )
    );
  }

  public getRouter(): Router {
    return this.router;
  }
}