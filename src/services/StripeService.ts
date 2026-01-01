import Stripe from "stripe";
import { config } from "@/core/config";
import { AppLogger } from "@/core/logging/logger";

export class StripeService {
  private stripe: Stripe;

  constructor() {
    if (!config.stripe.secretKey) throw new Error("STRIPE_SECRET_KEY is missing");
    this.stripe = new Stripe(config.stripe.secretKey!, {
      apiVersion: "2025-11-17.clover", 
    });
  }

  async ensureProductAndPrices(plan: { key: string; name: string; description?: string }, pricing: { monthly: number; annualAmount: number }) {
    const productName = `Plan:${plan.name}`;
    let productId: string | undefined;

    const products = await this.stripe.products.list({ limit: 100, active: true });
    const found = products.data.find(p => p.name === productName);
    if (found) productId = found.id;
    if (!productId) {
      const created = await this.stripe.products.create({ name: productName, description: plan.description || plan.name, metadata: { key: plan.key } });
      productId = created.id;
    }

    const prices = await this.stripe.prices.list({ product: productId, limit: 100, active: true });
    const annualUnitAmount = Math.round(pricing.annualAmount * 100);
    const monthlyUnitAmount = Math.round(pricing.monthly * 100);
    let annualPrice = prices.data.find(pr => pr.recurring?.interval === "year" && pr.unit_amount === annualUnitAmount);
    if (!annualPrice) {
      annualPrice = await this.stripe.prices.create({ product: productId, currency: "usd", unit_amount: annualUnitAmount, recurring: { interval: "year" } });
    }
    let monthlyPrice = prices.data.find(pr => pr.recurring?.interval === "month" && pr.unit_amount === monthlyUnitAmount);
    if (!monthlyPrice) {
      monthlyPrice = await this.stripe.prices.create({ product: productId, currency: "usd", unit_amount: monthlyUnitAmount, recurring: { interval: "month" } });
    }

    return { productId, priceIdAnnual: annualPrice.id, priceIdMonthly: monthlyPrice.id };
  }

  // async createCheckoutSession(params: { priceId: string; lineItems?: Array<{ price: string; quantity?: number }>; customerEmail?: string; successUrl?: string; cancelUrl?: string; metadata?: Record<string,string>; userId?: string }) {
  //   const successUrl = params.successUrl || config.stripe.successUrl || "http://localhost:5173/payment/success";
  //   const cancelUrl = params.cancelUrl || config.stripe.cancelUrl || "http://localhost:5173/payment/cancel";
  //   let customerId: string | undefined;
  //   if (params.customerEmail) {
  //     // Check if customer already exists
  //     const existingCustomers = await this.stripe.customers.list({
  //       email: params.customerEmail,
  //       limit: 1
  //     });
      
  //     if (existingCustomers.data.length > 0) {
  //       customerId = existingCustomers.data[0].id;
  //       AppLogger.info('Using existing Stripe customer', { customerId, email: params.customerEmail });
  //     } else {
  //       // Create new customer
  //       const customer = await this.stripe.customers.create({
  //         email: params.customerEmail,
  //         metadata: {
  //           userId: params.userId || 'unknown'
  //         }
  //       });
  //       customerId = customer.id;
  //       AppLogger.info('Created new Stripe customer', { customerId, email: params.customerEmail });
  //     }
  //   }

  //   const lineItems = params.lineItems || 
  //     (params.priceId ? [{ price: params.priceId, quantity: 1 }] : []);

  //   if (lineItems.length === 0) {
  //     throw new Error("No line items provided for checkout session");
  //   }

  //   // const session = await this.stripe.checkout.sessions.create({
  //   //   mode: "subscription",
  //   //   success_url: successUrl + "?session_id={CHECKOUT_SESSION_ID}",
  //   //   cancel_url: cancelUrl,
  //   //   line_items: [{ price: params.priceId, quantity: 1 }],
  //   //   customer_email: params.customerEmail,
  //   //   metadata: params.metadata,
  //   //   customer: customerId,
  //   // });
    
  //   const sessionConfig: any = {
  //   mode: "subscription",
  //   success_url: successUrl + "?session_id={CHECKOUT_SESSION_ID}",
  //   cancel_url: cancelUrl,
  //   line_items: lineItems,
  //   metadata: params.metadata || {},
  // };

