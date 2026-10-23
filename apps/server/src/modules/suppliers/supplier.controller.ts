import type { Request, Response } from 'express';
import type { ListPage, SupplierListItem } from '@app/shared';
import { sendSuccess } from '../../utils/sendSuccess';
import { listSuppliers } from './supplier.service';
import type { SupplierListQueryInput } from './supplier.validation';

export const supplierController = {
  async list(req: Request, res: Response): Promise<void> {
    const criteria = req.query as unknown as SupplierListQueryInput;
    sendSuccess<ListPage<SupplierListItem>>(res, await listSuppliers(criteria));
  },
};
