import { Twilio } from 'twilio';
import { AppLogger } from '@/core/logging/logger';
import { config } from '@/core/config';

export interface SMSConfig {
  accountSid?: string;
  authToken?: string;
  fromNumber?: string;
}

export interface SendSMSInput {
  to: string | string[];
  message: string;
  from?: string;
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  to: string;
  error?: string;
}

export class TwilioSMSService {
  private client: Twilio;
  private fromNumber?: string;
  private statusCallbackUrl: string;

  constructor(smsConfig?: SMSConfig) {
    const accountSid = smsConfig?.accountSid || config.twillo.accountSid;
    const authToken = smsConfig?.authToken || config.twillo.authToken;
    
    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials are required. Set TWILLO_ACCOUNT_SID and TWILLO_AUTH_TOKEN in environment');
    }

    this.client = new Twilio(accountSid, authToken);
    this.fromNumber = smsConfig?.fromNumber || config.twillo.fromNumber;
    this.statusCallbackUrl = config.twillo.statusCallbackUrl || '';

    if (!this.fromNumber) {
      AppLogger.warn('⚠️ TWILIO_FROM_NUMBER not set. You must provide "from" parameter when sending SMS');
    }

    if (!this.statusCallbackUrl) {
      AppLogger.warn('⚠️ TWILIO_STATUS_CALLBACK_URL not set. Status callbacks will not be enabled.');
    }
  }

  /**
   * Send SMS to single recipient
   */
  async sendSMS(data: SendSMSInput): Promise<SMSResult> {
    const recipient = Array.isArray(data.to) ? data.to[0] : data.to;
    const fromNumber = data.from || this.fromNumber;

    if (!fromNumber) {
      throw new Error('From number is required. Set TWILIO_FROM_NUMBER or provide "from" parameter');
    }

    try {
      const messageOptions: any = {
        body: data.message,
        from: fromNumber,
        to: recipient,
        statusCallback: process.env.TWILIO_STATUS_CALLBACK_URL, 
        statusCallbackMethod: 'POST',
      };

      if (this.statusCallbackUrl) {
        messageOptions.statusCallback = this.statusCallbackUrl;
      }

      const message = await this.client.messages.create(messageOptions);

      // const message = await this.client.messages.create({
      //   body: data.message,
      //   from: fromNumber,
      //   to: recipient,
      // });

      console.log('SMS sent successfully', {  
        to: this.maskPhone(recipient),
        messageId: message.sid,
        status: message.status,
      });

      AppLogger.info('SMS sent successfully', {
        to: this.maskPhone(recipient),
        messageId: message.sid,
        status: message.status,
      });

      return {
        success: true,
        messageId: message.sid,
        to: recipient,
      };
    } catch (error: any) {
      AppLogger.error('Failed to send SMS', {
        to: this.maskPhone(recipient),
        error: error.message,
        code: error.code,
      });

      return {
        success: false,
        to: recipient,
        error: error.message,
      };
    }
  }

  /**
   * Send bulk SMS to multiple recipients
   */
  async sendBulkSMS(recipients: string[], message: string, from?: string): Promise<SMSResult[]> {
    const results: SMSResult[] = [];

    for (const recipient of recipients) {
      const result = await this.sendSMS({
        to: recipient,
        message,
        from,
      });
      results.push(result);

      // Add delay to avoid rate limiting (adjust as needed)
      await this.delay(1000); // 1 second delay between messages
    }

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    AppLogger.info('Bulk SMS sending completed', {
      total: recipients.length,
      success: successCount,
      failed: failedCount,
    });

    return results;
  }

  /**
   * Send templated SMS (replace variables in template)
   */
  async sendTemplatedSMS(
    recipients: string | string[],
    template: string,
    variables: Record<string, any>,
    from?: string
  ): Promise<SMSResult[]> {
    // Replace template variables
    let message = template;
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      message = message.replace(regex, String(variables[key] || ''));
    });

    const recipientArray = Array.isArray(recipients) ? recipients : [recipients];
    return this.sendBulkSMS(recipientArray, message, from);
  }

  /**
   * Get message status
   */
  async getMessageStatus(messageSid: string) {
    try {
      const message = await this.client.messages(messageSid).fetch();
      
      return {
        sid: message.sid,
        status: message.status,
        to: message.to,
        from: message.from,
        dateSent: message.dateSent,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
      };
    } catch (error: any) {
      AppLogger.error('Failed to fetch message status', {
        messageSid,
        error: error.message,
      });
      throw error;
    }
  }

  // Helper methods
  private maskPhone(phone: string): string {
    if (phone.length < 4) return phone;
    return phone.slice(0, -4).replace(/./g, '*') + phone.slice(-4);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default TwilioSMSService;