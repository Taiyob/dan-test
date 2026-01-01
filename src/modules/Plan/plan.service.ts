import { BaseService } from "@/core/BaseService";
import { AppLogger } from "@/core/logging/logger";
import { ConflictError, NotFoundError, BadRequestError } from "@/core/errors/AppError";
import { PrismaClient, Plan } from "@prisma/client";
import { AddPlanInput, ChangePlanStatusInput, SeedPlanInput, UpdatePlanInput } from "./plan.validation";
import { StripeService } from "@/services/StripeService";

export class PlanService extends BaseService<Plan> {
  constructor(prisma: PrismaClient, private stripe: StripeService) {
    super(prisma, "Plan", { enableSoftDelete: false, enableAuditFields: true });
  }

  protected getModel() {
    return this.prisma.plan;
  }

  async createPlan(data: AddPlanInput): Promise<Plan> {
    const existing = await this.findOne({ name: data.name });
    if (existing) throw new ConflictError("Plan with this name already exists");
    // Ensure Stripe Product & Prices
    const pricing = { monthly: Number(data.price), annualAmount: Number(data.price) * 12 };
    const ensured = await this.stripe.ensureProductAndPrices({ key: data.name.toLowerCase(), name: data.name, description: data.description }, pricing);

    const plan = await this.create({
      ...data,
      limits: {
        ...(data.limits || {}),
        pricing,
        stripe: { productId: ensured.productId, priceAnnual: ensured.priceIdAnnual, priceMonthly: ensured.priceIdMonthly },
      },
    } as any);
    AppLogger.info(`Plan created: ${plan.name}`);
    return plan;
  }

  async updatePlan(id: string, data: UpdatePlanInput): Promise<Plan> {
    const plan = await this.getPlanById(id);

    if (data.name || data.description !== undefined || data.price !== undefined) {
      const monthlyPrice = data.price ?? plan.price;
      const pricing = { 
        monthly: Number(monthlyPrice), 
        annualAmount: Number(monthlyPrice) * 12
      };

      const ensured = await this.stripe.ensureProductAndPrices(
        { 
          key: (data.name ?? plan.name).toLowerCase(), 
          name: data.name ?? plan.name, 
          description: data.description ?? plan.description ?? undefined  
        },
        pricing
      );

      const updated = await this.updateById(id, {
        ...data,
        price: monthlyPrice,
        limits: {
          ...(plan.limits as any),
          pricing,
          stripe: { 
            productId: ensured.productId, 
            priceAnnual: ensured.priceIdAnnual, 
            priceMonthly: ensured.priceIdMonthly 
          },
        },
      });
      return updated;
    }

    return this.updateById(id, data);
  }

  async changePlanStatus(id: string, data: ChangePlanStatusInput): Promise<Plan> {
  const plan = await this.getPlanById(id);

  const updated = await this.updateById(id, {
    status: data.status,
  });

  AppLogger.info(`Plan status updated: ${plan.name} → ${data.status}`);

  return updated;
}

  async getPlans(query: { page: number; limit: number; sortBy?: string; sortOrder?: "asc"|"desc"; }) {
    const { page, limit, sortBy = "createdAt", sortOrder = "desc" } = query;
    return this.findMany({}, { page, limit, offset: (page - 1) * limit }, { [sortBy]: sortOrder }, {});
  }

  async getPlanById(id: string): Promise<Plan> {
    const plan = await this.findById(id);
    if (!plan) throw new NotFoundError("Plan");
    return plan;
  }

  async comparePlans(currentPlanId: string, targetPlanId: string): Promise<{
    isUpgrade: boolean;
    isDowngrade: boolean;
    currentPlan: Plan;
    targetPlan: Plan;
    priceDifference: number;
    featuresDiff: {
      added: string[];
      removed: string[];
    };
  }> {
    const [currentPlan, targetPlan] = await Promise.all([
      this.getPlanById(currentPlanId),
      this.getPlanById(targetPlanId),
    ]);

    const currentPrice = Number(currentPlan.price);
    const targetPrice = Number(targetPlan.price);
    const priceDifference = targetPrice - currentPrice;

    const isUpgrade = targetPrice > currentPrice;
    const isDowngrade = targetPrice < currentPrice;

    // Feature comparison
    const currentFeatures = new Set(currentPlan.features || []);
    const targetFeatures = new Set(targetPlan.features || []);

    const added = Array.from(targetFeatures).filter(f => !currentFeatures.has(f));
    const removed = Array.from(currentFeatures).filter(f => !targetFeatures.has(f));

    AppLogger.info("Plan comparison completed", {
      current: currentPlan.name,
      target: targetPlan.name,
      isUpgrade,
      priceDifference,
    });

    return {
      isUpgrade,
      isDowngrade,
      currentPlan,
      targetPlan,
      priceDifference,
      featuresDiff: { added, removed },
    };
  }

