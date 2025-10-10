import { z } from 'zod';

/**
 * Role selection validation schema
 */
export const roleSelectionSchema = z.object({
  role: z.enum(['buyer_seller', 'delivery'])
    .default('buyer_seller')
    .describe('User role: buyer_seller or delivery'),
});

/**
 * Delivery code validation schema (required only for delivery role)
 */
export const deliveryCodeSchema = z.object({
  delivery_code: z.string()
    .min(8, 'Delivery code must be at least 8 characters')
    .max(20, 'Delivery code must be less than 20 characters')
});

/**
 * Academic information validation schema (optional fields)
 */
export const academicInfoSchema = z.object({
  university: z.string()
    .min(2, 'University name must be at least 2 characters')
    .max(255, 'University name too long')
    .optional()
    .or(z.literal('')),
  program: z.string()
    .min(2, 'Program name must be at least 2 characters')
    .max(255, 'Program name too long')
    .optional()
    .or(z.literal('')),
  graduation_year: z.union([
    z.number()
      .int()
      .min(1900, 'Invalid graduation year')
      .max(2100, 'Invalid graduation year')
      .optional(),
    z.string().length(0) // Allow empty string
  ]).optional()
});

// ✅ Step 1 - UPDATED: Replaced address with hall_of_residence and added room_number
export const registerStep1Schema = z.object({
  // Existing personal information fields
  first_name: z.string().min(1, { message: 'First name is required' }),
  last_name: z.string().min(1, { message: 'Last name is required' }),
  student_id: z.string().min(1, { message: 'Student ID is required' }),
  email: z.string()
    .email({ message: 'Invalid email format' }),
  phone: z.string().min(10, { message: 'Phone number must be at least 10 digits' }),
  gender: z.enum(['Male', 'Female', 'Other'], { required_error: 'Gender is required' }),
  date_of_birth: z.string().min(1, { message: 'Date of birth is required' }),
  
  // CHANGED: address → hall_of_residence
  hall_of_residence: z.string().min(1, { message: 'Hall of residence is required' }),
  
  // NEW: Room number field (optional)
  room_number: z.string().optional().or(z.literal('')),
  
  // Role selection field
  role: z.enum(['buyer_seller', 'delivery'])
    .default('buyer_seller'),
  
  // Delivery code (completely optional in base schema)
  delivery_code: z.string().optional().or(z.literal('')),
  
  // Academic information (optional)
  university: z.string()
    .min(2, 'University name must be at least 2 characters')
    .max(255, 'University name too long')
    .optional()
    .or(z.literal('')),
  program: z.string()
    .min(2, 'Program name must be at least 2 characters')
    .max(255, 'Program name too long')
    .optional()
    .or(z.literal('')),
  graduation_year: z.union([
    z.number()
      .int()
      .min(1900, 'Invalid graduation year')
      .max(2100, 'Invalid graduation year')
      .optional(),
    z.string().length(0) // Allow empty string
  ]).optional()
  
}).superRefine((data, ctx) => {
  // Conditional validation for delivery code
  if (data.role === 'delivery') {
    if (!data.delivery_code || data.delivery_code.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Delivery access code is required for delivery role',
        path: ['delivery_code']
      });
    } else if (data.delivery_code.length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Delivery code must be at least 8 characters',
        path: ['delivery_code']
      });
    }
  }
  
  // For buyer_seller role, delivery_code should be empty or undefined
  if (data.role === 'buyer_seller' && data.delivery_code && data.delivery_code.trim().length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Delivery code should not be provided for buyer/seller role',
      path: ['delivery_code']
    });
  }
});

// ✅ Step 2 — No changes needed (password confirmation only)
export const registerStep2Schema = z.object({
  password: z.string().min(6, { message: 'Password must be at least 6 characters long' }),
  confirmPassword: z.string().min(6, { message: 'Confirm Password must be at least 6 characters long' }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Type definitions for TypeScript
export type RegisterStep1Input = z.infer<typeof registerStep1Schema>;
export type RegisterStep2Input = z.infer<typeof registerStep2Schema>;
export type RoleSelectionInput = z.infer<typeof roleSelectionSchema>;
export type DeliveryCodeInput = z.infer<typeof deliveryCodeSchema>;
export type AcademicInfoInput = z.infer<typeof academicInfoSchema>;

/**
 * Helper function to validate delivery code separately
 * Useful for real-time validation in the UI
 */
export const validateDeliveryCode = (code: string): { isValid: boolean; message: string } => {
  try {
    deliveryCodeSchema.shape.delivery_code.parse(code);
    return { isValid: true, message: 'Valid delivery code format' };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, message: error.errors[0].message };
    }
    return { isValid: false, message: 'Invalid delivery code' };
  }
};

/**
 * Helper function to validate role selection
 */
export const validateRoleSelection = (role: string): { isValid: boolean; message: string } => {
  try {
    roleSelectionSchema.shape.role.parse(role);
    return { isValid: true, message: 'Valid role selection' };
  } catch (error) {
    return { isValid: false, message: 'Invalid role selection' };
  }
};