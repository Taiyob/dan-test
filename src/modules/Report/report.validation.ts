// import { z } from "zod";
// import { stringToNumber } from "@/utils/stringToNumber";

// // File info type
// export const FileInfoSchema = z.object({
//   name: z.string().min(1, "File name is required"),
//   url: z.string().url("Invalid file URL"),
//   size: z.number().int().min(0, "Invalid file size").optional(),
//   downloadCount: z.number().int().min(0).optional(), 
// });

// export const ReportValidation = {
//   params: {
//     id: z.object({
//       id: z.string().uuid("Invalid report ID"),
//     }),
//   },

//   query: {
//     list: z
//       .object({
//         page: z.preprocess(
//           (val) => stringToNumber(val) || 1,
//           z.number().int().min(1).default(1)
//         ),
//         limit: z.preprocess(
//           (val) => {
//             const num = stringToNumber(val) || 10;
//             return Math.min(Math.max(num, 1), 100);
//           },
//           z.number().int().min(1).max(100).default(10)
//         ),
//         search: z.string().optional(),
//         type: z.enum(["monthly", "quarterly", "annual", "custom"]).optional(),
//         status: z.enum(["ready", "not_available"]).optional(),
//         sortBy: z
//           .enum([
//             "id",
//             "name",
//             "type",
//             "status",
//             "period",
//             "createdAt",
//             "updatedAt",
//           ])
//           .default("createdAt"),
//         sortOrder: z.enum(["asc", "desc"]).default("desc"),
//       })
//       .transform((data) => ({
//         ...data,
//         search: data.search && data.search.trim() !== "" ? data.search : undefined,
//       })),
//   },

//   body: {
//     addReport: z
//       .object({
//         name: z.string().min(2).max(255),
//         type: z.enum(["monthly", "quarterly", "annual", "custom"]),
//         period: z.string().min(2),
//         sizeBytes: z.number().int().min(0).optional(),
//         fileUrls: z.array(FileInfoSchema).min(1, "At least one file is required"),
//         status: z.enum(["ready", "not_available"]).default("not_available"),
//         clientId: z.string().uuid().optional(),
//         employeeId: z.string().uuid().optional(),
//         uploadedById: z.string().uuid().optional(),
//       })
//       .strict(),

//     updateReport: z
//       .object({
//         name: z.string().min(2).max(255).optional(),
//         type: z.enum(["monthly", "quarterly", "annual", "custom"]).optional(),
//         period: z.string().min(2).optional(),
//         sizeBytes: z.number().int().min(0).optional(),
//         fileUrls: z.array(FileInfoSchema).min(1).optional(),
//         status: z.enum(["ready", "not_available"]).optional(),
//       })
//       .strict()
//       .refine((data) => Object.keys(data).length > 0, {
//         message: "At least one field must be provided for update",
//       }),
//   },
// };

// // TypeScript Types
// export type AddReportInput = z.infer<typeof ReportValidation.body.addReport>;
// export type UpdateReportInput = z.infer<typeof ReportValidation.body.updateReport>;
// export type ReportListQuery = z.infer<typeof ReportValidation.query.list>;
// export type ReportIdParams = z.infer<typeof ReportValidation.params.id>;

// export type FileInfo = z.infer<typeof FileInfoSchema>;

// export type ReportType = {
//   id: string;
//   name: string;
//   type: string;
//   period: string;
//   sizeBytes?: number;
//   fileUrls: FileInfo[];
//   status: string;
//   clientId?: string;
//   employeeId?: string;
//   uploadedById?: string;
//   createdAt: Date;
//   updatedAt: Date;
// };

import { z } from "zod";
import { InspectionType } from "@prisma/client";

export const ReportValidation = {
  body: {
    generateReport: z.object({
      fromDate: z.coerce.date(),
      toDate: z.coerce.date(),
      clientId: z.string().uuid().optional(),
      assetId: z.string().uuid().optional(),
      inspectionType: z.nativeEnum(InspectionType).optional(),
      status: z.enum(["Completed", "Overdue", "Upcoming"]).optional(),
      inspectorId: z.string().uuid().optional(),
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(100).default(10),
      sortBy: z.enum(["dueDate", "clientName", "assetNameId", "inspectionType", "frequency", "status", "completionDate", "assignedInspector"]).default("dueDate"),
      sortOrder: z.enum(["asc", "desc"]).default("asc"),
    }),
  },
};

export type GenerateReportInput = z.infer<typeof ReportValidation.body.generateReport>;