import { Router, Request, Response } from "express";
import { validateRequest } from "@/middleware/validation";
import { asyncHandler } from "@/middleware/asyncHandler";
import { MembershipValidation } from "./membership.validation";
import { MembershipController } from "./membersip.controller";
import { authenticate, authorize } from "@/middleware/auth";

// ---------------------------------------------
// Membership Routes
// ---------------------------------------------
export class MembershipRoutes {
  private router: Router;
  private membershipController: MembershipController;

  constructor(membershipController: MembershipController) {
    this.router = Router();
    this.membershipController = membershipController;
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // NEW: Get current user's membership
    this.router.get(
      "/me",
      authenticate,
      asyncHandler((req: Request, res: Response) =>
        this.membershipController.getMyMembership(req, res)
      )
    );

    // NEW: Change plan (upgrade/downgrade)
    this.router.post(
      "/change-plan",
      authenticate,
      validateRequest({ body: MembershipValidation.body.changePlan }),
      asyncHandler((req: Request, res: Response) =>
        this.membershipController.changePlan(req, res)
      )
    );

    // NEW: Cancel subscription
    this.router.post(
      "/cancel",
      authenticate,
      asyncHandler((req: Request, res: Response) =>
        this.membershipController.cancelSubscription(req, res)
      )
    );

    // NEW: Reactivate subscription
    this.router.post(
      "/reactivate",
      authenticate,
      asyncHandler((req: Request, res: Response) =>
        this.membershipController.reactivateSubscription(req, res)
      )
    );

    // Admin route Create membership
    this.router.post(
      "/",
      authenticate,
      authorize("admin"),
      validateRequest({ body: MembershipValidation.body.addMembership }),
      asyncHandler((req: Request, res: Response) =>
        this.membershipController.createMembership(req, res)
      )
    );

    // Get all memberships
    this.router.get(
      "/",
      authenticate,
      authorize("admin"),
      validateRequest({ query: MembershipValidation.query.list }),
      asyncHandler((req: Request, res: Response) =>
        this.membershipController.getAllMemberships(req, res)
      )
    );

    // Get membership by ID
    this.router.get(
      "/:id",
      authenticate,
      authorize("admin"),
      validateRequest({ params: MembershipValidation.params.id }),
      asyncHandler((req: Request, res: Response) =>
        this.membershipController.getMembershipById(req, res)
      )
    );

    // AdminRoutes.ts or wherever you have admin routes

    this.router.get(
      "/:userId/subscription-details",
      authenticate,
      //authorize(['admin']), // your role check middleware
      asyncHandler((req: Request, res: Response) => this.membershipController.getUserSubscriptionDetails(req, res))
    );

    // Update membership by ID
    this.router.patch(
      "/:id",
      authenticate,
      authorize("admin"),
      validateRequest({
        params: MembershipValidation.params.id,
        body: MembershipValidation.body.updateMembership,
      }),
      asyncHandler((req: Request, res: Response) =>
        this.membershipController.updateMembershipById(req, res)
      )
    );

    // Delete membership by ID
    this.router.delete(
      "/:id",
      authenticate,
      authorize("admin"),
      validateRequest({ params: MembershipValidation.params.id }),
      asyncHandler((req: Request, res: Response) =>
        this.membershipController.deleteMembership(req, res)
      )
    );
  }

  public getRouter(): Router {
    return this.router;
  }
}