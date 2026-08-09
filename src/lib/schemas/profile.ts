import { z } from "zod";

export const profileFormSchema = z.object({
  display_name: z
    .string()
    .min(1, "Display name is required")
    .max(100, "Display name must be at most 100 characters")
    .trim(),
  bio: z
    .string()
    .max(500, "Bio must be at most 500 characters")
    .trim()
    .optional()
    .or(z.literal("")),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
