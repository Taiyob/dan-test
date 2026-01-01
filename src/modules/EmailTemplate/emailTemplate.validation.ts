import { z } from 'zod';
import { stringToNumber } from '@/utils/stringToNumber';

// ---------------------------------------------
// ✅ EmailTemplate Validation Schema
// ---------------------------------------------
export const EmailTemplateValidation = {
  //
  // ✅ Params Validation
  //
  params: {
    id: z.object({
      id: z.string().uuid('Invalid email template ID'),
    }),
  },

  //
  // ✅ Query Validation (list, search, filters, etc.)
  //
  query: {
    list: z
      .object({
        page: z.preprocess(val => stringToNumber(val) || 1, z.number().int().min(1).default(1)),
        limit: z.preprocess(val => {
          const num = stringToNumber(val) || 10;
          return Math.min(Math.max(num, 1), 100);
        }, z.number().int().min(1).max(100).default(10)),
        search: z.string().optional(),
        sortBy: z.enum(['id', 'name', 'category', 'createdAt', 'updatedAt']).default('createdAt'),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
      })
      .transform(data => ({
        ...data,
        search: data.search && data.search.trim() !== '' ? data.search : undefined,
      })),
  },

  //
  // ✅ Body Validation (add / update)
  //
  body: {
    addTemplate: z.object({
      name: z.string().min(2).max(100),
      subject: z.string().min(2).max(255),
      content: z.string().min(10, 'HTML content is required'),
      description: z.string().optional(),
      category: z.string().optional(),
    }),
    sendBulk: z
      .object({
        recipients: z.array(z.string().email()).min(1),
        templateData: z.record(z.string(), z.any()).optional(),
        cc: z.array(z.string().email()).optional(),
        bcc: z.array(z.string().email()).optional(),
        replyTo: z.union([z.string().email(), z.array(z.string().email())]).optional(),
      }),
    // .strict()
    updateTemplate: z
      .object({
        name: z.string().min(2).max(100).optional(),
        subject: z.string().min(2).max(255).optional(),
        content: z.string().min(10).optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        isActive: z.boolean().optional(),
      })
      .strict()
      .refine(data => Object.keys(data).length > 0, {
        message: 'At least one field must be provided for update',
      }),
  },
};

// ---------------------------------------------
// ✅ Type Exports for TS Integration
// ---------------------------------------------
export type EmailTemplateIdParams = z.infer<typeof EmailTemplateValidation.params.id>;
export type EmailTemplateListQuery = z.infer<typeof EmailTemplateValidation.query.list>;
export type AddEmailTemplateInput = z.infer<typeof EmailTemplateValidation.body.addTemplate>;
export type SendBulkEmailInput = z.infer<typeof EmailTemplateValidation.body.sendBulk>;
export type UpdateEmailTemplateInput = z.infer<typeof EmailTemplateValidation.body.updateTemplate>;