  //   // IMPORTANT: Use customer if exists, otherwise use customer_email
  //   if (customerId) {
  //     sessionConfig.customer = customerId;
  //   } else if (params.customerEmail) {
  //     sessionConfig.customer_email = params.customerEmail;
  //   }

  //   const session = await this.stripe.checkout.sessions.create(sessionConfig);
    
  //   return session;
  // }

  async createCheckoutSession(params: { 
    lineItems?: Array<{ price: string; quantity?: number }>;
    priceId?: string;                   
    customerEmail?: string; 
    successUrl?: string; 
    cancelUrl?: string; 
    metadata?: Record<string, string>; 
    userId?: string;
  }) {
    const successUrl = params.successUrl || config.stripe.successUrl || "http://localhost:5173/payment/success";
    const cancelUrl = params.cancelUrl || config.stripe.cancelUrl || "http://localhost:5173/payment/cancel";

    let customerId: string | undefined;
    if (params.customerEmail) {
      const existing = await this.stripe.customers.list({
        email: params.customerEmail,
        limit: 1
      });

      if (existing.data.length > 0) {
        customerId = existing.data[0].id;
      } else {
        const customer = await this.stripe.customers.create({
          email: params.customerEmail,
          metadata: { userId: params.userId || 'unknown' }
        });
        customerId = customer.id;
      }
    }

    const finalLineItems = params.lineItems || 
      (params.priceId ? [{ price: params.priceId, quantity: 1 }] : []);

    if (finalLineItems.length === 0) {
      throw new Error("At least one line item or priceId must be provided");
    }

    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      success_url: successUrl + "?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: cancelUrl,
      line_items: finalLineItems.map(item => ({
        price: item.price,
        quantity: item.quantity ?? 1
      })),
      metadata: params.metadata || {},
    };

    if (customerId) {
      sessionConfig.customer = customerId;
    } else if (params.customerEmail) {
      sessionConfig.customer_email = params.customerEmail;
    }

