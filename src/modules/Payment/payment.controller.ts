import { BaseController } from "@/core/BaseController";
import { Request, Response } from "express";
import { PaymentService } from "./payment.service";
import { AppLogger } from "@/core/logging/logger";

export class PaymentController extends BaseController {
  constructor(private paymentService: PaymentService) { super(); }

  public createCheckout = async (req: Request, res: Response) => {
    const body = req.validatedBody || req.body;
    const userId = (req as any).userId || body.userId;
    const email = (req as any).user?.email || body.email;
    const session = await this.paymentService.createCheckoutSession({
      planId: body.planId,
      billing: body.billing,
      userId,
      email,
    });
    return this.sendCreatedResponse(res, { id: session.id, url: session.url }, "Checkout session created");
  };

  public stripeWebhook = async (req: Request, res: Response) => {
    try {
      const rawBody = req.body;
      
      const signature = req.headers['stripe-signature'] as string;
      
      AppLogger.info('Webhook received', {
        hasSignature: !!signature,
        bodyType: typeof rawBody,
        isBuffer: Buffer.isBuffer(rawBody),
        bodyLength: rawBody?.length || 0,
        bodyFirst100: rawBody?.toString()?.substring(0, 100) || 'empty'
      });
      
      if (!signature) {
        AppLogger.error('Missing stripe-signature header');
        return res.status(400).send('Missing stripe-signature header');
      }
      
      if (!rawBody || !Buffer.isBuffer(rawBody) || rawBody.length === 0) {
        AppLogger.error('Invalid or empty webhook payload', {
          rawBodyType: typeof rawBody,
          isBuffer: Buffer.isBuffer(rawBody),
          length: rawBody?.length
        });
        return res.status(400).send('Invalid or empty payload');
      }
      
      const event = await this.paymentService.constructWebhookEvent(
        rawBody, 
        signature
      );
      
      AppLogger.info(`Processing webhook event: ${event.type}`, {
        eventId: event.id,
        eventType: event.type
      });
      
      await this.paymentService.handleStripeEvent(event);
      
      return res.status(200).json({ received: true });
      
    } catch (error: any) {
      AppLogger.error('Webhook processing error', {
        error: error.message,
        stack: error.stack,
        signature: req.headers['stripe-signature']
      });
      
      return res.status(400).send(`Webhook Error: ${error.message}`);
    }
  };

  // public stripeWebhook = async (req: Request, res: Response) => {
  //   //AppLogger.debug("Checking the endpoint!!!")
  //   const signature = req.headers['stripe-signature'] as string | undefined;
  //   console.log("Signature from controller", signature);
  //   const rawBody: Buffer = (req as any).rawBody;
  //   console.log("Rawbody from controller:",rawBody)
  //   const event = this.paymentService.constructWebhookEvent(rawBody, signature);
  //   console.log("Event from controller", event)
  //   await this.paymentService.handleStripeEvent(event);
  //   return this.sendResponse(res, "Webhook processed", HTTPStatusCode.OK, { received: true });
  // };
}