  async seedDefaults(opts: SeedPlanInput) {
    const discount = opts.applyAnnualDiscount ? (opts.discountPercent / 100) : 0;
    // Annual-এ discount দিতে চাইলে (যেমন 15-20% common), না হলে 0
    // ক্লায়েন্ট doc-এ annual mention নেই, কিন্তু Pro & Enterprise-এ onboarding fee waived with annual – তাই annual support রাখা ভালো
    const computeAnnualAmount = (monthly: number) => Math.round(monthly * 12 * (1 - discount));

    const defaults: Array<AddPlanInput & { key: string; monthly: number; annualAmount: number; limits: any }> = [
      {
        key: "basic",
        name: "Basic",
        description: "For small service companies, owner-operators, or single-site teams.",
        price: 99, // monthly price shown in UI
        billingCycle: "monthly", // default shown
        features: [
          "Email reminders (no SMS)",
          "Inspection scheduling & automation",
          "Basic reporting",
          "CSV import/export",
          "Self-serve onboarding (no live training)",
        ],
        monthly: 99,
        annualAmount: computeAnnualAmount(99),
        limits: {
          maxClients: 25,
          maxEmployees: 5,
          maxTools: 15,
          maxVehicles: 5,
          maxInspectionsPerMonth: 25,
          enableSMS: false,
          enableMultiSite: false,
          enableAdvancedAnalytics: false,
          enablePrioritySupport: false,
          enableAPI: false,
          enableIntegrations: false,
          onboardingFee: 0, // self-serve
        },
      },
      {
        key: "pro",
        name: "Pro",
        description: "Best for mid-size service companies, multi-technician teams, and multi-site operators.",
        price: 299,
        billingCycle: "monthly",
        features: [
          "Email + SMS reminders",
          "Full inspection scheduling automation",
          "Advanced reporting & analytics",
          "Priority support",
          "Role-based access control",
          "Bulk import/export",
          "Multi-site management enabled",
          "$499 onboarding & live training (waived with annual billing)",
        ],
        monthly: 299,
        annualAmount: computeAnnualAmount(299),
        limits: {
          maxClients: 250,
          maxEmployees: 50,
          maxTools: 1000,
          maxVehicles: 50,
          maxInspectionsPerMonth: 500,
          enableSMS: true,
          enableMultiSite: true,
          enableAdvancedAnalytics: true,
          enablePrioritySupport: true,
          enableAPI: false, // Pro-তে নেই
          enableIntegrations: false,
          onboardingFee: 499, // waived if annual
        },
      },
      {
        key: "enterprise",
        name: "Enterprise",
        description: "For large organizations, enterprise operators, heavy-volume users, and companies requiring integration or customized workflows.",
        price: 599,
        billingCycle: "monthly",
        features: [
          "Everything in Pro",
          "Full integrations",
          "API access",
          "Custom dashboards & reporting",
          "Dedicated account manager",
          "SLA & compliance guarantees",
          "Tailored onboarding & training",
          "Advanced data migration & configuration",
          "Weekend/priority support options",
          "$1499 onboarding & live training (waived with annual billing)",
        ],
        monthly: 599,
        annualAmount: computeAnnualAmount(599),
        limits: {
          maxClients: 0, // unlimited = 0 বা null
          maxEmployees: 0,
          maxTools: 0,
          maxVehicles: 0,
          maxInspectionsPerMonth: 0,
          enableSMS: true,
          enableMultiSite: true,
          enableAdvancedAnalytics: true,
          enablePrioritySupport: true,
          enableAPI: true,
          enableIntegrations: true,
          onboardingFee: 1499, // waived if annual
        },
      },
    ];

    const results: Plan[] = [];
    for (const p of defaults) {
      const existing = await this.findOne({ name: p.name });
      const ensured = await this.stripe.ensureProductAndPrices(
        { key: p.key, name: p.name, description: p.description },
        { monthly: p.monthly, annualAmount: p.annualAmount }
      );

      const payload: any = {
        name: p.name,
        description: p.description,
        price: p.price, // UI-তে monthly price দেখানোর জন্য
        billingCycle: p.billingCycle,
        features: p.features,
        limits: {
          ...p.limits,
          pricing: { monthly: p.monthly, annualAmount: p.annualAmount },
          stripe: {
            productId: ensured.productId,
            priceAnnual: ensured.priceIdAnnual,
            priceMonthly: ensured.priceIdMonthly,
          },
        },
      };

      if (existing) {
        const updated = await this.updateById(existing.id, payload);
        results.push(updated);
      } else {
        const created = await this.create(payload);
        results.push(created);
      }
    }

    return results;
  }

  async syncStripeForAll() {
    const plans = await this.prisma.plan.findMany();
    const updated: Plan[] = [];
    for (const plan of plans) {
      const limits = (plan.limits as any) || {};
      const pricing = limits.pricing || { monthly: Number(plan.price), annualAmount: Number(plan.price) * 12 };
      const ensured = await this.stripe.ensureProductAndPrices({ key: plan.name.toLowerCase(), name: plan.name, description: plan.description || undefined }, pricing);
      const payload: any = {
        limits: { ...limits, pricing, stripe: { productId: ensured.productId, priceAnnual: ensured.priceIdAnnual, priceMonthly: ensured.priceIdMonthly } },
      };
      const upd = await this.updateById(plan.id, payload);
      updated.push(upd);
    }
    return updated;
  }
}
