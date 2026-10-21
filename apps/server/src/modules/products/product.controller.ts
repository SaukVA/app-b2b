import type { Request, Response } from 'express';
import type { ListPage, ProductListItem } from '@app/shared';
import { sendSuccess } from '../../utils/sendSuccess';
import { listProducts } from './product.service';
import type { ProductListQueryInput } from './product.validation';

export const productController = {
  async list(req: Request, res: Response): Promise<void> {
    const criteria = req.query as unknown as ProductListQueryInput;
    sendSuccess<ListPage<ProductListItem>>(res, await listProducts(criteria));
  },
};
