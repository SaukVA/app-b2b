import { useEffect, useRef } from 'react';
import { SUPPLIER_LIMITS } from '@app/shared';
import { Button } from '../../../components/Button';
import { IconButton } from '../../../components/IconButton';
import { TextField } from '../../../components/TextField';
import type { ContactRow } from '../supplierForm';
import styles from './SupplierForm.module.css';

export interface SupplierContactsFieldProps {
  kind: 'phone' | 'email';
  rows: ContactRow[];
  onChange: (rows: ContactRow[]) => void;
  /** Error de cada fila, por su índice. */
  errors?: Record<number, string>;
}

const TEXTS = {
  phone: {
    title: 'Teléfonos',
    valueLabel: 'Número',
    noun: 'teléfono',
    type: 'tel',
    labelPlaceholder: 'Pedidos',
    valuePlaceholder: '600 000 000',
  },
  email: {
    title: 'Correos',
    valueLabel: 'Correo',
    noun: 'correo',
    type: 'email',
    labelPlaceholder: 'Facturación',
    valuePlaceholder: 'pedidos@proveedor.es',
  },
} as const;

function RemoveIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

/** Enfoca la etiqueta (primer campo) de la fila recién añadida. */
function useFocusNewRow(count: number) {
  const lastRow = useRef<HTMLDivElement>(null);
  const added = useRef(false);
  useEffect(() => {
    if (!added.current) return;
    added.current = false;
    lastRow.current?.querySelector('input')?.focus();
  }, [count]);
  return { lastRow, markAdded: () => (added.current = true) };
}

type Texts = (typeof TEXTS)[keyof typeof TEXTS];

interface ContactRowFieldsProps {
  row: ContactRow;
  index: number;
  texts: Texts;
  error?: string;
  onUpdate: (change: Partial<ContactRow>) => void;
  onRemove: () => void;
}

function ContactRowFields({ row, index, texts, error, onUpdate, onRemove }: ContactRowFieldsProps) {
  return (
    <>
      <TextField
        label="Etiqueta"
        value={row.label}
        maxLength={SUPPLIER_LIMITS.contactLabel}
        placeholder={texts.labelPlaceholder}
        onChange={(event) => onUpdate({ label: event.target.value })}
      />
      <TextField
        label={texts.valueLabel}
        type={texts.type}
        value={row.value}
        placeholder={texts.valuePlaceholder}
        error={error}
        onChange={(event) => onUpdate({ value: event.target.value })}
      />
      <IconButton
        aria-label={`Quitar ${texts.noun} ${index + 1}`}
        icon={<RemoveIcon />}
        className={styles.remove}
        onClick={onRemove}
      />
    </>
  );
}

function AddContact({ texts, count, onAdd }: { texts: Texts; count: number; onAdd: () => void }) {
  return (
    <div className={styles.contactsFooter}>
      <Button variant="secondary" onClick={onAdd} disabled={count >= SUPPLIER_LIMITS.maxContacts}>
        {`Añadir ${texts.noun}`}
      </Button>
      <span className={styles.counter}>
        {count} de {SUPPLIER_LIMITS.maxContacts}
      </span>
    </div>
  );
}

/** Teléfonos o correos del proveedor: filas «Etiqueta» + valor, hasta 5 (FR-004). */
export function SupplierContactsField({
  kind,
  rows,
  onChange,
  errors = {},
}: SupplierContactsFieldProps) {
  const texts = TEXTS[kind];
  const { lastRow, markAdded } = useFocusNewRow(rows.length);
  const update = (index: number, change: Partial<ContactRow>) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...change } : row)));
  const add = () => {
    markAdded();
    onChange([...rows, { label: '', value: '' }]);
  };

  return (
    <fieldset className={styles.contacts}>
      <legend className={styles.contactsTitle}>{texts.title}</legend>
      {rows.map((row, index) => (
        <div
          key={index}
          ref={index === rows.length - 1 ? lastRow : undefined}
          className={styles.contactRow}
        >
          <ContactRowFields
            row={row}
            index={index}
            texts={texts}
            error={errors[index]}
            onUpdate={(change) => update(index, change)}
            onRemove={() => onChange(rows.filter((_, i) => i !== index))}
          />
        </div>
      ))}
      <AddContact texts={texts} count={rows.length} onAdd={add} />
    </fieldset>
  );
}
