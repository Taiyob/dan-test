import { BaseService } from "@/core/BaseService";
import { AppLogger } from "@/core/logging/logger";
import { NotFoundError, ConflictError } from "@/core/errors/AppError";

import { PrismaClient, Testimonial } from "@prisma/client";
import {
  AddTestimonialInput,
  TestimonialListQuery,
  UpdateTestimonialInput,
} from "./testimonial.validation";

// ---------------------------------------------
// ✅ Testimonial Service
// ---------------------------------------------

export class TestimonialService extends BaseService<Testimonial> {
  constructor(prisma: PrismaClient) {
    super(prisma, "Testimonial", {
      enableSoftDelete: false,
      enableAuditFields: true,
    });
  }

  protected getModel() {
    return this.prisma.testimonial;
  }

  /**
   * Create a new Testimonial
   */

  async createTestimonial(data: AddTestimonialInput): Promise<Testimonial> {
    const { userId } = data;

    // Check if this user already submitted a testimonial
    // This follows the conflict check pattern in your other services
    
    const existing = await this.findOne({ userId });
    if (existing) {
      throw new ConflictError("This user has already submitted a testimonial");
    }

    AppLogger.info(`Creating Testimonial for user ${userId}`);
    const testimonial = await this.create(data);
    AppLogger.info(`Testimonial created (ID: ${testimonial.id})`);
    return testimonial;
  }

  /**
   * Get all Testimonials with optional filtering and pagination
   */
  async getTestimonials(query: TestimonialListQuery) {
    const {
      page,
      limit,
      sortBy = "createdAt",
      sortOrder = "desc",
      ...rest
    } = query;

    let filters: any = {};

    // Add filters for any query params defined in validation
    filters = this.mergeFilters(filters, this.applyFilters(rest));

    const result = await this.findMany(
      filters,
      { page, limit, offset: (page - 1) * limit },
      { [sortBy]: sortOrder },
      {} // No includes, following simple pattern
    );

    AppLogger.info(`Testimonials found: ${result.data.length}`);
    return result;
  }

  /**
   * Get a Testimonial by ID
   */
  async getTestimonialById(id: string): Promise<Testimonial> {
    const testimonial = await this.findById(id);
    if (!testimonial) throw new NotFoundError("Testimonial");
    return testimonial;
  }

  /**
   * Update a Testimonial by ID
   */
  async updateTestimonial(
    id: string,
    data: UpdateTestimonialInput
  ): Promise<Testimonial> {
    const exists = await this.exists({ id });
    if (!exists) throw new NotFoundError("Testimonial");

    const updated = await this.updateById(id, data);
    AppLogger.info(`Testimonial updated (ID: ${updated.id})`);
    return updated;
  }

  /**
   * Delete a Testimonial by ID
   */
  async deleteTestimonial(id: string): Promise<Testimonial> {
    const exists = await this.exists({ id });
    if (!exists) throw new NotFoundError("Testimonial");
    const deleted = await this.deleteById(id);
    AppLogger.info(`Testimonial deleted (ID: ${deleted.id})`);
    return deleted;
  }
}
