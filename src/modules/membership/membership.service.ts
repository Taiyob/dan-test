import { BaseService } from "@/core/BaseService";
import { AppLogger } from "@/core/logging/logger";
import { ConflictError, NotFoundError, BadRequestError } from "@/core/errors/AppError";
import { AccessControl, Membership, Plan, PrismaClient } from "@prisma/client";
import {
  AddMembershipInput,
  MembershipListQuery,
  UpdateMembershipInput,
} from "./membership.validation";
import { StripeService } from "@/services/StripeService";

// ---------------------------------------------
// Membership Service
// ---------------------------------------------
export class MembershipService extends BaseService<Membership> {
  constructor(prisma: PrismaClient, private stripe: StripeService) {
    super(prisma, "Membership", {
      enableSoftDelete: false, // Schema does not have soft delete
      enableAuditFields: true,
    });
  }

  protected getModel() {
    return this.prisma.membership;
  }

  /**
   * Create a new Membership
   */
  async createMembership(data: AddMembershipInput): Promise<Membership> {
    const { userId } = data;

    // Check for conflict (user can only have one membership)
    const existing = await this.findOne({ userId });
    if (existing) {
      throw new ConflictError("This user already has an active membership");
    }

    AppLogger.info(`Creating new Membership for user: ${userId}`);
    const membership = await this.create(data);
    AppLogger.info(`Membership created (ID: ${membership.id})`);
    return membership;
  }

  /**
   * Get all Memberships with optional filtering and pagination
   */
  async getMemberships(query: MembershipListQuery) {
    const {
      page,
      limit,
      subscriptionStatus,
      paymentStatus,
      sortBy = "createdAt",
      sortOrder = "desc",
      ...rest
    } = query;

    let filters: any = {};
    if (subscriptionStatus) {
      filters.subscriptionStatus = subscriptionStatus;
    }
    if (paymentStatus) {
      filters.paymentStatus = paymentStatus;
    }

    filters = this.mergeFilters(filters, this.applyFilters(rest));

    const result = await this.findMany(
      filters,
      { page, limit, offset: (page - 1) * limit },
      { [sortBy]: sortOrder },
      {plan: true, user: { select: { id: true, email: true, firstName: true, lastName: true } }}
    );

    AppLogger.info(`Memberships found: ${result.data.length}`);
    return result;
  }

  /**
   * Get a Membership by ID
   */
  async getMembershipById(id: string): Promise<Membership> {
    const membership = await this.findById(id, {
      plan: true,
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
      accessControl: true,
    });
    if (!membership) throw new NotFoundError("Membership");
    return membership;
  }

  async getMembershipByUserId(userId: string): Promise<Membership | null> {
    const membership = await this.findOne({ userId }, {
      plan: true,
      accessControl: true,
    });
    return membership;
  }

  async getSubscriptionDetailsForAdmin(userId: string): Promise<{
    membership: Membership;
    plan: Plan;
    accessControl: AccessControl | null;
    paymentMethod?: {
      brand?: string;
      last4?: string;
      expMonth?: number;
      expYear?: number;
    } | null | undefined ;
  } | null> {
    const membership = await this.getMembershipByUserId(userId);
    if (!membership) return null;

    const plan = await this.prisma.plan.findUnique({ where: { id: membership.planId } });
    if (!plan) throw new NotFoundError("Plan");

    const accessControl = await this.prisma.accessControl.findUnique({
      where: { membershipId: membership.id },
    });

    let paymentMethod = null;
    if (membership.stripeCustomerID && membership.transactionId?.startsWith('sub_')) {
      // Try subscription default first (most accurate)
      paymentMethod = await this.stripe.getSubscriptionPaymentMethod(membership.transactionId);
      if (!paymentMethod) {
        // Fallback to customer default
        paymentMethod = await this.stripe.getCustomerDefaultPaymentMethod(membership.stripeCustomerID);
      }
    }

    return {
      membership,
      plan,
      accessControl,
      paymentMethod,
    };
  }

  /**
   * Update a Membership by ID
   */
  async updateMembership(
    id: string,
    data: UpdateMembershipInput
  ): Promise<Membership> {
    const exists = await this.exists({ id });
    if (!exists) throw new NotFoundError("Membership");

    const updated = await this.updateById(id, data);
    AppLogger.info(`Membership updated (ID: ${updated.id})`);
    return updated;
  }

