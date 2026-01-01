import { BaseController } from "@/core/BaseController";
import { Request, Response } from "express";
import { TestimonialService } from "./testimonial.service";
import { HTTPStatusCode } from "@/types/HTTPStatusCode";

// ---------------------------------------------
// ✅ Testimonial Controller
// ---------------------------------------------
export class TestimonialController extends BaseController {
  constructor(private testimonialService: TestimonialService) {
    super();
  }

  /**
   * Create a new Testimonial
   * POST /api/testimonials
   */
  public createTestimonial = async (req: Request, res: Response) => {
    const body = req.validatedBody || req.body;
    this.logAction("createTestimonial", req, { body });

    const result = await this.testimonialService.createTestimonial(body);
    return this.sendCreatedResponse(
      res,
      result,
      "Testimonial created successfully"
    );
  };

  /**
   * Get all Testimonials
   * GET /api/testimonials
   */
  public getAllTestimonials = async (req: Request, res: Response) => {
    const query = req.validatedQuery || req.query;
    const result = await this.testimonialService.getTestimonials(query);

    this.logAction("getAllTestimonials", req, { count: result.data.length });

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
      "Testimonials retrieved successfully",
      result.data
    );
  };

  /**
   * Get a Testimonial by ID
   * GET /api/testimonials/:id
   */
  public getTestimonialById = async (req: Request, res: Response) => {
    const { id } = req.validatedParams || req.params;
    this.logAction("getTestimonialById", req, { id });

    const result = await this.testimonialService.getTestimonialById(id);
    return this.sendResponse(
      res,
      "Testimonial retrieved successfully",
      HTTPStatusCode.OK,
      result
    );
  };

  /**
   * Update a Testimonial by ID
   * PATCH /api/testimonials/:id
   */
  public updateTestimonialById = async (req: Request, res: Response) => {
    const params = req.validatedParams || req.params;
    const body = req.validatedBody || req.body;
    const { id } = params;
    this.logAction("updateTestimonialById", req, { id, body });

    const result = await this.testimonialService.updateTestimonial(id, body);
    return this.sendResponse(
      res,
      "Testimonial updated successfully",
      HTTPStatusCode.OK,
      result
    );
  };

  /**
   * Delete a Testimonial by ID
   * DELETE /api/testimonials/:id
   */
  public deleteTestimonial = async (req: Request, res: Response) => {
    const params = req.validatedParams || req.params;
    const { id } = params;
    this.logAction("deleteTestimonial", req, { id });

    const result = await this.testimonialService.deleteTestimonial(id);
    return this.sendResponse(
      res,
      "Testimonial deleted successfully",
      HTTPStatusCode.OK,
      result
    );
  };
}