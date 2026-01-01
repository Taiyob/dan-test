import { Router, Request, Response } from "express";
import { ReminderController } from "./reminder.controller";
import { validateRequest } from "@/middleware/validation";
import { asyncHandler } from "@/middleware/asyncHandler";
import { ReminderValidation } from "./reminder.validation";
import { authenticate } from "@/middleware/auth";

// ---------------------------------------------
// ✅ Reminder Routes
// ---------------------------------------------
export class ReminderRoutes {
  private router: Router;
  private controller: ReminderController;

  constructor(controller: ReminderController) {
    this.router = Router();
    this.controller = controller;
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Create reminder
    this.router.post(
      "/",
      validateRequest({ body: ReminderValidation.body.addReminder }),
      asyncHandler((req: Request, res: Response) => this.controller.createReminder(req, res))
    );

    // Get all reminders
    this.router.get(
      "/",
      validateRequest({ query: ReminderValidation.query.list }),
      asyncHandler((req: Request, res: Response) => this.controller.getReminders(req, res))
    );

    // Get reminders by logged-in user's clients only
    this.router.get(
      "/by-client",
      authenticate, 
      validateRequest({ query: ReminderValidation.query.list }),
      asyncHandler((req: Request, res: Response) =>
        this.controller.getRemindersByClient(req, res)
      )
    );

    // Get reminder by ID
    this.router.get(
      "/:id",
      validateRequest({ params: ReminderValidation.params.id }),
      asyncHandler((req: Request, res: Response) => this.controller.getReminderById(req, res))
    );

    // Update reminder by ID
    this.router.patch(
      "/:id",
      validateRequest({
        params: ReminderValidation.params.id,
        body: ReminderValidation.body.updateReminder,
      }),
      asyncHandler((req: Request, res: Response) => this.controller.updateReminder(req, res))
    );

    // Delete reminder by ID
    this.router.delete(
      "/:id",
      validateRequest({ params: ReminderValidation.params.id }),
      asyncHandler((req: Request, res: Response) => this.controller.deleteReminder(req, res))
    );
  }

  public getRouter(): Router {
    return this.router;
  }
}
