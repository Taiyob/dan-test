import { BaseService } from "@/core/BaseService";
import { AppLogger } from "@/core/logging/logger";
import { ConflictError, NotFoundError } from "@/core/errors/AppError";
import { Employee, PrismaClient } from "@prisma/client";
import { AddEmployeeInput, EmployeeListQuery } from "./employee.validation";

export class EmployeeService extends BaseService<Employee> {
  private readonly SALT_ROUNDS = 12;

  constructor(prisma: PrismaClient) {
    super(prisma, "Employee", {
      enableSoftDelete: true,
      enableAuditFields: true,
    });
  }

  protected getModel() {
    return this.prisma.employee;
  }

  /**
   * Create a new employee
   */
  // src/modules/Employee/employee.service.ts

  async createEmployee(data: AddEmployeeInput & { avatarUrl?: string }): Promise<Employee> {
      const { email, avatarUrl, ...rest } = data;

      const existingEmployee = await this.findOne({ email });
      if (existingEmployee) {
          throw new Error("Employee with this email already exists");
      }

      const newEmployee = await this.create({
          ...rest,
          email,
          ...(avatarUrl && { avatarUrl }) 
      });

      return newEmployee;
  }
  // async createEmployee(data: AddEmployeeInput & { avatarUrl?: string }): Promise<Employee> {
  //   const { firstName, lastName, email, phone, employeeId, role, additionalNotes, employerId } = data;

  //   const existingEmployee = await this.findOne({ email });
  //   if (existingEmployee) {
  //     AppLogger.warn(`Employee with email ${email} already exists.`);
  //     throw new ConflictError("Employee with this email already exists");
  //   }

  //   AppLogger.info(`Creating new Employee: ${email}`);

  //   const newEmployee = await this.create({
  //     firstName,
  //     lastName,
  //     email,
  //     phone,
  //     employeeId,
  //     role,
  //     additionalNotes,
  //     employerId,
  //   });

  //   AppLogger.info(`New Employee created: ${newEmployee.email} (ID: ${newEmployee.id})`);

  //   return newEmployee;
  // }

  /**
   * Get all employees with optional filtering, search, and pagination
   */
  async getEmployees(query: EmployeeListQuery) {
    const { page = 1, limit = 10, search, role, sortBy = "createdAt", sortOrder = "desc", ...rest } = query;

    // Base filters
    let filters: any = { ...this.buildWhereClause(rest) };

    // Role filter
    if (role) {
      filters.role = role;
    }

    // Search filter
    if (search) {
      filters.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    // Pagination
    const offset = (page - 1) * limit;

    // Fetch data
    const result = await this.findMany(
      filters,
      { page, limit, offset },
      { [sortBy]: sortOrder },
      {} // include relations if needed
    );

    AppLogger.info(`🎉 Employees found: ${result.data.length}`);

    return result;
  }

  /**
 * Get employees by employer (logged-in user)
 */
  async getEmployeesByEmployer(
    employerId: string,
    query: EmployeeListQuery
  ) {
    const {
      page = 1,
      limit = 10,
      search,
      role,
      sortBy = "createdAt",
      sortOrder = "desc",
      ...rest
    } = query;

    let filters: any = {
      employerId, // 🔥 MAIN FILTER
      ...this.buildWhereClause(rest),
    };

    if (role) {
      filters.role = role;
    }

    if (search) {
      filters.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    const offset = (page - 1) * limit;

    return this.findMany(
      filters,
      { page, limit, offset },
      { [sortBy]: sortOrder },
      {}
    );
}

  /**
   * Get an Employee by ID
   */
  async getEmployeeById(id: string): Promise<Employee | null> {
    const employee = await this.findById(id);
    if (!employee) throw new NotFoundError("Employee");
    return employee;
  }

  /**
   * Update an Employee by ID
   */
  async updateEmployee(id: string, data: Partial<AddEmployeeInput>): Promise<Employee> {
    const employee = await this.exists({ id });
    if (!employee) throw new NotFoundError("Employee");

    const updatedEmployee = await this.updateById(id, data);

    AppLogger.info(`Employee updated: ${updatedEmployee.email} (ID: ${updatedEmployee.id})`);
    return updatedEmployee;
  }

  /**
   * Soft delete an Employee by ID
   */
  async deleteEmployee(id: string): Promise<Employee> {
    const employee = await this.exists({ id });
    if (!employee) throw new NotFoundError("Employee");

    const deletedEmployee = await this.deleteById(id);

    AppLogger.info(`Employee deleted: ${deletedEmployee.email} (ID: ${deletedEmployee.id})`);
    return deletedEmployee;
  }
}
