import { useId, type ReactNode } from 'react';
import {
  APP_TIME_ZONE,
  formatIban,
  PAYMENT_METHODS,
  type AuditUser,
  type SupplierContact,
  type SupplierDetail,
} from '@app/shared';
import { UserMoney } from '../../preferences/components/UserMoney';
import { formatLeadTime } from '../formatLeadTime';
import styles from './SupplierDetailView.module.css';

export interface SupplierDetailViewProps {
  supplier: SupplierDetail;
  /** Año en curso de «Compras <año>»; los tests lo fijan. */
  year: number;
}

const QUARTER_LABELS = ['1T', '2T', '3T', '4T'] as const;

const auditDate = new Intl.DateTimeFormat('es-ES', {
  timeZone: APP_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
const auditTime = new Intl.DateTimeFormat('es-ES', {
  timeZone: APP_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** «<acción> por <login> el 26/10/2026 10:30», en hora de Madrid (FR-012b). */
function auditLine(action: string, user: AuditUser, iso: string): string {
  const at = new Date(iso);
  return `${action} por ${user.login} el ${auditDate.format(at)} ${auditTime.format(at)}`;
}

const paymentLabel = (value: SupplierDetail['paymentMethod']) =>
  PAYMENT_METHODS.find((method) => method.value === value)?.label ?? value;

/** Bloque con título (h2) que los lectores de pantalla anuncian como región. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={styles.section}>
      <h2 id={id} className={styles.sectionTitle}>
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Dato de la ficha; vacío → «—» (contracts/suppliers-ui.md). */
function Field({ label, mono, children }: { label: string; mono?: boolean; children?: ReactNode }) {
  return (
    <div className={styles.field}>
      <dt className={styles.label}>{label}</dt>
      <dd className={mono ? styles.mono : styles.value}>{children || '—'}</dd>
    </div>
  );
}

function ContactFields({
  kind,
  contacts,
}: {
  kind: 'phone' | 'email';
  contacts: SupplierContact[];
}) {
  const noun = kind === 'phone' ? 'Teléfono' : 'Correo';
  return contacts.map((contact, index) => (
    <Field
      key={index}
      label={`${noun} · ${contact.label ?? 'sin etiqueta'}`}
      mono={kind === 'phone'}
    >
      <a
        className={styles.link}
        href={
          kind === 'phone' ? `tel:${contact.value.replace(/\s/g, '')}` : `mailto:${contact.value}`
        }
      >
        {contact.value}
      </a>
    </Field>
  ));
}

function FiscalSection({ supplier }: { supplier: SupplierDetail }) {
  return (
    <Section title="Datos fiscales">
      <dl className={styles.list}>
        <Field label="Nombre">{supplier.name}</Field>
        <Field label="CIF" mono>
          {supplier.cif + (supplier.foreign ? ' (extranjero)' : '')}
        </Field>
        <Field label="Dirección">{supplier.address}</Field>
        <Field label="Código postal" mono>
          {supplier.postalCode}
        </Field>
        <Field label="Población">{supplier.city}</Field>
      </dl>
    </Section>
  );
}

function ContactSection({ supplier }: { supplier: SupplierDetail }) {
  return (
    <Section title="Contacto">
      <dl className={styles.list}>
        <Field label="Persona de contacto">{supplier.contactPerson}</Field>
        <ContactFields kind="phone" contacts={supplier.phones} />
        <ContactFields kind="email" contacts={supplier.emails} />
      </dl>
    </Section>
  );
}

function PaymentSection({ supplier }: { supplier: SupplierDetail }) {
  return (
    <Section title="Pago">
      <dl className={styles.list}>
        <Field label="Forma de pago">{paymentLabel(supplier.paymentMethod)}</Field>
        <Field label="IBAN" mono>
          {supplier.iban && formatIban(supplier.iban)}
        </Field>
      </dl>
    </Section>
  );
}

function PurchasesSection({ supplier, year }: SupplierDetailViewProps) {
  return (
    <Section title={`Compras ${year}`}>
      <p className={styles.yearTotal}>
        <UserMoney value={supplier.yearPurchases} />
      </p>
      <p className={styles.hint}>Importes sin IVA</p>
      <dl className={styles.quarters}>
        {supplier.quarterPurchases.map((amount, index) => (
          <div key={QUARTER_LABELS[index]} className={styles.quarter}>
            <dt className={styles.label}>{QUARTER_LABELS[index]}</dt>
            <dd className={styles.mono}>
              <UserMoney value={amount} />
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

function OrdersSection({ supplier }: { supplier: SupplierDetail }) {
  const { web, leadTimeDays, minOrder } = supplier;
  return (
    <Section title="Pedidos">
      <dl className={styles.list}>
        <Field label="Web">
          {web && (
            <a className={styles.link} href={web} target="_blank" rel="noopener noreferrer">
              {web.replace(/^https?:\/\//, '')}
            </a>
          )}
        </Field>
        <Field label="Plazo de entrega" mono>
          {formatLeadTime(leadTimeDays)}
        </Field>
        <Field label="Pedido mínimo" mono>
          {minOrder === null ? 'Sin pedido mínimo' : <UserMoney value={minOrder} />}
        </Field>
      </dl>
    </Section>
  );
}

function NotesSection({ notes }: { notes: string | null }) {
  return (
    <Section title="Observaciones">
      <p className={notes ? styles.notes : styles.hint}>{notes ?? 'Sin observaciones.'}</p>
    </Section>
  );
}

/** Secciones de la ficha del proveedor en dos columnas (una en estrecho), sin acciones (FR-012, FR-013). */
export function SupplierDetailView({ supplier, year }: SupplierDetailViewProps) {
  return (
    <div className={styles.view}>
      <div className={styles.columns}>
        <div className={styles.column}>
          <FiscalSection supplier={supplier} />
          <ContactSection supplier={supplier} />
          <PaymentSection supplier={supplier} />
        </div>
        <div className={styles.column}>
          <PurchasesSection supplier={supplier} year={year} />
          <OrdersSection supplier={supplier} />
          <NotesSection notes={supplier.notes} />
        </div>
      </div>
      <footer className={styles.audit}>
        <p>{auditLine('Creado', supplier.createdBy, supplier.createdAt)}</p>
        <p>{auditLine('Modificado', supplier.updatedBy, supplier.updatedAt)}</p>
      </footer>
    </div>
  );
}
