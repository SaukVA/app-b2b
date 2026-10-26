import type { Quarter, SupplierContact, SupplierDetail, SupplierListItem } from '@app/shared';
import type { SupplierDocument } from './supplier.model';
import type { PurchaseTotals } from './supplierPurchases';

// Documento de Mongoose → DTO compartido. NEVER se devuelve el documento en una respuesta (constitución IV).

const toContacts = (contacts: readonly SupplierContact[]): SupplierContact[] =>
  contacts.map(({ label, value }) => ({ label: label ?? null, value }));

export function toSupplierListItem(
  doc: SupplierDocument,
  totals: PurchaseTotals,
  quarter: Quarter,
): SupplierListItem {
  return {
    id: doc._id.toString(),
    name: doc.name,
    cif: doc.cif,
    city: doc.city,
    leadTimeDays: doc.leadTimeDays,
    quarterPurchases: totals.quarters[quarter - 1],
    yearPurchases: totals.year,
    active: doc.active,
  };
}

export function toSupplierDetail(doc: SupplierDocument, totals: PurchaseTotals): SupplierDetail {
  return {
    id: doc._id.toString(),
    name: doc.name,
    cif: doc.cif,
    foreign: doc.foreign,
    address: doc.address,
    postalCode: doc.postalCode,
    city: doc.city,
    contactPerson: doc.contactPerson,
    phones: toContacts(doc.phones),
    emails: toContacts(doc.emails),
    paymentMethod: doc.paymentMethod,
    iban: doc.iban,
    web: doc.web,
    leadTimeDays: doc.leadTimeDays,
    minOrder: doc.minOrder,
    notes: doc.notes,
    active: doc.active,
    version: doc.version,
    yearPurchases: totals.year,
    quarterPurchases: [...totals.quarters],
    createdBy: { id: doc.createdBy.id, login: doc.createdBy.login },
    createdAt: doc.createdAt.toISOString(),
    updatedBy: { id: doc.updatedBy.id, login: doc.updatedBy.login },
    updatedAt: doc.updatedAt.toISOString(),
  };
}
