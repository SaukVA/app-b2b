import type { Request, Response } from 'express';
import type { AppearancePreferences } from '@app/shared';
import { sendSuccess } from '../../utils/sendSuccess';
import { updatePreferences } from './preferences.service';
import type { UpdatePreferencesInput } from './preferences.validation';

// Controlador HTTP de Ajustes › Apariencia: siempre sobre el usuario de la sesión (FR-001).

export const preferencesController = {
  async update(req: Request, res: Response): Promise<void> {
    const { userId, permissions } = req.auth!;
    const body = req.body as UpdatePreferencesInput;
    sendSuccess<AppearancePreferences>(res, await updatePreferences(userId, permissions, body));
  },
};
