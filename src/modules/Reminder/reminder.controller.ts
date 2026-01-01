import { BaseController } from "@/core/BaseController";
import { Request, Response } from "express";
import { ReminderService } from "./reminder.service";
import { HTTPStatusCode } from "@/types/HTTPStatusCode";
import { RequestWithUser } from "@/middleware/auth";

// ---------------------------------------------
// ✅ Reminder Controller
// ---------------------------------------------
export class ReminderController extends BaseController {
  constructor(private service: ReminderService) {
    super();
  }

  /**
   * Create a new Reminder
   * POST /api/reminders
   */
  public createReminder = async (req: Request, res: Response) => {
    const body = req.validatedBody || req.body;
    this.logAction("createReminder", req, { body });

    const result = await this.service.createReminder(body);
    return this.sendCreatedResponse(res, result, "Reminder created successfully");
  };

  /**
   * Get all Reminders
   * GET /api/reminders
   */
  public getReminders = async (req: Request, res: Response) => {
    const query = req.validatedQuery || req.query;
    const result = await this.service.getReminders(query);

    this.logAction("getReminders", req, { count: result.data.length });

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
      "Reminders retrieved successfully",
      result.data
    );
  };

  public getRemindersByClient = async (req: RequestWithUser, res: Response) => {
    const query = req.validatedQuery || req.query;
    const userId = req.userId!;
    const role = req.userRole!;

    this.logAction("getRemindersByClient", req, { userId });

    const result = await this.service.getRemindersByClient(query, userId, role);

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
      "User's client reminders retrieved successfully",
      result.data
    );
  };

  /**
   * Get a Reminder by ID
   * GET /api/reminders/:id
   */
  public getReminderById = async (req: Request, res: Response) => {
    const { id } = req.validatedParams || req.params;
    this.logAction("getReminderById", req, { id });

    const result = await this.service.getReminderById(id);
    return this.sendResponse(res, "Reminder retrieved successfully", HTTPStatusCode.OK, result);
  };

  /**
   * Update a Reminder by ID
   * PATCH /api/reminders/:id
   */
  public updateReminder = async (req: Request, res: Response) => {
    const { id } = req.validatedParams || req.params;
    const body = req.validatedBody || req.body;
    this.logAction("updateReminder", req, { id, body });

    const result = await this.service.updateReminder(id, body);
    return this.sendResponse(res, "Reminder updated successfully", HTTPStatusCode.OK, result);
  };

  /**
   * Delete a Reminder by ID
   * DELETE /api/reminders/:id
   */
  public deleteReminder = async (req: Request, res: Response) => {
    const { id } = req.validatedParams || req.params;
    this.logAction("deleteReminder", req, { id });

    const result = await this.service.deleteReminder(id);
    return this.sendResponse(res, "Reminder deleted successfully", HTTPStatusCode.OK, result);
  };
}
