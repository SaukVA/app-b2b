import { useEffect, useRef, useState } from 'react';
import { useBlocker, useLocation, useNavigate } from 'react-router';
import { Alert } from '../components/Alert';
import { BackLink } from '../components/BackLink';
import { Button } from '../components/Button';
import { Dialog } from '../components/Dialog';
import { SupplierForm } from '../features/suppliers/components/SupplierForm';
import { EMPTY_SUPPLIER_FORM, type SupplierFormValues } from '../features/suppliers/supplierForm';
import { createSupplier, resetSave } from '../features/suppliers/suppliersSlice';
import { useAppDispatch, useAppSelector } from '../store/store';
import styles from './SupplierFormPage.module.css';

const sameValues = (a: SupplierFormValues, b: SupplierFormValues) =>
  JSON.stringify(a) === JSON.stringify(b);

/**
 * Cualquier salida con cambios sin guardar (flecha, «Cancelar», «Atrás», menú) pide confirmación. Tras
 * guardar, `allowLeave` deja salir sin preguntar (FR-009).
 */
function useLeaveGuard(dirty: boolean) {
  const saved = useRef(false);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && !saved.current && currentLocation.pathname !== nextLocation.pathname,
  );
  return { blocker, allowLeave: () => (saved.current = true) };
}

function DiscardDialog({ onStay, onDiscard }: { onStay: () => void; onDiscard: () => void }) {
  return (
    <Dialog
      title="¿Descartar los cambios?"
      description="Lo que has escrito en el formulario se perderá."
      onClose={onStay}
      actions={
        <>
          <Button variant="secondary" onClick={onStay}>
            Seguir editando
          </Button>
          <Button variant="danger" onClick={onDiscard}>
            Descartar cambios
          </Button>
        </>
      }
    />
  );
}

function FormHeader({ listUrl }: { listUrl: string }) {
  return (
    <>
      <BackLink to={listUrl} label="Volver al listado de proveedores">
        Proveedores
      </BackLink>
      <header className={styles.header}>
        <h1 id="supplier-form-title" className={styles.title}>
          Nuevo proveedor
        </h1>
        <p className={styles.subtitle}>Los campos con * son obligatorios.</p>
      </header>
    </>
  );
}

/** Guarda el alta y, si sale bien, abre la ficha con los mismos criterios del listado (FR-009). */
function useCreate(search: string, allowLeave: () => void) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  useEffect(() => {
    dispatch(resetSave());
  }, [dispatch]);
  return async (submitted: SupplierFormValues) => {
    const result = await dispatch(createSupplier(submitted));
    if (!createSupplier.fulfilled.match(result)) return;
    allowLeave();
    navigate(`/proveedores/${result.payload.id}${search}`);
  };
}

/** Alta de un proveedor a pantalla completa (010 US1); la query son los criterios del listado. */
export function SupplierFormPage() {
  const { search } = useLocation();
  const navigate = useNavigate();
  const save = useAppSelector((state) => state.suppliers.save);
  const [values, setValues] = useState(EMPTY_SUPPLIER_FORM);
  const { blocker, allowLeave } = useLeaveGuard(!sameValues(values, EMPTY_SUPPLIER_FORM));
  const submit = useCreate(search, allowLeave);
  const listUrl = `/proveedores${search}`;

  return (
    <section aria-labelledby="supplier-form-title" className={styles.page}>
      <FormHeader listUrl={listUrl} />
      {save.error && <Alert variant="error">{save.error}</Alert>}
      <SupplierForm
        values={values}
        onChange={setValues}
        onSubmit={submit}
        onCancel={() => navigate(listUrl)}
        submitLabel="Crear proveedor"
        serverErrors={save.fieldErrors}
        otherErrors={save.otherErrors}
        saving={save.status === 'saving'}
      />
      {blocker.state === 'blocked' && (
        <DiscardDialog onStay={() => blocker.reset()} onDiscard={() => blocker.proceed()} />
      )}
    </section>
  );
}