    const session = await this.stripe.checkout.sessions.create(sessionConfig);
    return session;
  }

  async ensureOnboardingPrice(
    productId: string,
    amount: number
  ): Promise<string> {
    const prices = await this.stripe.prices.list({
      product: productId,
      active: true,
      limit: 100,
    });

    const unitAmount = Math.round(amount * 100);

    const existing = prices.data.find(
      p => !p.recurring && p.unit_amount === unitAmount
    );

    if (existing) return existing.id;

    const created = await this.stripe.prices.create({
      product: productId,
      currency: "usd",
      unit_amount: unitAmount,
    });

    return created.id;
  }

  async updateSubscription(
    subscriptionId: string,
    newPriceId: string,
    isUpgrade: boolean
  ): Promise<Stripe.Subscription> {
    try {
      // Get current subscription
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      
      if (!subscription || subscription.status === "canceled") {
        throw new Error("Subscription not found or already canceled");
      }

      // Update subscription with new price
      const updated = await this.stripe.subscriptions.update(subscriptionId, {
        items: [{
          id: subscription.items.data[0].id,
          price: newPriceId,
        }],
        // Proration behavior
        proration_behavior: isUpgrade ? "always_invoice" : "none",
        // For downgrade, apply at period end
        ...(isUpgrade ? {} : { proration_behavior: "none" }),
      });

      AppLogger.info("Stripe subscription updated", {
        subscriptionId,
        newPriceId,
        isUpgrade,
      });

      return updated;
    } catch (error: any) {
      AppLogger.error("Failed to update Stripe subscription", {
        error: error.message,
        subscriptionId,
      });
      throw error;
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      const canceled = await this.stripe.subscriptions.cancel(subscriptionId);
      
      AppLogger.info("Stripe subscription canceled", {
        subscriptionId,
      });

      return canceled;
    } catch (error: any) {
      AppLogger.error("Failed to cancel Stripe subscription", {
        error: error.message,
        subscriptionId,
      });
      throw error;
    }
  }

  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      return await this.stripe.subscriptions.retrieve(subscriptionId);
    } catch (error: any) {
      AppLogger.error("Failed to retrieve subscription", {
        error: error.message,
        subscriptionId,
      });
      throw error;
    }
  }

  async createPortalSession(customerId: string, returnUrl: string): Promise<Stripe.BillingPortal.Session> {
    try {
      const session = await this.stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });

      AppLogger.info("Billing portal session created", { customerId });
      return session;
    } catch (error: any) {
      AppLogger.error("Failed to create portal session", {
        error: error.message,
        customerId,
      });
      throw error;
    }
  }

  async getCustomerSubscriptions(customerId: string): Promise<Stripe.Subscription[]> {
    try {
      const subscriptions = await this.stripe.subscriptions.list({
        customer: customerId,
        status: 'all',
        limit: 10
      });

      return subscriptions.data;
    } catch (error: any) {
      AppLogger.error("Failed to get customer subscriptions", {
        error: error.message,
        customerId,
      });
      throw error;
    }
  }

  // StripeService.ts

  async getCustomerDefaultPaymentMethod(customerId: string): Promise<{
    brand?: string;
    last4?: string;
    expMonth?: number;
    expYear?: number;
  } | null> {
    try {
      // First, retrieve the customer with expanded default_payment_method
      const customer = await this.stripe.customers.retrieve(customerId, {
        expand: ['invoice_settings.default_payment_method'],
      }) as Stripe.Customer;

      const pm = (customer.invoice_settings?.default_payment_method as Stripe.PaymentMethod) || null;

      if (!pm || pm.type !== 'card') return null;

      return {
        brand: pm.card?.brand,
        last4: pm.card?.last4,
        expMonth: pm.card?.exp_month,
        expYear: pm.card?.exp_year,
      };
    } catch (error) {
      AppLogger.error('Failed to retrieve default payment method', { error });
      return null;
    }
  }

  async getSubscriptionPaymentMethod(subscriptionId: string): Promise<{
    brand?: string;
    last4?: string;
    expMonth?: number;
    expYear?: number;
  } | null> {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['default_payment_method'],
      });

      const pm = subscription.default_payment_method as Stripe.PaymentMethod | null;

      if (!pm || pm.type !== 'card') return null;

      return {
        brand: pm.card?.brand,
        last4: pm.card?.last4,
        expMonth: pm.card?.exp_month,
        expYear: pm.card?.exp_year,
      };
    } catch (error) {
      AppLogger.error('Failed to retrieve subscription payment method', { error });
      return null;
    }
  }


  // constructWebhookEvent(rawBody: Buffer, signature?: string) {
  //   if (!config.stripe.webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is missing");
  //   if (!signature) throw new Error("Stripe signature header missing");
  //   return this.stripe.webhooks.constructEvent(rawBody, signature, config.stripe.webhookSecret!);
  // }

  // StripeService.ts - এই method টি যোগ করুন
  public async constructWebhookEventAsync(
    rawBody: Buffer | string, 
    signature: string
  ): Promise<Stripe.Event> {
    if (!config.stripe.webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET is missing");
    }
    
    if (!signature) {
      throw new Error("Stripe signature header missing");
    }
    
    // constructEventAsync 
    return await this.stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      config.stripe.webhookSecret
    );
  }

  // compatibility
  public async constructWebhookEvent(
    rawBody: Buffer, 
    signature: string
  ): Promise<Stripe.Event> {
    if (!config.stripe.webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET is missing");
    }
    
    if (!signature) {
      throw new Error("Stripe signature header missing");
    }
    
    AppLogger.debug('Constructing webhook event', {
      bodyLength: rawBody.length,
      signature: signature.substring(0, 50) + '...',
      webhookSecretConfigured: !!config.stripe.webhookSecret
    });
    
    try {
      // Use constructEventAsync with Buffer
      return await this.stripe.webhooks.constructEventAsync(
        rawBody,
        signature,
        config.stripe.webhookSecret
      );
    } catch (error: any) {
      AppLogger.error('Stripe webhook verification failed', {
        error: error.message,
        signatureLength: signature?.length,
        bodyLength: rawBody?.length,
        bodyPreview: rawBody?.toString()?.substring(0, 200)
      });
      throw error;
    }
  }
}
