import { AppLogger } from "@/core/logging/logger";
import { promises as fs } from "fs";
import type { Address, Attachment, Mail, SendResponse } from "mailtrap";
import { MailtrapClient } from "mailtrap";
import axios from "axios";

/**
 * Configuration for the MailtrapEmailService.
 * Requires an API token instead of SMTP details.
 */
export interface MailtrapConfig {
  token: string;
  defaultFromEmail?: string;
  defaultReplyToEmail?: string;
  maxRetries?: number;
  retryDelay?: number;
  accountId?: string;
}

/**
 * Data for sending an email using a Mailtrap template.
 */
export interface TemplatedEmailData {
  fromName?: string;
  to: string | string[];
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string | string[];
  templateData?: Record<string, any>;
  attachments?: EmailAttachment[];
}

/**
 * Attachment structure. The 'path' will be read by the service
 * and converted to base64 content for the API.
 */
export interface EmailAttachment {
  filename: string;
  path: string; // File path (service will read this) or data URI
  contentType?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  to: string | string[];
  error?: string;
}

export interface BulkEmailResult extends EmailResult {
  to: string;
}

// --- Mailtrap Email Service ---

export class MailtrapEmailService {
  private client: MailtrapClient;
  private defaultFrom: string;
  private defaultReplyTo?: string;
  private maxRetries: number;
  private retryDelay: number;
  private defaultFromName: string;

  constructor(config: MailtrapConfig) {
    if (!config.token) {
      throw new Error("Mailtrap token is required.");
    }

    // Configure Mailtrap client
    this.client = new MailtrapClient({ token: config.token  });

    // Default configuration
    this.defaultFromName = process.env.DEFAULT_FROM_NAME || "";
    this.defaultFrom =
      config.defaultFromEmail || process.env.DEFAULT_FROM_EMAIL || "";
    this.defaultReplyTo =
      config.defaultReplyToEmail || process.env.DEFAULT_REPLY_TO_EMAIL;
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 1000; // 1 second

    if (!this.defaultFrom) {
      throw new Error(
        "Default from email is required. Set it in config or environment variable DEFAULT_FROM_EMAIL"
      );
    }
  }

  /**
   * Sends a non-templated email.
   */
  public async sendEmail(options: {
    to: string[];
    subject: string;
    html: string;
    text: string;
  }) {
    const { to, subject, html, text } = options;

    // This is an EXAMPLE using the 'mailtrap' package structure
    // Adapt this to your actual client/method
    try {
      const response = await this.client.send({
        from: {
          email: this.defaultFrom,
          name: "TheSunFix", // Or your default from name
        },
        to: to.map((email) => ({ email })), // Format recipients
        reply_to: { email: this.defaultReplyTo || this.defaultFrom },
        subject,
        html: html || text,
        text,
        category: "Custom Message", // Optional: for tracking
      });

      return response;
    } catch (error) {
      AppLogger.error("Mailtrap non-templated send error", error);
      throw new Error("Failed to send non-templated email");
    }
  }

  public async sendBulkPlainText(params: {
    recipients: string[];
    subject: string;
    text: string;
    html?: string;
  }): Promise<{ success: number; failed: number; total: number }> {
    const { recipients, subject, text, html } = params;

    const results: BulkEmailResult[] = [];
    const batchSize = 50;

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      const batchPromises = batch.map(async (to) => {
        try {
          await this.sendEmail({
            to: [to],
            subject,
            text,
            html: html || text,
          });
          return { success: true, to };
        } catch (error: any) {
          return { success: false, error: error.message, to };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      batchResults.forEach((result, idx) => {
        if (result.status === "fulfilled") {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            error: result.reason?.message || "Rejected",
            to: batch[idx],
          });
        }
      });
    }

    const success = results.filter((r) => r.success).length;
    const failed = results.length - success;

    AppLogger.info("Bulk plain text emails sent", {
      total: recipients.length,
      success,
      failed,
    });

    return { success, failed, total: recipients.length };
  }

    /**
   * NEW METHOD: sendBulkFromTemplate
   * এটা তোর Inspection Reminder এর জন্য দরকার
   * একই টেমপ্লেট + একই ডাটা দিয়ে অনেকজনকে আলাদা আলাদা ইমেইল পাঠাবে
   */
  async sendBulkFromTemplate(params: {
    templateId: string;
    recipients: string[];
    templateData: Record<string, any>;
  }): Promise<{ success: number; failed: number; total: number }> {
    const { templateId, recipients, templateData } = params;

    const results = await this.sendBulkEmails(
      templateId,
      {
        fromName: process.env.MAIL_FROM_NAME || "OnSchedule",
        from: process.env.MAIL_FROM_EMAIL || "no-reply@onschedule.ca",
        replyTo: process.env.MAIL_REPLY_TO || "support@onschedule.ca",
        templateData: templateData,
      },
      recipients
    );

    const success = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    AppLogger.info("Bulk templated emails processed", {
      total: recipients.length,
      success,
      failed,
      templateId,
    });

    return { success, failed, total: recipients.length };
  }

