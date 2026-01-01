import { BaseService } from "@/core/BaseService";
import { AppLogger } from "@/core/logging/logger";
import { NotFoundError } from "@/core/errors/AppError";
import { EmployeeCertification, PrismaClient } from "@prisma/client";
import {
  AddEmployeeCertificationInput,
  EmployeeCertificationListQuery,
  UpdateEmployeeCertificationInput,
} from "./employeeCertification.validation";

export class EmployeeCertificationService extends BaseService<EmployeeCertification> {
  constructor(prisma: PrismaClient) {
    super(prisma, "EmployeeCertification", {
      enableSoftDelete: true,
      enableAuditFields: true,
    });
  }

  protected getModel() {
    return this.prisma.employeeCertification;
  }

  /**
   * Create a new employee certification (assign a cert to an employee)
   */
  async createEmployeeCert(
    data: AddEmployeeCertificationInput
  ): Promise<EmployeeCertification> {
    // Check if Employee exists
    const employee = await this.prisma.employee.findUnique({
      where: { id: data.employeeId },
    });
    if (!employee) {
      throw new NotFoundError("Employee not found");
    }

    // Check if CertificationTemplate exists
    const template = await this.prisma.certificationTemplate.findUnique({
      where: { id: data.certificationTemplateId },
    });
    if (!template) {
      throw new NotFoundError("CertificationTemplate not found");
    }

    AppLogger.info(
      `Assigning cert ${data.certificationTemplateId} to employee ${data.employeeId}`
    );
    const newEmployeeCert = await this.create(data);
    return newEmployeeCert;
  }

  /**
   * Get all employee certifications with filtering and pagination
   */
  async getEmployeeCerts(query: EmployeeCertificationListQuery) {
    const {
      page,
      limit,
      sortBy = "createdAt",
      sortOrder = "desc",
      ...rest
    } = query;

    // Filters will contain employeeId or certificationTemplateId
    const filters = this.applyFilters(rest);

    // --- Include related data ---
    const include = {
      employee: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      certificationTemplate: {
        select: { id: true, name: true },
      },
    };

    const result = await this.findMany(
      filters,
      { page, limit, offset: (page - 1) * limit },
      { [sortBy]: sortOrder },
      include
    );

    AppLogger.info(`🎉 EmployeeCertifications found: ${result.data.length}`);
    return result;
  }

  /**
   * Get an employee certification by ID
   */
  async getEmployeeCertById(id: string): Promise<EmployeeCertification | null> {
    const employeeCert = await this.prisma.employeeCertification.findUnique({
      where: { id, isDeleted: false },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        certificationTemplate: {
          select: { id: true, name: true },
        },
      },
    });

    if (!employeeCert) {
      throw new NotFoundError("EmployeeCertification");
    }
    return employeeCert;
  }

  /**
   * Update an employee certification by ID
   */
  async updateEmployeeCert(
    id: string,
    data: UpdateEmployeeCertificationInput
  ): Promise<EmployeeCertification> {
    const employeeCert = await this.exists({ id });
    if (!employeeCert) {
      throw new NotFoundError("EmployeeCertification");
    }
    const updatedEmployeeCert = await this.updateById(id, data);
    AppLogger.info(`EmployeeCert updated: (ID: ${updatedEmployeeCert.id})`);
    return updatedEmployeeCert;
  }

  /**
   * Soft Delete an employee certification by ID
   */
  async deleteEmployeeCert(id: string): Promise<EmployeeCertification> {
    const employeeCert = await this.exists({ id });
    if (!employeeCert) {
      throw new NotFoundError("EmployeeCertification");
    }
    const deletedEmployeeCert = await this.deleteById(id);
    AppLogger.info(`EmployeeCert deleted: (ID: ${deletedEmployeeCert.id})`);
    return deletedEmployeeCert;
  }
}