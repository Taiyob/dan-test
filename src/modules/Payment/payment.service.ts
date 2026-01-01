import { PrismaClient, Membership, Transaction, PaymentStatus, SubscriptionStatus } from "@prisma/client";
import { BaseService } from "@/core/BaseService";
import { AppLogger } from "@/core/logging/logger";
import { StripeService } from "@/services/StripeService";
import { CreateCheckoutInput } from "./payment.validation";
import Stripe from "stripe";
import { config } from "@/core/config";

export class PaymentService {
  constructor(private prisma: PrismaClient, private stripeService: StripeService) {}

  // constructWebhookEvent(rawBody: Buffer, signature?: string) {
  //   return this.stripe.constructWebhookEvent(rawBody, signature);
  // }
  async constructWebhookEvent(rawBody: Buffer, signature?: string) {
    if (!signature) {
      throw new Error('Missing stripe-signature header');
    }

    return await this.stripeService.constructWebhookEventAsync(rawBody, signature);
  }

  async createCheckoutSession(
    input: CreateCheckoutInput & { 
      billing?: "monthly" | "annual";
      metadata?: Record<string, string>; 
    }
  ) {
    const plan = await this.prisma.plan.findUnique({ 
      where: { id: input.planId },
    });

    if (!plan) throw new Error("Plan not found");

    const limits = (plan.limits as any) || {};
    const stripeInfo = limits.stripe || {};
    const onboardingFee = limits.onboardingFee || 0;
    const isAnnual = input.billing === "annual";

    const recurringPriceId = isAnnual 
      ? stripeInfo.priceAnnual 
      : stripeInfo.priceMonthly;

    if (!recurringPriceId) {
      throw new Error("Stripe recurring price not configured for this plan/billing cycle");
    }

    if (!stripeInfo.productId && onboardingFee > 0 && !isAnnual) {
      throw new Error("Product ID missing in plan limits for onboarding fee");
    }

    const lineItems: Array<{ price: string; quantity: number }> = [
      { price: recurringPriceId, quantity: 1 }
    ];

    if (!isAnnual && onboardingFee > 0) {
      const onboardingPriceId = await this.stripeService.ensureOnboardingPrice(
        stripeInfo.productId, 
        onboardingFee
      );

      lineItems.push({
        price: onboardingPriceId,
        quantity: 1
      });

      AppLogger.info("Onboarding fee added to checkout", {
        plan: plan.name,
        amount: onboardingFee,
        priceId: onboardingPriceId,
      });
    } else if (isAnnual && onboardingFee > 0) {
      AppLogger.info("Onboarding fee waived (annual billing)", {
        plan: plan.name,
        originalFee: onboardingFee,
      });
    }

    const metadata: Record<string, string> = {
      planId: plan.id,
      userId: input.userId,
      billingCycle: isAnnual ? "annual" : "monthly",
      ...(input.metadata || {}),
    };

    const session = await this.stripeService.createCheckoutSession({
      lineItems,
      customerEmail: input.email,
      metadata,
    });

    return session;
  }

  // async createCheckoutSession(input: CreateCheckoutInput & { billing?: "monthly" | "annual" }) {
  //   const plan = await this.prisma.plan.findUnique({ where: { id: input.planId } });
  //   if (!plan) throw new Error("Plan not found");
  //   const limits = (plan.limits as any) || {};
  //   const stripeInfo = limits.stripe ?? {};
  //   const onboardingFee = limits.onboardingFee || 0;

  //   let priceId: string;
  //   if (input.billing === "annual") {
  //     priceId = stripeInfo.priceAnnual;
  //   } else {
  //     priceId = stripeInfo.priceMonthly;
  //   }

  //   if (!priceId) {
  //     throw new Error("Stripe price not configured for this billing cycle");
  //   }

  //   const pricing = limits.pricing || { monthly: Number(plan.price), annualAmount: Number(plan.price) * 12 };
  //   const key = plan.name.toLowerCase();
    
  //   const ensured = await this.stripeService.ensureProductAndPrices({ 
  //     key, 
  //     name: plan.name, 
  //     description: plan.description || undefined 
  //   }, pricing);
    
  //   //const priceId = ensured.priceIdAnnual;

