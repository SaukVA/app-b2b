import type { FilterQuery } from 'mongoose';
import {
  normalizeTaxId,
  SUPPLIER_ERROR_CODES,
  SUPPLIERS_PAGE_SIZE,
  type AuditUser,
  type ListPage,
  type SupplierDetail,
  type SupplierInput,
  type SupplierStatusInput,
  type SupplierUpdateInput,
  type SupplierListItem,
  type SupplierListQuery,
} from '@app/shared';
import { AppError } from '../../utils/AppError';
import { toSupplierDetail, toSupplierListItem } from './supplier.mapper';
import { SupplierModel, type SupplierDocument, type SupplierFields } from './supplier.model';
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

/** Ficha de un proveedor, activo o dado de baja (FR-012, FR-019). */
export async function getSupplier(id: string): Promise<SupplierDetail> {
  const doc = await SupplierModel.findById(id);
  if (!doc) throw new AppError(SUPPLIER_ERROR_CODES.notFound, 404, 'El proveedor no existe.');
  const totals = await getPurchaseTotals([id]);
  return toSupplierDetail(doc, totals.get(id)!);
}

const DUPLICATE_KEY = 11000;

/**
 * Índice único de `cif` (FR-005): un E11000 es un CIF ya usado, por un proveedor activo o dado de baja. El
 * mensaje lleva su nombre para que se pueda encontrar (contracts/suppliers-ui.md).
 */
async function toCifTakenError(err: unknown, cif: string): Promise<unknown> {
  if ((err as { code?: unknown } | null)?.code !== DUPLICATE_KEY) return err;
  const owner = await SupplierModel.findOne({ cif }, { name: 1 });
  const message = `Ya existe un proveedor con este CIF: ${owner?.name ?? cif}.`;
  return new AppError(SUPPLIER_ERROR_CODES.cifTaken, 409, message);
}

async function toDetail(doc: SupplierDocument): Promise<SupplierDetail> {
  const id = doc._id.toString();
  const totals = await getPurchaseTotals([id]);
  return toSupplierDetail(doc, totals.get(id)!);
}

/**
 * Nada se guardó con esa versión: si el proveedor no existe es 404; si existe, otro usuario lo cambió
 * antes (409, FR-011, research R6).
 */
async function notSavedError(id: string): Promise<AppError> {
  if (!(await SupplierModel.exists({ _id: id }))) {
    return new AppError(SUPPLIER_ERROR_CODES.notFound, 404, 'El proveedor no existe.');
  }
  const message = 'Otro usuario ha cambiado este proveedor.';
  return new AppError(SUPPLIER_ERROR_CODES.versionConflict, 409, message);
}

/** Alta: el proveedor queda activo, en la versión 0, con quien lo da de alta (FR-010, FR-012b). */
export async function createSupplier(
  input: SupplierInput,
  actor: AuditUser,
): Promise<SupplierDetail> {
  try {
    const doc = await SupplierModel.create({ ...input, createdBy: actor, updatedBy: actor });
    return await toDetail(doc);
  } catch (err) {
    throw await toCifTakenError(err, input.cif);
  }
}

/**
 * Edición de todos los datos, también estando de baja (FR-007, FR-019). Solo guarda si la `version` es la
 * leída; sube la versión y deja constancia de quién cambió el proveedor (FR-011, FR-012b).
 */
export async function updateSupplier(
  id: string,
  { version, ...input }: SupplierUpdateInput,
  actor: AuditUser,
): Promise<SupplierDetail> {
  let doc: SupplierDocument | null;
  try {
    doc = await SupplierModel.findOneAndUpdate(
      { _id: id, version },
      { $set: { ...input, updatedBy: actor }, $inc: { version: 1 } },
      { new: true, runValidators: true },
    );
  } catch (err) {
    throw await toCifTakenError(err, input.cif);
  }
  if (!doc) throw await notSavedError(id);
  return toDetail(doc);
}

/**
 * Baja o reactivación: nunca se borra nada (FR-017, FR-018). Misma comprobación de versión que la edición
 * y deja constancia de quién lo hizo (FR-011, FR-012b).
 */
export async function setSupplierActive(
  id: string,
  { active, version }: SupplierStatusInput,
  actor: AuditUser,
): Promise<SupplierDetail> {
  const doc = await SupplierModel.findOneAndUpdate(
    { _id: id, version },
    { $set: { active, updatedBy: actor }, $inc: { version: 1 } },
    { new: true },
  );
  if (!doc) throw await notSavedError(id);
  return toDetail(doc);
}
