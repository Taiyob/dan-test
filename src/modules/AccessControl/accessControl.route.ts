import { Router, Request, Response } from "express";
import { AccessControlController } from "./accessControl.controller";
import { validateRequest } from "@/middleware/validation";
import { asyncHandler } from "@/middleware/asyncHandler";
import { AccessControlValidation } from "./accessControl.validation";

export class AccessControlRoutes {
  private router: Router;
  private controller: AccessControlController;

  constructor(controller: AccessControlController) {
    this.router = Router();
    this.controller = controller;
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.post(
      "/",
      validateRequest({ body: AccessControlValidation.body.addAccessControl }),
      asyncHandler((req: Request, res: Response) => this.controller.createAccessControl(req, res))
    );

    this.router.get(
      "/",
      validateRequest({ query: AccessControlValidation.query.list }),
      asyncHandler((req: Request, res: Response) => this.controller.getAccessControls(req, res))
    );

    this.router.get(
      "/:id",
      validateRequest({ params: AccessControlValidation.params.id }),
      asyncHandler((req: Request, res: Response) => this.controller.getAccessControlById(req, res))
    );

    this.router.patch(
      "/:id",
      validateRequest({
        params: AccessControlValidation.params.id,
        body: AccessControlValidation.body.updateAccessControl,
      }),
      asyncHandler((req: Request, res: Response) => this.controller.updateAccessControl(req, res))
    );

    this.router.delete(
      "/:id",
      validateRequest({ params: AccessControlValidation.params.id }),
      asyncHandler((req: Request, res: Response) => this.controller.deleteAccessControl(req, res))
    );
  }

  public getRouter(): Router {
    return this.router;
  }
}
