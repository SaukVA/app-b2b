import type { FilterQuery } from 'mongoose';
import {
  CUSTOMERS_PAGE_SIZE,
  customerRiskUsed,
  type CustomerListItem,
  type CustomerListQuery,
  type ListPage,
} from '@app/shared';
import { pageSkip, searchPattern, SPANISH_COLLATION } from '../../utils/listQuery';
import { CustomerModel, type CustomerFields } from './customer.model';

type CustomerRow = CustomerFields & { _id: unknown };

function customerFilter(criteria: CustomerListQuery): FilterQuery<CustomerFields> {
  const pattern = searchPattern(criteria.q);
  return pattern ? { $or: [{ name: pattern }, { city: pattern }] } : {};
}

function toListItem(row: CustomerRow): CustomerListItem {
  return {
    id: String(row._id),
    name: row.name,
    city: row.city,
    maxRisk: row.maxRisk,
    balance: row.balance,
    riskUsed: customerRiskUsed(row.balance, row.maxRisk),
    lastOrderDate: row.lastOrderDate ? row.lastOrderDate.toISOString().slice(0, 10) : null,
  };
}

/** Listado de la cartera ordenado por nombre, con búsqueda (nombre o población) y paginación. */
export async function listCustomers(
  criteria: CustomerListQuery,
): Promise<ListPage<CustomerListItem>> {
  const filter = customerFilter(criteria);
  const [rows, total] = await Promise.all([
    CustomerModel.find(filter)
      .collation(SPANISH_COLLATION)
      .sort({ name: 1 })
      .skip(pageSkip(criteria.page, CUSTOMERS_PAGE_SIZE))
      .limit(CUSTOMERS_PAGE_SIZE)
      .lean<CustomerRow[]>(),
    CustomerModel.countDocuments(filter),
  ]);
  return { items: rows.map(toListItem), total, page: criteria.page, pageSize: CUSTOMERS_PAGE_SIZE };
}
