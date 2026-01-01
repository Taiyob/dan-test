import { Router, Request, Response } from "express";
import { validateRequest } from "@/middleware/validation";
import { asyncHandler } from "@/middleware/asyncHandler";
import { PaymentValidation } from "./payment.validation";
import { PaymentController } from "./payment.controller";
import { authenticate } from "@/middleware/auth";
import express from "express";

export class PaymentRoutes {
  private router: Router;
  private controller: PaymentController;

  constructor(controller: PaymentController) {
    this.router = Router();
    this.controller = controller;
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.post(
      "/checkout",
      authenticate,
      validateRequest({ body: PaymentValidation.body.checkout }),
      asyncHandler((req: Request, res: Response) => this.controller.createCheckout(req, res))
    );

    // this.router.post(
    //   "/stripe/webhook",
    //   asyncHandler((req: Request, res: Response) => this.controller.stripeWebhook(req, res))
    // );
    this.router.post(
      "/stripe/webhook",
      express.raw({ 
        type: 'application/json',
        limit: '5mb',
        verify: (req: any, res, buf) => {
          if (buf && buf.length) {
            req.rawBody = buf.toString('utf8');
          }
        }
      }),
      asyncHandler(
        (req: Request, res: Response) => 
          this.controller.stripeWebhook(req, res)
      )
    );
  }

  public getRouter(): Router { return this.router; }
}