  // NEW: Upgrade/Downgrade Plan
  async changePlan(
    userId: string,
    newPlanId: string,
    billing: "monthly" | "annual"
  ): Promise<{
    membership: Membership;
    checkoutUrl?: string;
    message: string;
  }> {
    // 1. Get current membership
    const membership = await this.getMembershipByUserId(userId);
    if (!membership) {
      throw new NotFoundError("No active membership found for this user");
    }

    if (!membership.stripeCustomerID) {
      throw new BadRequestError(
        "No Stripe customer found. Please complete initial payment first."
      );
    }

    // 2. Get both plans
    const [currentPlan, newPlan] = await Promise.all([
      this.prisma.plan.findUnique({ where: { id: membership.planId } }),
      this.prisma.plan.findUnique({ where: { id: newPlanId } }),
    ]);

    if (!currentPlan || !newPlan) {
      throw new NotFoundError("Plan not found");
    }

    // 3. Check if same plan
    if (currentPlan.id === newPlan.id) {
      throw new BadRequestError("You are already on this plan");
    }

    const currentPrice = Number(currentPlan.price);
    const newPrice = Number(newPlan.price);
    const isUpgrade = newPrice > currentPrice;

    AppLogger.info(`Plan change requested`, {
      userId,
      from: currentPlan.name,
      to: newPlan.name,
      type: isUpgrade ? "upgrade" : "downgrade",
      currentSubscriptionId: membership.transactionId,
    });

    // 4. Get Stripe price ID from new plan
    const newPlanLimits = (newPlan.limits as any) || {};
    const stripeInfo = newPlanLimits.stripe || {};
    const priceId = billing === "annual" ? stripeInfo.priceAnnual : stripeInfo.priceMonthly;

    if (!priceId) {
      throw new BadRequestError("Stripe price not configured for this plan");
    }

    // 5. Update Stripe subscription if exists
    if (membership.transactionId && membership.transactionId.startsWith("sub_")) {
      try {
        await this.stripe.updateSubscription(
          membership.transactionId,
          priceId,
          isUpgrade
        );

        AppLogger.info("Stripe subscription updated", {
          subscriptionId: membership.transactionId,
          customerId: membership.stripeCustomerID,
          newPriceId: priceId,
        });
      } catch (error) {
        AppLogger.error("Failed to update Stripe subscription", { error });
        throw new BadRequestError("Failed to update subscription in payment gateway");
      }
    } else {
    // NEW: If no subscription exists, create a new checkout session
    AppLogger.warn("No subscription found, creating new checkout session", {
      userId,
      membershipId: membership.id
    });
    
    // This case happens if user registered but never subscribed
    // You might want to handle this differently
  }

    // 6. Update membership in database
    const updatedMembership = await this.updateById(membership.id, {
      planId: newPlanId,
      subscriptionStatus: "active",
      paymentStatus: "completed",
    });

    // 7. Update access control limits
    const newLimits = newPlanLimits;
    await this.prisma.accessControl.update({
      where: { membershipId: membership.id },
      data: {
        maxClients: newLimits.maxClients ?? 25,
        maxEmployees: newLimits.maxEmployees ?? 10,
        maxCranes: newLimits.maxCranes ?? 50,
        maxStorageGB: newLimits.maxStorageGB ?? 10,
        enableAPI: newLimits.enableAPI ?? false,
        enableReports: newLimits.enableReports ?? true,
      },
    });

    AppLogger.info("Plan changed successfully", {
      membershipId: membership.id,
      userId,
      newPlan: newPlan.name,
    });

    return {
      membership: updatedMembership,
      message: isUpgrade
        ? `Successfully upgraded to ${newPlan.name} plan`
        : `Successfully downgraded to ${newPlan.name} plan`,
    };
  }

  // Cancel subscription
  async cancelSubscription(userId: string): Promise<{
    membership: Membership;
    message: string;
  }> {
    const membership = await this.getMembershipByUserId(userId);
    if (!membership) {
      throw new NotFoundError("No active membership found");
    }

    if (!membership.stripeCustomerID) {
      throw new BadRequestError("No Stripe customer found for this membership");
    }

    // Cancel in Stripe if subscription exists
    if (membership.transactionId && membership.transactionId.startsWith("sub_")) {
      try {
        await this.stripe.cancelSubscription(membership.transactionId);
        AppLogger.info("Stripe subscription canceled", {
          subscriptionId: membership.transactionId,
          customerId: membership.stripeCustomerID,
        });
      } catch (error) {
        AppLogger.error("Failed to cancel Stripe subscription", { error });
      }
    }

    // Update membership status
    const updated = await this.updateById(membership.id, {
      subscriptionStatus: "canceled",
      canceledAt: new Date(),
    });

    AppLogger.info("Subscription canceled", {
      membershipId: membership.id,
      userId,
    });

    return {
      membership: updated,
      message: "Subscription canceled successfully",
    };
  }

  async reactivateSubscription(userId: string): Promise<{
    membership: Membership;
    message: string;
  }> {
    const membership = await this.getMembershipByUserId(userId);
    if (!membership) {
      throw new NotFoundError("No membership found");
    }

    if (membership.subscriptionStatus !== "canceled") {
      throw new BadRequestError("Subscription is not canceled");
    }

    const updated = await this.updateById(membership.id, {
      subscriptionStatus: "active",
      canceledAt: null,
    });

    AppLogger.info("Subscription reactivated", {
      membershipId: membership.id,
      userId,
    });

    return {
      membership: updated,
      message: "Subscription reactivated successfully",
    };
  }

  /**
   * Delete a Membership by ID
   */
  async deleteMembership(id: string): Promise<Membership> {
    const exists = await this.exists({ id });
    if (!exists) throw new NotFoundError("Membership");

    const deleted = await this.deleteById(id);
    AppLogger.info(`Membership deleted (ID: ${deleted.id})`);
    return deleted;
  }
}