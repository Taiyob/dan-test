import { Router, Request, Response } from "express";
import { TestimonialController } from "./testimonial.controller";
import { validateRequest } from "@/middleware/validation";
import { asyncHandler } from "@/middleware/asyncHandler";
import { TestimonialValidation } from "./testimonial.validation";

// ---------------------------------------------
// ✅ Testimonial Routes
// ---------------------------------------------
export class TestimonialRoutes {
  private router: Router;
  private testimonialController: TestimonialController;

  constructor(testimonialController: TestimonialController) {
    this.router = Router();
    this.testimonialController = testimonialController;
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Create testimonial
    this.router.post(
      "/",
      validateRequest({ body: TestimonialValidation.body.addTestimonial }),
      asyncHandler((req: Request, res: Response) =>
        this.testimonialController.createTestimonial(req, res)
      )
    );

    // Get all testimonials
    this.router.get(
      "/",
      validateRequest({ query: TestimonialValidation.query.list }),
      asyncHandler((req: Request, res: Response) =>
        this.testimonialController.getAllTestimonials(req, res)
      )
    );

    // Get testimonial by ID
    this.router.get(
      "/:id",
      validateRequest({ params: TestimonialValidation.params.id }),
      asyncHandler((req: Request, res: Response) =>
        this.testimonialController.getTestimonialById(req, res)
      )
    );

    // Update testimonial by ID
    this.router.patch(
      "/:id",
      validateRequest({
        params: TestimonialValidation.params.id,
        body: TestimonialValidation.body.updateTestimonial,
      }),
      asyncHandler((req: Request, res: Response) =>
        this.testimonialController.updateTestimonialById(req, res)
      )
    );

    // Delete testimonial by ID
    this.router.delete(
      "/:id",
      validateRequest({ params: TestimonialValidation.params.id }),
      asyncHandler((req: Request, res: Response) =>
        this.testimonialController.deleteTestimonial(req, res)
      )
    );
  }

  public getRouter(): Router {
    return this.router;
  }
}