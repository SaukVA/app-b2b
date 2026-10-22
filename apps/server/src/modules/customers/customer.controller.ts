import type { Request, Response } from 'express';
import type { CustomerListItem, ListPage } from '@app/shared';
import { sendSuccess } from '../../utils/sendSuccess';
import { listCustomers } from './customer.service';
import type { CustomerListQueryInput } from './customer.validation';

export const customerController = {
  async list(req: Request, res: Response): Promise<void> {
    const criteria = req.query as unknown as CustomerListQueryInput;
    sendSuccess<ListPage<CustomerListItem>>(res, await listCustomers(criteria));
  },
};
