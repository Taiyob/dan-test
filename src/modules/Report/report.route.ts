// fileName: report.route.ts
// import { Router, Request, Response } from "express";
// import { asyncHandler } from "@/middleware/asyncHandler";
// import { validateRequest } from "@/middleware/validation";
// import { ReportController } from "./report.controller";
// import { ReportValidation } from "./report.validation";

// export class ReportRoutes {
//   private router: Router;
//   private reportController: ReportController;

//   constructor(reportController: ReportController) {
//     this.router = Router();
//     this.reportController = reportController;
//     this.initializeRoutes();
//   }

//   private initializeRoutes(): void {
//     this.router.post(
//       "/",
//       validateRequest({ body: ReportValidation.body.addReport }),
//       asyncHandler((req: Request, res: Response) => this.reportController.createReport(req, res))
//     );

//     this.router.get(
//       "/",
//       validateRequest({ query: ReportValidation.query.list }),
//       asyncHandler((req: Request, res: Response) => this.reportController.getAllReports(req, res))
//     );

//     this.router.get(
//       "/:id",
//       validateRequest({ params: ReportValidation.params.id }),
//       asyncHandler((req: Request, res: Response) => this.reportController.getReportById(req, res))
//     );

//     this.router.patch(
//       "/:id",
//       validateRequest({
//         params: ReportValidation.params.id,
//         body: ReportValidation.body.updateReport,
//       }),
//       asyncHandler((req: Request, res: Response) => this.reportController.updateReport(req, res))
//     );

//     this.router.delete(
//       "/:id",
//       validateRequest({ params: ReportValidation.params.id }),
//       asyncHandler((req: Request, res: Response) => this.reportController.deleteReport(req, res))
//     );
//   }

//   public getRouter(): Router {
//     return this.router;
//   }
// }

import { Router, Request, Response } from "express";
import { asyncHandler } from "@/middleware/asyncHandler";
import { validateRequest } from "@/middleware/validation";
import { ReportController } from "./report.controller";
import { ReportValidation } from "./report.validation";
import { authenticate } from "@/middleware/auth";

export class ReportRoutes {
  private router: Router;
  private reportController: ReportController;

  constructor(reportController: ReportController) {
    this.router = Router();
    this.reportController = reportController;
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Generate report data
    this.router.post(
      "/inspection-due",
      authenticate,
      validateRequest({ body: ReportValidation.body.generateReport }),
      asyncHandler((req: Request, res: Response) => this.reportController.generateInspectionReport(req, res))
    );

    // Export to PDF
    this.router.post(
      "/export/pdf",
      authenticate,
      validateRequest({ body: ReportValidation.body.generateReport }),
      asyncHandler((req: Request, res: Response) => this.reportController.exportPDF(req, res))
    );

    // Export to CSV
    this.router.post(
      "/export/csv",
      authenticate,
      validateRequest({ body: ReportValidation.body.generateReport }),
      asyncHandler((req: Request, res: Response) => this.reportController.exportCSV(req, res))
    );
  }

  public getRouter(): Router {
    return this.router;
  }
}