  //   const session = await this.stripeService.createCheckoutSession({
  //     priceId,
  //     customerEmail: input.email,
  //     metadata: { planId: plan.id, userId: input.userId, interval: input.billing || "annual" },
  //     //successUrl: `${config.frontendUrl}/dashboard?success=1`,
  //     //cancelUrl: `${config.frontendUrl}/pricing?cancel=1`
  //   });
  //   return session;
  // }

  async handleStripeEvent(event: any) {
    switch (event.type) {
      case "checkout.session.completed":
        await this.onCheckoutCompleted(event.data.object);
        break;
      case "invoice.payment_succeeded":
        await this.onInvoiceSucceeded(event.data.object);
        break;
      default:
        AppLogger.info(`Unhandled Stripe event: ${event.type}`);
    }
  }

  private async onCheckoutCompleted(session: any) {
    const metadata = session.metadata || {};
    const userId = metadata.userId;
    const planId = metadata.planId;
    const customerId = session.customer;
    const subscriptionId = session.subscription;
    const priceId = session.line_items?.[0]?.price?.id || session.display_items?.[0]?.plan?.id;
    const amountTotal = session.amount_total || 0;
    const currency = session.currency || "usd";

    AppLogger.info("Processing checkout completion", {
      userId,
      planId,
      customerId,
      subscriptionId, 
      sessionId: session.id
    });

    let membership = await this.prisma.membership.findUnique({ where: { userId } });
    if (!membership) {
      membership = await this.prisma.membership.create({ data: { userId, planId, stripeCustomerID: customerId, paymentStatus: "completed", subscriptionStatus: "active", paymentGateway: "stripe", amountPaid: amountTotal ? (Number(amountTotal) / 100) as any : null, transactionId: subscriptionId || session.id } as any });
    } else {
      membership = await this.prisma.membership.update({ where: { id: membership.id }, data: { planId, stripeCustomerID: customerId, paymentStatus: "completed", subscriptionStatus: "active", transactionId: subscriptionId || membership.transactionId } });
    }

    await this.prisma.transaction.create({ data: {
      membershipId: membership.id,
      amount: (Number(amountTotal) / 100) as any,
      currency,
      paymentGateway: "stripe",
      paymentStatus: "completed",
      transactionType: "payment",
      externalId: session.payment_intent || session.id,
      description: `Subscription for plan ${planId}`,
      metadata: { 
        priceId,
        subscriptionId, 
        customerId 
      },
      processedAt: new Date(),
    } as any });

    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    const limits = (plan?.limits as any) || {};
    const existingAccess = await this.prisma.accessControl.findUnique({ where: { membershipId: membership.id } });
    if (!existingAccess) {
      await this.prisma.accessControl.create({ data: {
        membershipId: membership.id,
        maxClients: limits.maxClients ?? 25,
        maxEmployees: limits.maxEmployees ?? 10,
        maxCranes: limits.maxCranes ?? 50,
        maxStorageGB: limits.maxStorageGB ?? 10,
        enableAPI: limits.enableAPI ?? false,
        enableReports: limits.enableReports ?? true,
      } });
    } else {
      await this.prisma.accessControl.update({ where: { membershipId: membership.id }, data: {
        maxClients: limits.maxClients ?? existingAccess.maxClients,
        maxEmployees: limits.maxEmployees ?? existingAccess.maxEmployees,
        maxCranes: limits.maxCranes ?? existingAccess.maxCranes,
        maxStorageGB: limits.maxStorageGB ?? existingAccess.maxStorageGB,
        enableAPI: limits.enableAPI ?? existingAccess.enableAPI,
        enableReports: limits.enableReports ?? existingAccess.enableReports,
      } });
    }
  }

  private async onInvoiceSucceeded(invoice: any) {
    const subscriptionId = invoice.subscription;
    const paymentIntent = invoice.payment_intent;
    const amountPaid = invoice.amount_paid || 0;
    const currency = invoice.currency || "usd";
    const priceId = invoice.lines?.data?.[0]?.price?.id;

    const tx = await this.prisma.transaction.create({ data: {
      membershipId: "", // placeholder, linked via metadata in checkout
      amount: (Number(amountPaid) / 100) as any,
      currency,
      paymentGateway: "stripe",
      paymentStatus: "completed",
      transactionType: "renewal",
      externalId: paymentIntent || subscriptionId,
      metadata: { priceId },
      processedAt: new Date(),
    } as any });
    return tx;
  }

}
