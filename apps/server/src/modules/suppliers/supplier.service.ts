import type { FilterQuery } from 'mongoose';
import {
  normalizeTaxId,
  SUPPLIERS_PAGE_SIZE,
  type ListPage,
  type SupplierListItem,
  type SupplierListQuery,
} from '@app/shared';
import { toSupplierListItem } from './supplier.mapper';
import { SupplierModel, type SupplierFields } from './supplier.model';
import { getPurchaseTotals } from './supplierPurchases';

const SPANISH_COLLATION = { locale: 'es', strength: 1 };
const ACCENTED_VOWELS: Record<string, string> = {
  a: '[aáàâä]',
  e: '[eéèêë]',
  i: '[iíìîï]',
  o: '[oóòôö]',
  u: '[uúùûü]',
};

/** Expresión que busca el texto tal cual, sin distinguir mayúsculas ni acentos en las vocales. */
function accentInsensitivePattern(text: string): RegExp {
  const pattern = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split('')
    .map((char) => ACCENTED_VOWELS[char] ?? char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('');
  return new RegExp(pattern, 'i');
}

function searchFilter(q: string): FilterQuery<SupplierFields> {
  const cif = normalizeTaxId(q);
  const byName = { name: accentInsensitivePattern(q) };
  return cif ? { $or: [byName, { cif: { $regex: accentInsensitivePattern(cif) } }] } : byName;
}

function listFilter({ q, includeInactive }: SupplierListQuery): FilterQuery<SupplierFields> {
  return { ...(includeInactive ? {} : { active: true }), ...(q ? searchFilter(q) : {}) };
}

/** Listado paginado en orden alfabético, con las compras del trimestre pedido y del año (FR-020, FR-021a). */
export async function listSuppliers(
  criteria: SupplierListQuery,
): Promise<ListPage<SupplierListItem>> {
  const filter = listFilter(criteria);
  const [docs, total] = await Promise.all([
    SupplierModel.find(filter)
      .collation(SPANISH_COLLATION)
      .sort({ name: 1 })
      .skip((criteria.page - 1) * SUPPLIERS_PAGE_SIZE)
      .limit(SUPPLIERS_PAGE_SIZE),
    SupplierModel.countDocuments(filter).collation(SPANISH_COLLATION),
  ]);
  const ids = docs.map((doc) => doc._id.toString());
  const totals = await getPurchaseTotals(ids);
  const items = docs.map((doc) =>
    toSupplierListItem(doc, totals.get(doc._id.toString())!, criteria.quarter),
  );
  return { items, total, page: criteria.page, pageSize: SUPPLIERS_PAGE_SIZE };
}
