import { z } from "zod";
import { stringToNumber } from "@/utils/stringToNumber";

// ---------------------------------------------
// ✅ Testimonial Validation Schema
// ---------------------------------------------
export const TestimonialValidation = {
  //
  // ✅ Params Validation
  //
  params: {
    id: z.object({
      id: z.string().uuid("Invalid testimonial ID"),
    }),
  },

  //
  // ✅ Query Validation (list, search, filters, etc.)
  //
  query: {
    list: z
      .object({
        page: z.preprocess(
          (val) => stringToNumber(val) || 1,
          z.number().int().min(1).default(1)
        ),
        limit: z.preprocess(
          (val) => {
            const num = stringToNumber(val) || 10;
            return Math.min(Math.max(num, 1), 100); // Clamp between 1–100
          },
          z.number().int().min(1).max(100).default(10)
        ),
        // No search specified, following simple pattern
        sortBy: z
          .enum(["id", "rating", "createdAt", "updatedAt"])
          .default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      })
  },

  //
  // ✅ Body Validation (add / update)
  //
  body: {
    addTestimonial: z
      .object({
        review: z
          .string()
          .min(10, "Review must be at least 10 characters")
          .max(1000, "Review must not exceed 1000 characters")
          .trim(),
        rating: z
          .number()
          .int()
          .min(1, "Rating must be at least 1")
          .max(5, "Rating must be at most 5"),
        userId: z.string().uuid("Invalid user ID"), // Following pattern of Client/Employee
      })
      .strict(),

    updateTestimonial: z
      .object({
        review: z
          .string()
          .min(10, "Review must be at least 10 characters")
          .max(1000, "Review must not exceed 1000 characters")
          .trim()
          .optional(),
        rating: z
          .number()
          .int()
          .min(1, "Rating must be at least 1")
          .max(5, "Rating must be at most 5")
          .optional(),
      })
      .strict()
      .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field must be provided for update",
      }),
  },
};

// ---------------------------------------------
// ✅ Type Exports for TS Integration
// ---------------------------------------------
export type TestimonialIdParams = z.infer<typeof TestimonialValidation.params.id>;
export type TestimonialListQuery = z.infer<typeof TestimonialValidation.query.list>;
export type AddTestimonialInput = z.infer<typeof TestimonialValidation.body.addTestimonial>;
export type UpdateTestimonialInput = z.infer<typeof TestimonialValidation.body.updateTestimonial>;