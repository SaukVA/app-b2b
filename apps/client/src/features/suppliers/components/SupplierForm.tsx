import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { PAYMENT_METHODS, SUPPLIER_LIMITS, type PaymentMethod } from '@app/shared';
import { Alert } from '../../../components/Alert';
import { Button } from '../../../components/Button';
import { Checkbox } from '../../../components/Checkbox';
import { Select } from '../../../components/Select';
import { TextArea } from '../../../components/TextArea';
import { TextField } from '../../../components/TextField';
import { UserMoneyField } from '../../preferences/components/UserMoney';
import {
  validateSupplierForm,
  type ContactRow,
  type SupplierFormErrors,
  type SupplierFormValues,
} from '../supplierForm';
import { SupplierContactsField } from './SupplierContactsField';
import styles from './SupplierForm.module.css';

export interface SupplierFormProps {
  values: SupplierFormValues;
  onChange: (values: SupplierFormValues) => void;
  /** Solo se llama con valores válidos. */
  onSubmit: (values: SupplierFormValues) => void;
  onCancel: () => void;
  submitLabel: string;
  /** Errores por campo que devolvió el servidor (CIF duplicado, 400). */
  serverErrors?: SupplierFormErrors;
  /** Errores del servidor que no corresponden a un campo: van al resumen. */
  otherErrors?: string[];
  saving?: boolean;
}

/** Nombre de cada campo en el resumen «Revisa estos campos: …», en el orden del formulario. */
const SUMMARY_LABELS: Record<string, string> = {
  name: 'Nombre',
  cif: 'CIF',
  address: 'Dirección',
  postalCode: 'Código postal',
  city: 'Población',
  iban: 'IBAN',
  web: 'Web',
  leadTimeDays: 'Plazo de entrega',
  minOrder: 'Pedido mínimo',
};

function summaryLabel(key: string): string {
  const contact = /^(phones|emails)\.(\d+)\./.exec(key);
  if (!contact) return SUMMARY_LABELS[key] ?? key;
  return `${contact[1] === 'phones' ? 'Teléfono' : 'Correo'} ${Number(contact[2]) + 1}`;
}

const FIELD_ORDER = Object.keys(SUMMARY_LABELS);
const orderOf = (key: string) => {
  const index = FIELD_ORDER.indexOf(key);
  return index === -1 ? FIELD_ORDER.length + (key.startsWith('emails') ? 1 : 0) : index;
};

/** Errores de una lista de contactos por índice de fila. */
function rowErrors(errors: SupplierFormErrors, list: 'phones' | 'emails'): Record<number, string> {
  const result: Record<number, string> = {};
  for (const [key, message] of Object.entries(errors)) {
    const match = new RegExp(`^${list}\\.(\\d+)\\.`).exec(key);
    if (match) result[Number(match[1])] = message;
  }
  return result;
}

function ErrorSummary({ errors, other }: { errors: SupplierFormErrors; other: string[] }) {
  const keys = Object.keys(errors).sort((a, b) => orderOf(a) - orderOf(b));
  if (keys.length === 0 && other.length === 0) return null;
  return (
    <Alert variant="error">
      {keys.length > 0 && `Revisa estos campos: ${keys.map(summaryLabel).join(', ')}.`}
      {other.map((message) => (
        <span key={message} className={styles.summaryLine}>
          {message}
        </span>
      ))}
    </Alert>
  );
}

function Section({ title, help, children }: { title: string; help?: string; children: ReactNode }) {
  return (
    <fieldset className={styles.section}>
      <legend className={styles.sectionTitle}>{title}</legend>
      {help && <p className={styles.help}>{help}</p>}
      <div className={styles.fields}>{children}</div>
    </fieldset>
  );
}

const Help = ({ children }: { children: string }) => <p className={styles.help}>{children}</p>;

type Setter = <K extends keyof SupplierFormValues>(key: K, value: SupplierFormValues[K]) => void;
type SectionProps = { values: SupplierFormValues; errors: SupplierFormErrors; set: Setter };

function IdentificationSection({ values, errors, set }: SectionProps) {
  return (
    <Section title="Identificación">
      <TextField
        label="Nombre *"
        value={values.name}
        maxLength={SUPPLIER_LIMITS.name}
        error={errors.name}
        onChange={(e) => set('name', e.target.value)}
      />
      <TextField
        label="CIF *"
        value={values.cif}
        className={styles.mono}
        error={errors.cif}
        onChange={(e) => set('cif', e.target.value)}
      />
      <div className={styles.wide}>
        <Checkbox
          label="Proveedor extranjero"
          checked={values.foreign}
          onChange={(e) => set('foreign', e.target.checked)}
        />
        <Help>Acepta un identificador fiscal y un código postal de otro país.</Help>
      </div>
    </Section>
  );
}

function AddressSection({ values, errors, set }: SectionProps) {
  return (
    <Section title="Dirección fiscal" help="Hace falta para las facturas.">
      <div className={styles.wide}>
        <TextField
          label="Dirección *"
          value={values.address}
          maxLength={SUPPLIER_LIMITS.address}
          error={errors.address}
          onChange={(e) => set('address', e.target.value)}
        />
      </div>
      <TextField
        label="Código postal *"
        value={values.postalCode}
        className={styles.mono}
        error={errors.postalCode}
        onChange={(e) => set('postalCode', e.target.value)}
      />
      <TextField
        label="Población *"
        value={values.city}
        maxLength={SUPPLIER_LIMITS.city}
        error={errors.city}
        onChange={(e) => set('city', e.target.value)}
      />
    </Section>
  );
}

