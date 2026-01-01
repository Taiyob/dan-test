import { Request, Response, Router } from "express";
import { asyncHandler } from "@/middleware/asyncHandler";
import { statsController } from "./stats.controller";

export class StatsRoute {
    private router: Router;
    private statsController: statsController;

    constructor(statsController: statsController) {
        this.router = Router();
        this.statsController = statsController;
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        //get overview stats
        this.router.get(
            "/overview-stats", asyncHandler((req: Request, res: Response) =>
                this.statsController.getDashboardStats(req, res)
            )
        );
    }


    public getRouter(): Router {
        return this.router;
    }
}
