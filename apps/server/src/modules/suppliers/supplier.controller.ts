import type { Request, Response } from 'express';
import type { ListPage, SupplierDetail, SupplierListItem } from '@app/shared';
import { sendSuccess } from '../../utils/sendSuccess';
import { getSupplier, listSuppliers } from './supplier.service';
import type { SupplierIdParams, SupplierListQueryInput } from './supplier.validation';

export const supplierController = {
  async list(req: Request, res: Response): Promise<void> {
    const criteria = req.query as unknown as SupplierListQueryInput;
    sendSuccess<ListPage<SupplierListItem>>(res, await listSuppliers(criteria));
  },

  async get(req: Request, res: Response): Promise<void> {
    const { id } = req.params as SupplierIdParams;
    sendSuccess<SupplierDetail>(res, await getSupplier(id));
  },
};
