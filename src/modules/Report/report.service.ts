// import { BaseService } from "@/core/BaseService";
// import { PrismaClient, Report } from "@prisma/client";
// import { AppLogger } from "@/core/logging/logger";
// import { AddReportInput, ReportListQuery } from "./report.validation";
// import { NotFoundError } from "@/core/errors/AppError";

// export class ReportService extends BaseService<Report> {
//   constructor(prisma: PrismaClient) {
//     super(prisma, "Report", { enableSoftDelete: true, enableAuditFields: true });
//   }

//   protected getModel() {
//     return this.prisma.report;
//   }

//   /** Create a single report (supports multiple files) */
//   async createReport(data: AddReportInput): Promise<Report> {
//     // Initialize downloadCount = 0 for each file
//     const filesWithDownloadCount = data.fileUrls.map(file => ({
//       ...file,
//       downloadCount: 0,
//     }));

//     const newReport = await this.create({
//       name: data.name,
//       type: data.type,
//       period: data.period,
//       sizeBytes: data.sizeBytes,
//       fileUrls: filesWithDownloadCount as any, 
//       status: data.status,
//       clientId: data.clientId,
//       employeeId: data.employeeId,
//       uploadedById: data.uploadedById,
//     });

//     AppLogger.info(`Report created: ${newReport.name}`);
//     return newReport;
//   }

//   /** Get all reports with pagination & filters */
//   async getReports(query: ReportListQuery) {
//     const {
//       page = 1,
//       limit = 10,
//       search,
//       type,
//       status,
//       sortBy = "createdAt",
//       sortOrder = "desc",
//     } = query;

//     const filters: any = {};

//     if (search) {
//       filters.OR = [
//         { name: { contains: search, mode: "insensitive" } },
//         { period: { contains: search, mode: "insensitive" } },
//       ];
//     }

//     if (type) filters.type = type;
//     if (status) filters.status = status;

//     const offset = (page - 1) * limit;
//     const result = await this.findMany(filters, { page, limit, offset }, { [sortBy]: sortOrder });

//     AppLogger.info(`📄 Reports fetched: ${result.data.length}`);
//     return result;
//   }

//   /** Get report by ID */
//   async getReportById(id: string): Promise<Report> {
//     const report = await this.findById(id);
//     if (!report) throw new NotFoundError("Report");
//     return report;
//   }

//   /** Update report (supports multiple files) */
//   async updateReport(id: string, data: Partial<AddReportInput>): Promise<Report> {
//     const exists = await this.exists({ id });
//     if (!exists) throw new NotFoundError("Report");

//     // Optional: Ensure downloadCount persists for updated files
//     if (data.fileUrls) {
//       data.fileUrls = data.fileUrls.map(file => ({
//         downloadCount: 0,
//         ...file,
//       }));
//     }

//     const updated = await this.updateById(id, data);
//     AppLogger.info(`📝 Report updated: ${updated.name}`);
//     return updated;
//   }

//   /** Soft delete report */
//   async deleteReport(id: string): Promise<Report> {
//     const exists = await this.exists({ id });
//     if (!exists) throw new NotFoundError("Report");

//     const deleted = await this.deleteById(id);
//     AppLogger.info(`🗑️ Report deleted: ${deleted.name}`);
//     return deleted;
//   }
// }

import { BaseService } from "@/core/BaseService";
import { PrismaClient, InspectionType, Inspection } from "@prisma/client";
import { AppLogger } from "@/core/logging/logger";
import { GenerateReportInput } from "./report.validation";
import { NotFoundError } from "@/core/errors/AppError";
import { Parser } from "json2csv";
import PDFDocument from "pdfkit";
import { Response } from "express";

export class ReportService extends BaseService {
  constructor(prisma: PrismaClient) {
    super(prisma, "Inspection", { enableSoftDelete: true, enableAuditFields: true });
  }

  protected getModel() {
    return this.prisma.inspection;
  }

  private calculateStatus(inspection: Inspection & { completedAt: Date | null }, now: Date): string {
    if (!inspection.dueDate) return "Upcoming"; // safety

    const due = new Date(inspection.dueDate);
    const completed = inspection.completedAt ? new Date(inspection.completedAt) : null;

    if (completed && completed <= due) return "Completed";
    if (due < now && !completed) return "Overdue";
    return "Upcoming";
  }

  private mapFrequency(type: InspectionType): string {
  switch (type) {
    case "monthly":
      return "Monthly";
    case "quarterly":
      return "Quarterly";
    case "semi_annual":
      return "Semi-Annual";
    case "annual":
      return "Annual";
    default:
      return "Custom";
  }
}

