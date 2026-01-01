import { BaseService } from '@/core/BaseService';
import { AppLogger } from '@/core/logging/logger';
import { ConflictError, NotFoundError } from '@/core/errors/AppError';
import { EmailTemplate, PrismaClient } from '@prisma/client';
import axios from 'axios';
import {
  AddEmailTemplateInput,
  EmailTemplateListQuery,
  UpdateEmailTemplateInput,
} from './emailTemplate.validation';
//import { htmlEmaiTemplate } from '@/utils/htmlEmailTemplate';
import { config } from '@/core/config';
import { htmlEmailTemplate } from '@/utils/htmlEmailTemplate';

// ---------------------------------------------
// EmailTemplate Service
// ---------------------------------------------
export class EmailTemplateService extends BaseService<EmailTemplate> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'EmailTemplate', {
      enableSoftDelete: true,
      enableAuditFields: true,
    });
  }

  protected getModel() {
    return this.prisma.emailTemplate;
  }

  /**
   * Create a new EmailTemplate
   */

  async createTemplate(
  data: AddEmailTemplateInput,
  userId: string | undefined
): Promise<EmailTemplate> {
  try {
    // Check duplicate
    const existing = await this.findOne({ name: data.name });
    if (existing) throw new ConflictError('Email template with this name already exists');

    AppLogger.info(`Creating Email  Template: ${data.name}`);

    // Dynamic HTML with SAFE fallbacks (no ctaLink needed in input)
    const dynamicHtmlBody = htmlEmailTemplate
      .replace(/{{name}}/g, data.name || 'there')
      .replace(/{{subject}}/g, data.subject || 'Welcome to Our Platform')
      .replace(/{{cta_link}}/g, `${config.server.port}/dashboard`) 
      .replace(/{{website}}/g, config.server.port.toString())
      .replace(/{{year}}/g, new Date().getFullYear().toString())
      //.replace(/{{unsubscribe}}/g, `${config.app.url}/unsubscribe`)
      .replace(/{{company_name}}/g, "Dandubrubles Inc.");

    // Mailtrap payload
    const mailtrapCreateData = {
      email_template: {
        name: data.name,
        subject: data.subject,
        category: data.category || 'onboarding',
        body_html: dynamicHtmlBody,
        body_text: data.content || 'Thank you for joining us!',
      },
    };

    AppLogger.info('Mailtrap Create Data:', { mailtrapCreateData });

    // Create in Mailtrap
    const mailtrapResponse = await axios.post(
      `https://mailtrap.io/api/accounts/${config.mailTrap.accountId}/email_templates`,
      mailtrapCreateData,
      {
        headers: {
          'Api-Token': config.mailTrap.apiToken,
          'Content-Type': 'application/json',
        },
      }
    );

    AppLogger.info('Mailtrap template created', mailtrapResponse.data);

    // Save to local DB
    const template = await this.create({
      name: data.name,
      subject: data.subject,
      content: data.content,
      description: data.description,
      category: data.category || 'onboarding',
      htmlBody: dynamicHtmlBody,
      mailtrapId: mailtrapResponse.data.uuid,
      userId,
    });

    AppLogger.info(`Email Template created successfully (ID: ${template.id})`);
    return template;
  } catch (error: any) {
    AppLogger.error('Failed to create email template', {
      error: error.message,
      stack: error.stack,
      data,
    });
    throw error;
  }
}

  // async createTemplate(
  //   data: AddEmailTemplateInput,
  //   userId: string | undefined
  // ): Promise<EmailTemplate> {
  //   const existing = await this.findOne({ name: data.name });
  //   if (existing) throw new ConflictError('Email template with this name already exists');

  //   AppLogger.info(`Creating Email Template: ${data.name}`);
  //   const createData = {
  //     ...data,
  //     htmlBody: htmlEmaiTemplate,
  //     userId: userId,
  //   };
  //   const mailtrapCreateData = {
  //     email_template: {
  //       name: data.name,
  //       subject: data.subject,
  //       html_body: htmlEmaiTemplate,
  //       body_text: data.content,
  //     },
  //   };
  //   const createTemplateMailtrap = await axios.post(
  //     `https://stoplight.io/mocks/railsware/mailtrap-api-docs/754610772/api/accounts/${config.mailTrap.accountId}/email_templates`,
  //     mailtrapCreateData,
  //     {
  //       headers: {
  //         'Api-Token': config.mailTrap.apiToken,
  //         'Content-Type': 'application/json',
  //       },
  //     }
  //   );
  //   console.log({ createTemplateMailtrap });
  //   const template = await this.create(createData);
  //   AppLogger.info(`Email Template created (ID: ${template.id})`);

  //   return template;
  // }
  // async createTemplate(
  //   data: AddEmailTemplateInput,
  //   userId: string | undefined
  // ): Promise<EmailTemplate> {
  //   try {
  //     // Check duplicate
  //     const existing = await this.findOne({ name: data.name });
  //     if (existing) throw new ConflictError('Email template with this name already exists');

  //     AppLogger.info(`Creating Email Template: ${data.name}`);

  //     const htmlBody = htmlEmailTemplate;

  //     // Local DB data
  //     const createData = {
  //       ...data,
  //       htmlBody,
  //       userId,
  //     };

  //     // Mailtrap request body
  //     const mailtrapCreateData = {
  //       email_template: {
  //         name: data.name,
  //         subject: data.subject,
  //         category: data.category || 'General',
  //         body_html: htmlBody,
  //         body_text: data.content,
  //       },
  //     };
  //     console.log({ mailtrapCreateData });

  //     // Call Mailtrap API
  //     let createTemplateMailtrapData;
  //     try {
  //       const createTemplateMailtrap = await axios.post(
  //         `https://mailtrap.io/api/accounts/${config.mailTrap.accountId}/email_templates`,
  //         mailtrapCreateData,
  //         {
  //           headers: {
  //             'Api-Token': config.mailTrap.apiToken,
  //             'Content-Type': 'application/json',
  //           },
  //         }
  //       );

  //       AppLogger.info(`Mailtrap template created`);
  //       console.log('Mailtrap Response:', createTemplateMailtrap.data);

  //       createTemplateMailtrapData = createTemplateMailtrap.data;
  //     } catch (err: any) {
  //       console.error('Mailtrap Error:', err.response?.data || err.message);
  //       console.error('Mailtrap Error:', { err });
  //       // throw new AppError(
  //       //   `Mailtrap template creation failed: ${err.response?.data?.message || err.message}`,
  //       //   422
  //       // );
  //     }

  //     // Save in DB
  //     const template = await this.create({
  //       ...createData,
  //       mailtrapId: createTemplateMailtrapData.uuid,
  //     });

  //     AppLogger.info(`Email Template created (ID: ${template.id})`);

  //     return template;
  //   } catch (error) {
  //     AppLogger.error('Template Creation Error:', error);
  //     throw error;
  //   }
  // }

  /**
   * Get all EmailTemplates with optional filtering, search, and pagination
   */
  async getTemplates(query: EmailTemplateListQuery) {
    const { page, limit, search, sortBy = 'createdAt', sortOrder = 'desc', ...rest } = query;

    let filters: any = {};
    if (search) {
      filters.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }

    filters = this.mergeFilters(filters, this.applyFilters(rest));

    const result = await this.findMany(
      filters,
      { page, limit, offset: (page - 1) * limit },
      { [sortBy]: sortOrder },
      {}
    );

    AppLogger.info(`📧 Email templates found: ${result.data.length}`);
    return result;
  }

  // get templates by user
  async getTemplatesByUserId(query: EmailTemplateListQuery, userId: string | undefined) {
    const { page, limit, search, sortBy = 'createdAt', sortOrder = 'desc', ...rest } = query;

    let filters: any = {};
    if (search) {
      filters.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }

    filters.userId = userId;

    filters = this.mergeFilters(filters, this.applyFilters(rest));

    const result = await this.findMany(
      filters,
      { page, limit, offset: (page - 1) * limit },
      { [sortBy]: sortOrder },
      {}
    );

    AppLogger.info(`📧 Email templates found: ${result.data.length}`);
    return result;
  }
  /**
   * Get an EmailTemplate by ID
   */
  async getTemplateById(id: string): Promise<EmailTemplate> {
    const template = await this.findById(id);
    if (!template) throw new NotFoundError('Email Template');
    return template;
  }

  /**
   * Update an EmailTemplate by ID
   */
  async updateTemplate(id: string, data: UpdateEmailTemplateInput): Promise<EmailTemplate> {
    const exists = await this.exists({ id });
    if (!exists) throw new NotFoundError('Email Template');

    const updated = await this.updateById(id, data);
    AppLogger.info(`Email Template updated: ${updated.name}`);

    return updated;
  }

  /**
   * Soft Delete an EmailTemplate by ID
   */
  async deleteTemplate(id: string): Promise<EmailTemplate> {
    const exists = await this.exists({ id });
    if (!exists) throw new NotFoundError('Email Template');

    const deleted = await this.deleteById(id);
    AppLogger.info(`Email Template deleted: ${deleted.name}`);

    return deleted;
  }
}
