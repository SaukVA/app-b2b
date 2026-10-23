import type { FilterQuery } from 'mongoose';
import {
  PRODUCTS_PAGE_SIZE,
  productStatus,
  type ListPage,
  type ProductListItem,
  type ProductListQuery,
} from '@app/shared';
import { pageSkip, searchPattern } from '../../utils/listQuery';
import '../suppliers/supplier.model';
import { ProductModel, type ProductFields } from './product.model';

type ProductRow = Omit<ProductFields, 'supplier'> & {
  _id: unknown;
  supplier: { name: string } | null;
};

const OBJECT_ID = /^[0-9a-f]{24}$/i;

/** Un proveedor que no es un ObjectId no puede coincidir con nada: `null` = página vacía (FR-009). */
function productFilter(criteria: ProductListQuery): FilterQuery<ProductFields> | null {
  if (criteria.supplier && !OBJECT_ID.test(criteria.supplier)) return null;
  const filter: FilterQuery<ProductFields> = {};
  const pattern = searchPattern(criteria.q);
  if (pattern) filter.$or = [{ code: pattern }, { name: pattern }];
  if (criteria.category) filter.categoryId = criteria.category;
  if (criteria.subcategory) filter.subcategoryId = criteria.subcategory;
  if (criteria.supplier) filter.supplier = criteria.supplier;
  // Stock bajo o Sin stock, la misma regla que productStatus.
  if (criteria.lowStock) {
    filter.$expr = { $or: [{ $eq: ['$stock', 0] }, { $lt: ['$stock', '$minStock'] }] };
  }
  return filter;
}

function toListItem(row: ProductRow): ProductListItem {
  return {
    id: String(row._id),
    code: row.code,
    name: row.name,
    supplierName: row.supplier?.name ?? null,
    category: row.category,
    subcategory: row.subcategory,
    stock: row.stock,
    minStock: row.minStock,
    price: row.price,
    status: productStatus(row.stock, row.minStock),
  };
}

/** Listado del catálogo ordenado por código, con búsqueda (código o nombre), filtros y paginación. */
export async function listProducts(criteria: ProductListQuery): Promise<ListPage<ProductListItem>> {
  const page = { items: [], total: 0, page: criteria.page, pageSize: PRODUCTS_PAGE_SIZE };
  const filter = productFilter(criteria);
  if (!filter) return page;
  const [rows, total] = await Promise.all([
    ProductModel.find(filter)
      .sort({ code: 1 })
      .skip(pageSkip(criteria.page, PRODUCTS_PAGE_SIZE))
      .limit(PRODUCTS_PAGE_SIZE)
      .populate<{ supplier: { name: string } | null }>('supplier', 'name')
      .lean<ProductRow[]>(),
    ProductModel.countDocuments(filter),
  ]);
  return { ...page, items: rows.map(toListItem), total };
}
