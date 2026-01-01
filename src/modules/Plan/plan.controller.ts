import { BaseController } from "@/core/BaseController";
import { Request, Response } from "express";
import { PlanService } from "./plan.service";
import { HTTPStatusCode } from "@/types/HTTPStatusCode";
import { ChangePlanStatusInput } from "./plan.validation";

export class PlanController extends BaseController {
  constructor(private planService: PlanService) { super(); }

  public create = async (req: Request, res: Response) => {
    const body = req.validatedBody || req.body;
    const result = await this.planService.createPlan(body);
    return this.sendCreatedResponse(res, result, "Plan created successfully");
  };

  public update = async (req: Request, res: Response) => {
    const { id } = req.validatedParams;
    const body = req.validatedBody;
    const result = await this.planService.updatePlan(id, body);
    return this.sendResponse(res, "Plan updated successfully", HTTPStatusCode.OK, result);
  };

  // plan.controller.ts

  public changeStatus = async (req: Request, res: Response) => {
    const { id } = req.validatedParams;
    const body = req.validatedBody as ChangePlanStatusInput;
    const result = await this.planService.changePlanStatus(id, body);
    return this.sendResponse(res, "Plan status updated successfully", HTTPStatusCode.OK, result);
  };

  public list = async (req: Request, res: Response) => {
    const query = req.validatedQuery || req.query;
    const result = await this.planService.getPlans(query as any);
    return this.sendPaginatedResponse(res, {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
      hasNext: result.hasNext,
      hasPrevious: result.hasPrevious,
    }, "Plans retrieved successfully", result.data);
  };

  public getById = async (req: Request, res: Response) => {
    const { id } = req.validatedParams || req.params;
    const result = await this.planService.getPlanById(id);
    return this.sendResponse(res, "Plan retrieved successfully", HTTPStatusCode.OK, result);
  };

  public seedDefaults = async (req: Request, res: Response) => {
    const body = req.validatedBody || req.body;
    const result = await this.planService.seedDefaults(body);
    return this.sendResponse(res, "Default plans seeded", HTTPStatusCode.OK, result);
  };

  public syncStripe = async (req: Request, res: Response) => {
    const result = await this.planService.syncStripeForAll();
    return this.sendResponse(res, "Plans synced with Stripe", HTTPStatusCode.OK, result);
  };
}
