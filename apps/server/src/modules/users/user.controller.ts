import type { Request, Response } from 'express';
import type { CreateUserResponse } from '@app/shared';
import { AppError } from '../../utils/AppError';
import { sendSuccess } from '../../utils/sendSuccess';
import { createUser, type UserRef } from './user.service';
import type { CreateUserInput } from './user.validation';

// Controlador HTTP de Ajustes › Usuarios. Los handlers llegan con cada historia (US1–US5); las respuestas
// usan sendSuccess (utils/sendSuccess.ts) y los errores, AppError.

/** Quien hace la petición; lo deja requireAuth, montado en todo el router. */
function actorOf(req: Request): UserRef {
  if (!req.auth) throw new AppError('AUTH_UNAUTHENTICATED', 401, 'Inicia sesión para continuar.');
  return { id: req.auth.userId, login: req.auth.login };
}

export const userController = {
  async create(req: Request, res: Response): Promise<void> {
    const result = await createUser(req.body as CreateUserInput, actorOf(req));
    sendSuccess<CreateUserResponse>(res, result, 201);
  },
};
