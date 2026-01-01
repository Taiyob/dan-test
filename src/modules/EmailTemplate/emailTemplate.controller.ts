import { BaseController } from '@/core/BaseController';
import { Request, Response } from 'express';
import { EmailTemplateService } from './emailTemplate.service';
import { HTTPStatusCode } from '@/types/HTTPStatusCode';
import { MailtrapEmailService } from '@/services/MailtrapEmailService';
import { SESEmailService } from '@/services/SESEmailService';
import { config } from '@/core/config';

// ---------------------------------------------
// ✅ EmailTemplate Controller
// ---------------------------------------------
export class EmailTemplateController extends BaseController {
  constructor(private service: EmailTemplateService) {
    super();
  }

  /**
   * Create a new EmailTemplate
   * POST /api/email-templates
   */
  public createTemplate = async (req: Request, res: Response) => {
    const body = req.validatedBody || req.body;
    // this.logAction('createTemplate', );
    console.log(req, { body, user: req?.userId });

    const result = await this.service.createTemplate(body, req?.userId);
    return this.sendCreatedResponse(res, result, 'Email Template created successfully');
  };

  public sendBulkEmails = async (req: Request, res: Response) => {
    const { id } = req.validatedParams || req.params;
    const body = req.validatedBody || req.body;

    const template = await this.service.getTemplateById(id);

    const mailtrap = new MailtrapEmailService({
      token: config.mailTrap.apiToken as string,
      defaultFromEmail: config.email.defaultFromEmail,
      defaultReplyToEmail: config.email.defaultReplyToEmail,
    });

    const commonData = {
      fromName: config.email.defaultFromName,
      from: config.email.defaultFromEmail,
      cc: body.cc,
      bcc: body.bcc,
      replyTo: body.replyTo,
      templateData: body.templateData,
    };

    let results = [] as any[];
    if (template.mailtrapId) {
      results = await mailtrap.sendBulkEmails(template.mailtrapId, commonData, body.recipients);
    }

    const unauthorizedRecipients = results
      .filter(r => !r.success && typeof r.error === 'string' && r.error.toLowerCase().includes('unauthorized'))
      .map(r => r.to);

    if (!template.mailtrapId || unauthorizedRecipients.length > 0) {
      const compiled = Object.keys(body.templateData || {}).reduce((acc: string, key: string) => {
        return acc.replace(new RegExp(`{{${key}}}`, 'g'), String((body.templateData as any)[key] ?? ''));
      }, template.content || '');

      const targetRecipients = template.mailtrapId ? unauthorizedRecipients : body.recipients;

      const ses = new SESEmailService({
        region: config.email.awsRegion,
        awsAccessKeyId: config.email.awsAccessKeyId,
        awsSecretAccessKey: config.email.awsSecretAccessKey,
        defaultFromEmail: config.email.defaultFromEmail,
        defaultReplyToEmail: config.email.defaultReplyToEmail,
      });

      const sesResults = await ses.sendBulkEmails(targetRecipients, {
        from: config.email.defaultFromEmail,
        fromName: config.email.defaultFromName,
        subject: template.subject,
        html: compiled,
        text: compiled.replace(/<[^>]*>/g, '').trim(),
        cc: body.cc,
        bcc: body.bcc,
        replyTo: body.replyTo,
      });

      results = template.mailtrapId
        ? results.filter(r => !unauthorizedRecipients.includes(r.to)).concat(sesResults)
        : sesResults;
    }

    return this.sendResponse(res, 'Emails processed', HTTPStatusCode.OK, {
      total: results.length,
      success: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    });
  };

  /**
   * Get all EmailTemplates with filtering, sorting, and pagination
   * GET /api/email-templates
   */
  public getTemplates = async (req: Request, res: Response) => {
    const query = req.validatedQuery || req.query;
    const result = await this.service.getTemplates(query);

    this.logAction('getTemplates', req, { count: result.data.length });

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
      'Email Templates retrieved successfully',
      result.data
    );
  };

  // Get templates by user
  public getTemplatesByUser = async (req: Request, res: Response) => {
    const query = req.validatedQuery || req.query;
    const result = await this.service.getTemplatesByUserId(query, req?.userId);

    this.logAction('getTemplates', req, { count: result.data.length });

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
      'Email Templates retrieved successfully',
      result.data
    );
  };

  /**
   * Get an EmailTemplate by ID
   * GET /api/email-templates/:id
   */
  public getTemplateById = async (req: Request, res: Response) => {
    const { id } = req.validatedParams || req.params;
    this.logAction('getTemplateById', req, { id });

    const result = await this.service.getTemplateById(id);
    return this.sendResponse(
      res,
      'Email Template retrieved successfully',
      HTTPStatusCode.OK,
      result
    );
  };

  /**
   * Update an EmailTemplate by ID
   * PATCH /api/email-templates/:id
   */
  public updateTemplate = async (req: Request, res: Response) => {
    const { id } = req.validatedParams || req.params;
    const body = req.validatedBody || req.body;
    this.logAction('updateTemplate', req, { id, body });

    const result = await this.service.updateTemplate(id, body);
    return this.sendResponse(res, 'Email Template updated successfully', HTTPStatusCode.OK, result);
  };

  /**
   * Delete an EmailTemplate by ID
   * DELETE /api/email-templates/:id
   */
  public deleteTemplate = async (req: Request, res: Response) => {
    const { id } = req.validatedParams || req.params;
    this.logAction('deleteTemplate', req, { id });

    const result = await this.service.deleteTemplate(id);
    return this.sendResponse(res, 'Email Template deleted successfully', HTTPStatusCode.OK, result);
  };
}
