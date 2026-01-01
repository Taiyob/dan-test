import { Request, Response, Router } from "express";
import { CertificationTemplateController } from "./certificationTemplate.controller";
import { validateRequest } from "@/middleware/validation";
import { CertificationTemplateValidation } from "./certificatoinTemplate.validation";
import { asyncHandler } from "@/middleware/asyncHandler";

export class CertificationTemplateRoutes {
  private router: Router;
  private certificationTemplateController: CertificationTemplateController;

  constructor(certificationTemplateController: CertificationTemplateController) {
    this.router = Router();
    this.certificationTemplateController = certificationTemplateController;
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    //create new template
    this.router.post(
      "/",
      validateRequest({
        body: CertificationTemplateValidation.body.addTemplate,
      }),
      asyncHandler((req: Request, res: Response) =>
        this.certificationTemplateController.createTemplate(req, res)
      )
    );

    //get all templates
    this.router.get(
      "/",
      validateRequest({
        query: CertificationTemplateValidation.query.list,
      }),
      asyncHandler((req: Request, res: Response) =>
        this.certificationTemplateController.getAllTemplates(req, res)
      )
    );

    //get template by id
    this.router.get(
      "/:id",
      validateRequest({
        params: CertificationTemplateValidation.params.id,
      }),
      asyncHandler((req: Request, res: Response) =>
        this.certificationTemplateController.getTemplateById(req, res)
      )
    );

    //update template by id
    this.router.patch(
      "/:id",
      validateRequest({
        params: CertificationTemplateValidation.params.id,
        body: CertificationTemplateValidation.body.updateTemplate,
      }),
      asyncHandler((req: Request, res: Response) =>
        this.certificationTemplateController.updateTemplateById(req, res)
      )
    );

    //delete template by id
    this.router.delete(
      "/:id",
      validateRequest({
        params: CertificationTemplateValidation.params.id,
      }),
      asyncHandler((req: Request, res: Response) =>
        this.certificationTemplateController.deleteTemplate(req, res)
      )
    );
  }

  public getRouter(): Router {
    return this.router;
  }
}