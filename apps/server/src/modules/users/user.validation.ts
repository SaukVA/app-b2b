import { z } from 'zod';
import { MIN_PASSWORD_LENGTH, USER_NAME_MAX_LENGTH } from '@app/shared';

// data-model.md › Validación. La existencia del rol la comprueba el servicio (USER_ROLE_NOT_FOUND).

const name = z.string().trim().min(1).max(USER_NAME_MAX_LENGTH);
const email = z.string().trim().toLowerCase().email();
const role = z.string().trim().min(1);
// La contraseña no se recorta: los espacios forman parte de ella.
const password = z.string().min(MIN_PASSWORD_LENGTH);
const status = z.enum(['Activo', 'Bloqueado']);

export const userIdParams = z.object({ id: z.string().regex(/^[a-f0-9]{24}$/) });

export const createUserSchema = z.object({ name, email, role, password });

export const updateUserSchema = z
  .object({ name: name.optional(), email: email.optional(), role: role.optional() })
  .refine((body) => Object.values(body).some((value) => value !== undefined), {
    message: 'Indica al menos un campo: name, email o role',
  });

export const updateStatusSchema = z.object({ status });

export const resetPasswordSchema = z.object({ password });

export type UserIdParams = z.infer<typeof userIdParams>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