  /**
   * Send bulk templated emails to multiple recipients.
   * Each recipient receives a separate email with the same template and data.
   */
  async sendBulkEmails(
    templateUuid: string,
    commonData: Omit<TemplatedEmailData, "to">,
    recipients: string[]
  ): Promise<BulkEmailResult[]> {
    const results: BulkEmailResult[] = [];
    const batchSize = 50; // Keep batching logic

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      const batchPromises = batch.map(
        async (recipient: string): Promise<BulkEmailResult> => {
          try {
            const emailData: TemplatedEmailData = {
              ...commonData,
              to: recipient,
            };
            // Use sendTemplatedEmail as the core sending method
            const result = await this.sendTemplatedEmail(
              templateUuid,
              emailData
            );
            return {
              ...result,
              to: recipient, // Ensure 'to' is the single recipient string
            };
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error";
            return {
              success: false,
              error: errorMessage,
              to: recipient,
            };
          }
        }
      );

      const batchResults = await Promise.allSettled(batchPromises);
      const processedResults = batchResults.map((result, index) => {
        if (result.status === "fulfilled") {
          return result.value;
        } else {
          return {
            success: false,
            error: result.reason?.message || "Promise rejected",
            to: batch[index],
          };
        }
      });

      results.push(...processedResults);
    }

    return results;
  }

  /**
   * Send templated email using Mailtrap template_uuid
   */
  async sendTemplatedEmail(
    templateUuid: string,
    emailData: TemplatedEmailData
  ): Promise<EmailResult> {
    try {
      // This function now correctly returns Promise<Mail>
      const mailOptions = await this.buildTemplatedSendRequest(
        templateUuid,
        emailData
      );

      // This function now correctly accepts 'Mail' as its parameter
      const result = await this.sendWithRetry(mailOptions);

      const messageId = result.message_ids?.[0] || "unknown";
      AppLogger.info(
        `Templated email sent successfully via Mailtrap. MessageId: ${messageId} To: ${emailData.to}`
      );
      return {
        success: true,
        messageId: messageId,
        to: emailData.to,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Error sending templated email:", error);
      throw new Error(`Failed to send templated email: ${errorMessage}`);
    }
  }

  // --- Private Helper Methods ---

  /**
   * Builds the Mail object for a templated email.
   */
  private async buildTemplatedSendRequest(
    templateUuid: string,
    emailData: TemplatedEmailData
  ): Promise<Mail> {
    // <-- FIX: Return type is Mail
    const fromAddress = emailData.from || this.defaultFrom;
    const displayName = emailData.fromName || this.defaultFromName;

    // Use the 'Mail' type. This object shape fits the
    // 'CommonMail & MailFromTemplateContent' part of the Mail union type.
    const request: Mail = {
      // <-- FIX: Variable type is Mail
      from: { email: fromAddress, name: displayName },
      to: this.formatRecipients(emailData.to),
      cc: this.formatRecipients(emailData.cc),
      bcc: this.formatRecipients(emailData.bcc),
      reply_to: this.formatReplyTo(emailData.replyTo),
      template_uuid: templateUuid,
      template_variables: emailData.templateData || {},
    };

    if (emailData.attachments) {
      request.attachments = await this.buildAttachments(emailData.attachments);
    }

    return request;
  }

  /**
   * Reads attachment files and converts them to the Mailtrap.Attachment format.
   */
  private async buildAttachments(
    attachments: EmailAttachment[]
  ): Promise<Attachment[]> {
    return Promise.all(
      attachments.map(async (att): Promise<Attachment> => {
        let content: Buffer;

        if (att.path.startsWith("data:")) {
          // Handle data URI
          const parts = att.path.split(";base64,");
          content = Buffer.from(parts[1], "base64");
        } else {
          // Assume it's a file path
          content = await fs.readFile(att.path);
        }

        return {
          content: content.toString("base64"),
          filename: att.filename,
          type: att.contentType,
          disposition: "attachment",
        };
      })
    );
  }

  /**
   * Formats recipient strings into Mailtrap's required format.
   */
  private formatRecipients(
    recipients: string | string[] | undefined
  ): Address[] {
    // <-- FIX: Return type is Address[] (which is compatible with { email: string }[])
    if (!recipients) {
      return []; // <-- FIX: Return empty array instead of undefined
    }
    const recipientArray = Array.isArray(recipients)
      ? recipients
      : [recipients];
    return recipientArray.map((email) => ({ email }));
  }

  /**
   * Formats the replyTo field. Mailtrap API expects a single address.
   */
  private formatReplyTo(
    replyTo: string | string[] | undefined
  ): { email: string; name?: string } | undefined {
    let email = replyTo || this.defaultReplyTo;
    if (!email) {
      return undefined;
    }
    // Mailtrap API supports a single reply_to, so we take the first.
    if (Array.isArray(email)) {
      email = email[0];
    }
    return { email };
  }

  /**
   * Wrapper for client.send with retry logic.
   */
  private async sendWithRetry(mailOptions: Mail): Promise<SendResponse> {
    // <-- FIX: Parameter type is Mail
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        // Core sending logic using Mailtrap client
        // client.send returns the response object on success, or throws an error
        const result = await this.client.send(mailOptions);

        // Check for success: false on the response body
        if (!result?.success) {
          // Get error messages from Mailtrap response if available
          const errorMessages = (result as any)?.errors?.join(", ");
          throw new Error(errorMessages || "Mailtrap API reported failure");
        }

        return result as SendResponse; // We've confirmed success
      } catch (error) {
        lastError =
          error instanceof Error
            ? error
            : new Error("Unknown error in transport");
        AppLogger.warn(
          `Email sending attempt ${attempt} failed: ${lastError.message}`
        );

        if (attempt === this.maxRetries) {
          break; // Exit loop if it's the last attempt
        }

        // Wait before retrying with exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, this.retryDelay * attempt)
        );
      }
    }

    throw lastError;
  }
}

export default MailtrapEmailService;
