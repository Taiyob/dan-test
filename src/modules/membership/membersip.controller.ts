import { BaseController } from "@/core/BaseController";
import { Request, Response } from "express";
import { MembershipService } from "./membership.service";
import { HTTPStatusCode } from "@/types/HTTPStatusCode";
import { BadRequestError, NotFoundError } from "@/core/errors/AppError";

// ---------------------------------------------
// Membership Controller
// ---------------------------------------------
export class MembershipController extends BaseController {
  constructor(private membershipService: MembershipService) {
    super();
  }

  /**
   * Create a new Membership
   * POST /api/memberships
   */
  public createMembership = async (req: Request, res: Response) => {
    const body = req.validatedBody || req.body;
    this.logAction("createMembership", req, { body });

    const result = await this.membershipService.createMembership(body);
    return this.sendCreatedResponse(
      res,
      result,
      "Membership created successfully"
    );
  };

  /**
   * Get all Memberships
   * GET /api/memberships
   */
  public getAllMemberships = async (req: Request, res: Response) => {
    const query = req.validatedQuery || req.query;
    const result = await this.membershipService.getMemberships(query);

    this.logAction("getAllMemberships", req, { count: result.data.length });

    return this.sendPaginatedResponse(
      res,
      {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
        hasNext: result.hasNext,
        hasPrevious: result.hasPrevious,
      },
      "Memberships retrieved successfully",
      result.data
    );
  };

  /**
   * Get a Membership by ID
   * GET /api/memberships/:id
   */
  public getMembershipById = async (req: Request, res: Response) => {
    const { id } = req.validatedParams || req.params;
    this.logAction("getMembershipById", req, { id });

    const result = await this.membershipService.getMembershipById(id);
    return this.sendResponse(
      res,
      "Membership retrieved successfully",
      HTTPStatusCode.OK,
      result
    );
  };

  public getUserSubscriptionDetails = async (req: Request, res: Response) => {
    // Admin only check
    const currentUser = (req as any).user;
    // if (currentUser.role !== 'admin') {
    //   throw new ForbiddenError("Only admins can access this endpoint");
    // }

    const { userId } = req.params;
    if (!userId) throw new BadRequestError("userId is required");

    const details = await this.membershipService.getSubscriptionDetailsForAdmin(userId);

    if (!details) {
      throw new NotFoundError("Membership not found for this user");
    }

    const response = {
      userId,
      planName: details.plan.name,
      subscriptionStatus: details.membership.subscriptionStatus,
      paymentStatus: details.membership.paymentStatus,
      billingCycle: (details.plan.limits as any)?.pricing ? 
        `Monthly: $${(details.plan.limits as any).pricing.monthly}, Annual: $${(details.plan.limits as any).pricing.annualAmount / 12}/mo` : 
        `$${details.plan.price}/month`,
      features: details.plan.features,
      limits: {
        maxClients: details.accessControl?.maxClients,
        maxEmployees: details.accessControl?.maxEmployees,
        maxCranes: details.accessControl?.maxCranes,
        maxStorageGB: details.accessControl?.maxStorageGB,
        enableAPI: details.accessControl?.enableAPI,
        enableReports: details.accessControl?.enableReports,
        // add more as needed
      },
      paymentMethod: details.paymentMethod ? {
        brand: details.paymentMethod.brand,
        last4: details.paymentMethod.last4,
        expiry: `${details.paymentMethod.expMonth}/${details.paymentMethod.expYear}`,
      } : null,
    };

    return this.sendResponse(res, "Subscription details retrieved", 200, response);
  };

  public getMyMembership = async (req: Request, res: Response) => {
    const userId = this.getUserId(req);
    if (!userId) {
      return this.sendResponse(
        res,
        "User not authenticated",
        HTTPStatusCode.UNAUTHORIZED
      );
    }

    this.logAction("getMyMembership", req, { userId });

    const result = await this.membershipService.getMembershipByUserId(userId);
    return this.sendResponse(
      res,
      "Membership retrieved successfully",
      HTTPStatusCode.OK,
      result
    );
  };

  /**
   * Update a Membership by ID
   * PATCH /api/memberships/:id
   */
  public updateMembershipById = async (req: Request, res: Response) => {
    const params = req.validatedParams || req.params;
    const body = req.validatedBody || req.body;
    const { id } = params;
    this.logAction("updateMembershipById", req, { id, body });

    const result = await this.membershipService.updateMembership(id, body);
    return this.sendResponse(
      res,
      "Membership updated successfully",
      HTTPStatusCode.OK,
      result
    );
  };

  public changePlan = async (req: Request, res: Response) => {
    const userId = this.getUserId(req);
    if (!userId) {
      return this.sendResponse(
        res,
        "User not authenticated",
        HTTPStatusCode.UNAUTHORIZED
      );
    }

    const body = req.validatedBody || req.body;
    this.logAction("changePlan", req, { userId, body });

    const result = await this.membershipService.changePlan(
      userId,
      body.newPlanId,
      body.billing || "annual"
    );

    return this.sendResponse(
      res,
      result.message,
      HTTPStatusCode.OK,
      result
    );
  };

  public cancelSubscription = async (req: Request, res: Response) => {
    const userId = this.getUserId(req);
    if (!userId) {
      return this.sendResponse(
        res,
        "User not authenticated",
        HTTPStatusCode.UNAUTHORIZED
      );
    }

    this.logAction("cancelSubscription", req, { userId });

    const result = await this.membershipService.cancelSubscription(userId);
    return this.sendResponse(
      res,
      result.message,
      HTTPStatusCode.OK,
      result
    );
  };

  public reactivateSubscription = async (req: Request, res: Response) => {
    const userId = this.getUserId(req);
    if (!userId) {
      return this.sendResponse(
        res,
        "User not authenticated",
        HTTPStatusCode.UNAUTHORIZED
      );
    }

    this.logAction("reactivateSubscription", req, { userId });

    const result = await this.membershipService.reactivateSubscription(userId);
    return this.sendResponse(
      res,
      result.message,
      HTTPStatusCode.OK,
      result
    );
  };

  /**
   * Delete a Membership by ID
   * DELETE /api/memberships/:id
   */
  public deleteMembership = async (req: Request, res: Response) => {
    const params = req.validatedParams || req.params;
    const { id } = params;
    this.logAction("deleteMembership", req, { id });

    const result = await this.membershipService.deleteMembership(id);
    return this.sendResponse(
      res,
      "Membership deleted successfully",
      HTTPStatusCode.OK,
      result
    );
  };
}