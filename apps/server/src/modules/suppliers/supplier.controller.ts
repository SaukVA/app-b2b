import type { Request, Response } from 'express';
import type { AuditUser, ListPage, SupplierDetail, SupplierListItem } from '@app/shared';
import { AppError } from '../../utils/AppError';
import { sendSuccess } from '../../utils/sendSuccess';
import { createSupplier, getSupplier, listSuppliers } from './supplier.service';
import type {
  SupplierIdParams,
  SupplierInputBody,
  SupplierListQueryInput,
} from './supplier.validation';

/** Usuario de la sesión, para la auditoría del proveedor (FR-012b). */
function actorOf(req: Request): AuditUser {
  if (!req.auth) throw new AppError('AUTH_UNAUTHENTICATED', 401, 'Inicia sesión para continuar.');
  return { id: req.auth.userId, login: req.auth.login };
}

export const supplierController = {
  async list(req: Request, res: Response): Promise<void> {
    const criteria = req.query as unknown as SupplierListQueryInput;
    sendSuccess<ListPage<SupplierListItem>>(res, await listSuppliers(criteria));
  },

  async get(req: Request, res: Response): Promise<void> {
    const { id } = req.params as SupplierIdParams;
    sendSuccess<SupplierDetail>(res, await getSupplier(id));
  },

  async create(req: Request, res: Response): Promise<void> {
    const detail = await createSupplier(req.body as SupplierInputBody, actorOf(req));
    sendSuccess<SupplierDetail>(res, detail, 201);
  },
};
