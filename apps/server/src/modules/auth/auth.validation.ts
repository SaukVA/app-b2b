import { z } from 'zod';

export const loginSchema = z.object({
  login: z.string().trim().min(1),
  password: z.string().min(1),
  persistent: z.boolean(),
  client: z.enum(['web', 'desktop']),
});

export type LoginInput = z.infer<typeof loginSchema>;
