import { z } from 'zod';

export const loginSchema = z.object({
  login: z.string().trim().min(1),
  password: z.string().min(1),
  persistent: z.boolean(),
  client: z.enum(['web', 'desktop']),
});

export type LoginInput = z.infer<typeof loginSchema>;

/** En web el token llega en la cookie y el cuerpo puede venir vacío; en escritorio llega aquí. */
export const refreshSchema = z
  .object({ refreshToken: z.string().min(1).optional() })
  .optional()
  .transform((body) => body ?? {});

export type RefreshInput = z.infer<typeof refreshSchema>;
