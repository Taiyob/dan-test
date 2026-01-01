import { Request, Response, Router } from "express";
import { validateRequest } from "@/middleware/validation";
import { asyncHandler } from "@/middleware/asyncHandler";
import { SMSTemplateController } from "./smsTemplate.controller";
import { SMSTemplateValidation } from "./smsTemplate.validation";
import { authenticate } from "@/middleware/auth";

export class SMSTemplateRoutes {
  private router: Router;
  private smsTemplateController: SMSTemplateController;

  constructor(smsTemplateController: SMSTemplateController) {
    this.router = Router();
    this.smsTemplateController = smsTemplateController;
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Create new template
    this.router.post(
      "/",
      authenticate,
      validateRequest({
        body: SMSTemplateValidation.body.addTemplate,
      }),
      asyncHandler((req: Request, res: Response) =>
        this.smsTemplateController.createTemplate(req, res)
      )
    );

    // Get all templates
    this.router.get(
      "/",
      validateRequest({
        query: SMSTemplateValidation.query.list,
      }),
      asyncHandler((req: Request, res: Response) =>
        this.smsTemplateController.getAllTemplates(req, res)
      )
    );

    // Get templates by user ID
    this.router.get(
      "/my-templates",
      authenticate,
      validateRequest({
        query: SMSTemplateValidation.query.list, 
      }),
      asyncHandler((req: Request, res: Response) =>
        this.smsTemplateController.getTemplatesByUser(req, res)
      )
    );


    // Get by ID
    this.router.get(
      "/:id",
      validateRequest({
        params: SMSTemplateValidation.params.id,
      }),
      asyncHandler((req: Request, res: Response) =>
        this.smsTemplateController.getTemplateById(req, res)
      )
    );

    // Update by ID
    this.router.patch(
      "/:id",
      validateRequest({
        params: SMSTemplateValidation.params.id,
        body: SMSTemplateValidation.body.updateTemplate,
      }),
      asyncHandler((req: Request, res: Response) =>
        this.smsTemplateController.updateTemplateById(req, res)
      )
    );

    // Delete by ID
    this.router.delete(
      "/:id",
      validateRequest({
        params: SMSTemplateValidation.params.id,
      }),
      asyncHandler((req: Request, res: Response) =>
        this.smsTemplateController.deleteTemplate(req, res)
      )
    );
  }

  public getRouter(): Router {
    return this.router;
  }
}
