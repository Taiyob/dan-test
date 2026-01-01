import { Router, Request, Response } from 'express';
import { validateRequest } from '@/middleware/validation';
import { asyncHandler } from '@/middleware/asyncHandler';
import { EmailTemplateValidation } from './emailTemplate.validation';
import { EmailTemplateController } from './emailTemplate.controller';
import { authenticate } from '@/middleware/auth';

// ---------------------------------------------
// ✅ EmailTemplate Routes
// ---------------------------------------------
export class EmailTemplateRoutes {
  private router: Router;
  private controller: EmailTemplateController;

  constructor(controller: EmailTemplateController) {
    this.router = Router();
    this.controller = controller;
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Create new template
    this.router.post(
      '/',
      authenticate,
      validateRequest({ body: EmailTemplateValidation.body.addTemplate }),
      asyncHandler((req: Request, res: Response) => this.controller.createTemplate(req, res))
    );

    // Get all templates
    this.router.get(
      '/',
      validateRequest({ query: EmailTemplateValidation.query.list }),
      asyncHandler((req: Request, res: Response) => this.controller.getTemplates(req, res))
    );
    // Get all templates by user
    this.router.get(
      '/my-templates',
      authenticate,
      validateRequest({ query: EmailTemplateValidation.query.list }),
      asyncHandler((req: Request, res: Response) => this.controller.getTemplatesByUser(req, res))
    );

    // Get template by ID
    this.router.get(
      '/:id',
      validateRequest({ params: EmailTemplateValidation.params.id }),
      asyncHandler((req: Request, res: Response) => this.controller.getTemplateById(req, res))
    );

    // Update template by ID
    this.router.patch(
      '/:id',
      validateRequest({
        params: EmailTemplateValidation.params.id,
        body: EmailTemplateValidation.body.updateTemplate,
      }),
      asyncHandler((req: Request, res: Response) => this.controller.updateTemplate(req, res))
    );

    this.router.post(
      '/:id/send-bulk',
      authenticate,
      validateRequest({
        params: EmailTemplateValidation.params.id,
        body: EmailTemplateValidation.body.sendBulk,
      }),
      asyncHandler((req: Request, res: Response) => this.controller.sendBulkEmails(req, res))
    );

    // Delete template by ID
    this.router.delete(
      '/:id',
      validateRequest({ params: EmailTemplateValidation.params.id }),
      asyncHandler((req: Request, res: Response) => this.controller.deleteTemplate(req, res))
    );
  }

  public getRouter(): Router {
    return this.router;
  }
}
