import { Request, Response, Router } from "express";
import { InspectionController } from "./inspection.controller";
import { validateRequest } from "@/middleware/validation";
import { InspectionValidation } from "./inspection.validation";
import { asyncHandler } from "@/middleware/asyncHandler";
import { authenticate } from "@/middleware/auth";

export class InspectionRoutes {
  private router: Router;
  private inspectionController: InspectionController;

  constructor(inspectionController: InspectionController) {
    this.router = Router();
    this.inspectionController = inspectionController;
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // create new inspection
    this.router.post(
      "/",
      validateRequest({
        body: InspectionValidation.body.addInspection,
      }),
      asyncHandler((req: Request, res: Response) =>
        this.inspectionController.createInspection(req, res)
      )
    );

    // get all inspections
    this.router.get(
      "/",
      validateRequest({
        query: InspectionValidation.query.list,
      }),
      asyncHandler((req: Request, res: Response) =>
        this.inspectionController.getAllInspections(req, res)
      )
    );

    this.router.get(
      "/by-client",
      authenticate,
      validateRequest({
        query: InspectionValidation.query.list,
      }),
      asyncHandler((req: Request, res: Response) =>
        this.inspectionController.getInspectionsByClient(req, res)
      )
    );


    // get inspection by id
    this.router.get(
      "/:id",
      validateRequest({
        params: InspectionValidation.params.id,
      }),
      asyncHandler((req: Request, res: Response) =>
        this.inspectionController.getInspectionById(req, res)
      )
    );

    
    // update inspection by id
    this.router.patch(
      "/:id",
      validateRequest({
        params: InspectionValidation.params.id,
        body: InspectionValidation.body.updateInspection,
      }),
      asyncHandler((req: Request, res: Response) =>
        this.inspectionController.updateInspectionById(req, res)
      )
    );

    // delete inspection by id
    this.router.delete(
      "/:id",
      validateRequest({
        params: InspectionValidation.params.id,
      }),
      asyncHandler((req: Request, res: Response) =>
        this.inspectionController.deleteInspection(req, res)
      )
    );
  }

  public getRouter(): Router {
    return this.router;
  }
}