  async generateReportData(input: GenerateReportInput) {
    const now = new Date();

    const baseWhere: any = {
      dueDate: {
        gte: input.fromDate,
        lte: input.toDate,
      },
      isDeleted: false,
    };

    if (input.clientId) baseWhere.clientId = input.clientId;
    if (input.assetId) baseWhere.assetId = input.assetId;
    if (input.inspectionType) baseWhere.inspectionType = input.inspectionType;
    if (input.inspectorId) {
      baseWhere.inspectors = { some: { employeeId: input.inspectorId } };
    }

    const inspections = await this.prisma.inspection.findMany({
      where: baseWhere,
      include: {
        client: { select: { company: true } },
        asset: { select: { name: true, serialNo: true } },
        inspectors: {
          include: {
            employee: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { dueDate: input.sortOrder },
    });

    const enriched = inspections.map(i => ({
      ...i,
      calculatedStatus: this.calculateStatus(i, now),
    }));

    // status filter
    const filtered = input.status
      ? enriched.filter(i => i.calculatedStatus === input.status)
      : enriched;

    // summary
    const summary = {
      total: filtered.length,
      completed: filtered.filter(i => i.calculatedStatus === "Completed").length,
      overdue: filtered.filter(i => i.calculatedStatus === "Overdue").length,
      upcoming: filtered.filter(i => i.calculatedStatus === "Upcoming").length,
    };

    // pagination (client-side)
    const start = (input.page - 1) * input.limit;
    const pageData = filtered.slice(start, start + input.limit);

    // format
    const formatted = pageData.map(i => ({
      clientName: i.client.company,
      assetNameId: `${i.asset.name || "Unknown"} / ${i.asset.serialNo || "N/A"}`,
      inspectionType: i.inspectionType,
      frequency: this.mapFrequency(i.inspectionType),
      dueDate: i.dueDate!.toISOString(),
      status: i.calculatedStatus,
      completionDate: i.completedAt ? i.completedAt.toISOString() : "",
      assignedInspector:
        i.inspectors.map(ie => `${ie.employee.firstName} ${ie.employee.lastName}`).join(", ") ||
        "Not Assigned",
    }));

    return {
      summary,
      data: formatted,
      pagination: {
        page: input.page,
        limit: input.limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / input.limit),
        hasNext: start + input.limit < filtered.length,
        hasPrevious: input.page > 1,
      },
    };
  }

  async exportToCSV(input: GenerateReportInput, res: Response) {
    // Get full data without pagination
    const fullInput = { ...input, page: 1, limit: Infinity };
    const { data, summary } = await this.generateReportData(fullInput);

    const fields = [
      "clientName",
      "assetNameId",
      "inspectionType",
      "frequency",
      "dueDate",
      "status",
      "completionDate",
      "assignedInspector",
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(data);

    res.header("Content-Type", "text/csv");
    res.attachment(`inspection-due-report-${input.fromDate.toISOString()}-${input.toDate.toISOString()}.csv`);
    res.send(csv);
  }

  async exportToPDF(input: GenerateReportInput, res: Response) {
    try {
        const fullInput = { ...input, page: 1, limit: 10000 }; 
        const { data, summary } = await this.generateReportData(fullInput);

        const doc = new PDFDocument({ 
            margin: 30, 
            size: 'A4', 
            layout: 'landscape' 
        });

        const fileName = `inspection-report-${Date.now()}.pdf`;
        res.writeHead(200, {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename=${fileName}`,
        });

        doc.pipe(res);

        doc.fontSize(20).font("Helvetica-Bold").text("Inspection Due Date Report", { align: "center" });
        doc.fontSize(10).font("Helvetica").text(`Date Range: ${input.fromDate.toDateString()} to ${input.toDate.toDateString()}`, { align: "center" });
        doc.moveDown(1);

        doc.fontSize(12).font("Helvetica-Bold").text("Summary:");
        doc.fontSize(10).font("Helvetica");
        doc.text(`Total Inspections: ${summary.total}`);
        doc.text(`Completed: ${summary.completed} | Overdue: ${summary.overdue} | Upcoming: ${summary.upcoming}`);
        doc.moveDown(2);

        const startX = 30;
        let currentY = doc.y;

        const colWidths = [110, 130, 90, 80, 80, 70, 80, 100]; 
        const columns = [
            "Client Name", "Asset Name/ID", "Type", "Frequency", 
            "Due Date", "Status", "Comp. Date", "Inspector"
        ];

        doc.fontSize(10).font("Helvetica-Bold");
        let headerX = startX;
        columns.forEach((col, index) => {
            doc.text(col, headerX, currentY, { width: colWidths[index] });
            headerX += colWidths[index];
        });

        doc.moveTo(startX, currentY + 15).lineTo(780, currentY + 15).stroke();
        currentY += 25;

        doc.font("Helvetica").fontSize(9);

        if (data.length === 0) {
            doc.text("No data found for the selected range.", startX, currentY);
        } else {
            data.forEach((row) => {
                if (currentY > 500) { 
                    doc.addPage({ layout: 'landscape', margin: 30 });
                    currentY = 40; 
                    
                    let tempX = startX;
                    doc.font("Helvetica-Bold");
                    columns.forEach((col, index) => {
                        doc.text(col, tempX, currentY, { width: colWidths[index] });
                        tempX += colWidths[index];
                    });
                    doc.moveTo(startX, currentY + 15).lineTo(780, currentY + 15).stroke();
                    doc.font("Helvetica").fontSize(9);
                    currentY += 25;
                }

                let x = startX;

                doc.text(row.clientName || "N/A", x, currentY, { width: colWidths[0], height: 20, ellipsis: true }); 
                x += colWidths[0];
                doc.text(row.assetNameId || "N/A", x, currentY, { width: colWidths[1], height: 20, ellipsis: true }); 
                x += colWidths[1];
                doc.text(row.inspectionType || "N/A", x, currentY, { width: colWidths[2] }); 
                x += colWidths[2];
                doc.text(row.frequency || "N/A", x, currentY, { width: colWidths[3] }); 
                x += colWidths[3];
                doc.text(new Date(row.dueDate).toLocaleDateString(), x, currentY, { width: colWidths[4] }); 
                x += colWidths[4];
                doc.text(row.status || "N/A", x, currentY, { width: colWidths[5] }); 
                x += colWidths[5];
                doc.text(row.completionDate ? new Date(row.completionDate).toLocaleDateString() : "-", x, currentY, { width: colWidths[6] }); 
                x += colWidths[6];
                doc.text(row.assignedInspector || "N/A", x, currentY, { width: colWidths[7], height: 20, ellipsis: true });

                currentY += 25; 
            });
        }

        doc.end();
    } catch (error) {
        AppLogger.error("PDF Generation Error:", error);
        if (!res.headersSent) {
            res.status(500).json({ message: "Failed to generate PDF" });
        }
    }
  }

}