const PAYMENT_OPTIONS = PAYMENT_METHODS.map(({ value, label }) => ({ value, label }));

function PaymentSection({ values, errors, set }: SectionProps) {
  return (
    <Section title="Pago">
      <Select
        label="Forma de pago"
        options={PAYMENT_OPTIONS}
        value={values.paymentMethod}
        onChange={(e) => set('paymentMethod', e.target.value as PaymentMethod)}
      />
      <TextField
        label="IBAN"
        value={values.iban}
        className={styles.mono}
        placeholder="ES00 0000 0000 0000 0000 0000"
        error={errors.iban}
        onChange={(e) => set('iban', e.target.value)}
      />
    </Section>
  );
}

function OrdersSection({ values, errors, set }: SectionProps) {
  return (
    <Section title="Pedidos">
      <div className={styles.wide}>
        <TextField
          label="Web donde se hacen los pedidos"
          type="url"
          value={values.web}
          placeholder="www.proveedor.es"
          error={errors.web}
          onChange={(e) => set('web', e.target.value)}
        />
      </div>
      <div>
        <TextField
          label="Plazo de entrega (días)"
          inputMode="numeric"
          value={values.leadTimeDays}
          className={styles.mono}
          error={errors.leadTimeDays}
          onChange={(e) => set('leadTimeDays', e.target.value)}
        />
        <Help>Déjalo vacío si varía de un pedido a otro.</Help>
      </div>
      <div>
        <UserMoneyField
          label="Pedido mínimo (€)"
          value={values.minOrder}
          onValueChange={(value) => set('minOrder', value)}
        />
        {errors.minOrder && <span className={styles.fieldError}>{errors.minOrder}</span>}
        <Help>Déjalo vacío si no tiene.</Help>
      </div>
    </Section>
  );
}

function ContactSection({ values, errors, set }: SectionProps) {
  return (
    <Section title="Contacto">
      <div className={styles.wide}>
        <TextField
          label="Persona de contacto"
          value={values.contactPerson}
          maxLength={SUPPLIER_LIMITS.contactPerson}
          onChange={(e) => set('contactPerson', e.target.value)}
        />
      </div>
      <div className={styles.wide}>
        <SupplierContactsField
          kind="phone"
          rows={values.phones}
          errors={rowErrors(errors, 'phones')}
          onChange={(rows: ContactRow[]) => set('phones', rows)}
        />
      </div>
      <div className={styles.wide}>
        <SupplierContactsField
          kind="email"
          rows={values.emails}
          errors={rowErrors(errors, 'emails')}
          onChange={(rows: ContactRow[]) => set('emails', rows)}
        />
      </div>
    </Section>
  );
}

/** Las secciones en dos columnas y, debajo, las observaciones (tablero «Proveedores»). */
function FormSections(sectionProps: SectionProps) {
  const { values, set } = sectionProps;
  return (
    <>
      <div className={styles.columns}>
        <div className={styles.column}>
          <IdentificationSection {...sectionProps} />
          <AddressSection {...sectionProps} />
          <PaymentSection {...sectionProps} />
        </div>
        <div className={styles.column}>
          <OrdersSection {...sectionProps} />
          <ContactSection {...sectionProps} />
        </div>
      </div>
      <TextArea
        label="Observaciones"
        rows={4}
        value={values.notes}
        maxLength={SUPPLIER_LIMITS.notes}
        onChange={(e) => set('notes', e.target.value)}
      />
    </>
  );
}

/**
 * Foco: al abrir, en el primer campo; después de cada intento de guardar con errores (propios o del
 * servidor), en el primero marcado como no válido (contracts/suppliers-ui.md › Accesibilidad).
 */
function useFormFocus(clientErrors: SupplierFormErrors, serverErrors?: SupplierFormErrors) {
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    formRef.current?.querySelector<HTMLElement>('input')?.focus();
  }, []);
  useEffect(() => {
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [clientErrors, serverErrors]);
  return formRef;
}

/**
 * Formulario de alta y edición de un proveedor (contracts/suppliers-ui.md › Formulario): dos columnas,
 * una en estrecho. Valida al enviar con las reglas de supplierForm.ts; los errores del servidor llegan
 * por props.
 */
export function SupplierForm(props: SupplierFormProps) {
  const { values, onChange, onSubmit, onCancel, submitLabel, saving = false } = props;
  const [clientErrors, setClientErrors] = useState<SupplierFormErrors>({});
  const errors = { ...props.serverErrors, ...clientErrors };
  const formRef = useFormFocus(clientErrors, props.serverErrors);
  const set: Setter = (key, value) => onChange({ ...values, [key]: value });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const found = validateSupplierForm(values);
    setClientErrors(found);
    if (Object.keys(found).length === 0) onSubmit(values);
  };

  return (
    <form ref={formRef} className={styles.form} noValidate onSubmit={submit}>
      <ErrorSummary errors={errors} other={props.otherErrors ?? []} />
      <FormSections values={values} errors={errors} set={set} />
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
