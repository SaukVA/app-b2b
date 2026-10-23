import type { FilterQuery } from 'mongoose';
import {
  SUPPLIERS_PAGE_SIZE,
  type ListPage,
  type SupplierListItem,
  type SupplierListQuery,
} from '@app/shared';
import { pageSkip, searchPattern, SPANISH_COLLATION } from '../../utils/listQuery';
import { SupplierModel, type SupplierFields } from './supplier.model';

type SupplierRow = SupplierFields & { _id: unknown };

/** Sin `includeInactive`, solo los activos (FR-004a). */
function supplierFilter(criteria: SupplierListQuery): FilterQuery<SupplierFields> {
  const filter: FilterQuery<SupplierFields> = criteria.includeInactive ? {} : { active: true };
  const pattern = searchPattern(criteria.q);
  if (pattern) filter.$or = [{ name: pattern }, { cif: pattern }];
  return filter;
}

function toListItem(row: SupplierRow): SupplierListItem {
  return {
    id: String(row._id),
    name: row.name,
    leadTimeDays: row.leadTimeDays,
    yearPurchases: row.yearPurchases,
    active: row.active,
  };
}

/** Listado de proveedores ordenado por nombre, con búsqueda (nombre o CIF), filtro de bajas y paginación. */
export async function listSuppliers(
  criteria: SupplierListQuery,
): Promise<ListPage<SupplierListItem>> {
  const filter = supplierFilter(criteria);
  const [rows, total] = await Promise.all([
    SupplierModel.find(filter)
      .collation(SPANISH_COLLATION)
      .sort({ name: 1 })
      .skip(pageSkip(criteria.page, SUPPLIERS_PAGE_SIZE))
      .limit(SUPPLIERS_PAGE_SIZE)
      .lean<SupplierRow[]>(),
    SupplierModel.countDocuments(filter),
  ]);
  return { items: rows.map(toListItem), total, page: criteria.page, pageSize: SUPPLIERS_PAGE_SIZE };
}
