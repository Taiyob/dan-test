import { Router, Request, Response } from "express";
import { validateRequest } from "@/middleware/validation";
import { asyncHandler } from "@/middleware/asyncHandler";
import { PlanValidation } from "./plan.validation";
import { PlanController } from "./plan.controller";

export class PlanRoutes {
  private router: Router;
  private controller: PlanController;

  constructor(controller: PlanController) {
    this.router = Router();
    this.controller = controller;
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
        this.router.post(
          "/",
          validateRequest({ body: PlanValidation.body.create }),
          asyncHandler((req: Request, res: Response) => this.controller.create(req, res))
        );

        this.router.patch(
          "/:id",
          validateRequest({ params: PlanValidation.params.id, body: PlanValidation.body.update }),
          asyncHandler((req: Request, res: Response) => this.controller.update(req, res))
        );

        this.router.patch(
        "/:id/status",
        validateRequest({
          params: PlanValidation.params.id,
          body: PlanValidation.body.changeStatus,
        }),
        asyncHandler((req: Request, res: Response) => this.controller.changeStatus(req, res))
      );

    this.router.get(
      "/",
      validateRequest({ query: PlanValidation.query.list }),
      asyncHandler((req: Request, res: Response) => this.controller.list(req, res))
    );

    this.router.get(
      "/:id",
      validateRequest({ params: PlanValidation.params.id }),
      asyncHandler((req: Request, res: Response) => this.controller.getById(req, res))
    );

    this.router.post(
      "/seed-default",
      validateRequest({ body: PlanValidation.body.seedDefaults }),
      asyncHandler((req: Request, res: Response) => this.controller.seedDefaults(req, res))
    );

    this.router.post(
      "/sync-stripe",
      asyncHandler((req: Request, res: Response) => this.controller.syncStripe(req, res))
    );
  }

  public getRouter(): Router {
    return this.router;
  }
}
