import type { Request, Response } from 'express';
import type { RoleSummary } from '@app/shared';
import { sendSuccess } from '../../utils/sendSuccess';
import { listRoles } from './role.service';

export const roleController = {
  async list(_req: Request, res: Response): Promise<void> {
    sendSuccess<RoleSummary[]>(res, await listRoles());
  },
};
