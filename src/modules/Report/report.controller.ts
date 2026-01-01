// // fileName: report.controller.ts
// import { Request, Response } from "express";
// import { BaseController } from "@/core/BaseController";
// import { ReportService } from "./report.service";
// import { HTTPStatusCode } from "@/types/HTTPStatusCode";

// export class ReportController extends BaseController {
//   constructor(private reportService: ReportService) {
//     super();
//   }

//   public createReport = async (req: Request, res: Response) => {
//     const body = req.validatedBody || req.body;
//     const result = await this.reportService.createReport(body);
//     return this.sendCreatedResponse(res, result, "Report created successfully");
//   };

//   public getAllReports = async (req: Request, res: Response) => {
//     const query = req.validatedQuery || req.query;
//     const result = await this.reportService.getReports(query);
//     return this.sendPaginatedResponse(
//       res,
//       {
//         page: result.page,
//         limit: result.limit,
//         total: result.total,
//         totalPages: result.totalPages,
//         hasNext: result.hasNext,
//         hasPrevious: result.hasPrevious,
//       },
//       "Reports retrieved successfully",
//       result.data
//     );
//   };

//   public getReportById = async (req: Request, res: Response) => {
//     const { id } = req.validatedParams || req.params;
//     const result = await this.reportService.getReportById(id);
//     return this.sendResponse(
//       res,
//       "Report retrieved successfully",
//       HTTPStatusCode.OK,
//       result
//     );
//   };

//   public updateReport = async (req: Request, res: Response) => {
//     const { id } = req.validatedParams || req.params;
//     const body = req.validatedBody || req.body;
//     const result = await this.reportService.updateReport(id, body);
//     return this.sendResponse(res, "Report updated successfully", HTTPStatusCode.OK, result);
//   };

//   public deleteReport = async (req: Request, res: Response) => {
//     const { id } = req.validatedParams || req.params;
//     const result = await this.reportService.deleteReport(id);
//     return this.sendResponse(res, "Report deleted successfully", HTTPStatusCode.OK, result);
//   };
// }

// report.controller.ts
import { Request, Response } from "express";
import { BaseController } from "@/core/BaseController";
import { ReportService } from "./report.service";
import { HTTPStatusCode } from "@/types/HTTPStatusCode";
import { AuthorizationError } from "@/core/errors/AppError";
import { RequestWithUser } from "@/middleware/auth";


export class ReportController extends BaseController {
  constructor(private reportService: ReportService) {
    super();
  }

  public generateInspectionReport = async (req: RequestWithUser, res: Response) => {
    // Permission check
    if (req.user?.role !== "admin") {
      throw new AuthorizationError("Only admins can generate reports");
    }

    const body = req.validatedBody || req.body;
    const result = await this.reportService.generateReportData(body);
    return this.sendResponse(res, "Report data generated successfully", HTTPStatusCode.OK, result);
  };

  public exportPDF = async (req: RequestWithUser, res: Response) => {
    if (req.user?.role !== "admin") {
      throw new AuthorizationError("Only admins can export reports");
    }

    const body = req.validatedBody || req.body;
    await this.reportService.exportToPDF(body, res);
  };

  public exportCSV = async (req: RequestWithUser, res: Response) => {
    if (req.user?.role !== "admin") {
      throw new AuthorizationError("Only admins can export reports");
    }

    const body = req.validatedBody || req.body;
    await this.reportService.exportToCSV(body, res);
  };
}
