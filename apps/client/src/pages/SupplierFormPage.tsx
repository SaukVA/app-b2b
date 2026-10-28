import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useBlocker, useLocation, useNavigate, useParams } from 'react-router';
import { Alert } from '../components/Alert';
import { BackLink } from '../components/BackLink';
import { Button } from '../components/Button';
import { Dialog } from '../components/Dialog';
import { SupplierForm } from '../features/suppliers/components/SupplierForm';
import {
  EMPTY_SUPPLIER_FORM,
  fromSupplierDetail,
  type SupplierFormValues,
} from '../features/suppliers/supplierForm';
import {
  closeSupplier,
  createSupplier,
  loadSupplier,
  resetSave,
  updateSupplier,
} from '../features/suppliers/suppliersSlice';
import { useAppDispatch, useAppSelector } from '../store/store';
import { SupplierLoadError } from './SupplierDetailPage';
import styles from './SupplierFormPage.module.css';

const CONFLICT_MESSAGE =
  'Otro usuario ha cambiado este proveedor mientras lo editabas. Carga los datos actuales y repite tus cambios.';

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

/** Lo que cambia entre el alta y la edición (contracts/suppliers-ui.md › Formulario). */
interface FormMode {
  title: string;
  subtitle: string;
  submitLabel: string;
  back: { to: string; label: string; text: string };
}

function FormHeader({ mode }: { mode: FormMode }) {
  return (
    <>
      <BackLink to={mode.back.to} label={mode.back.label}>
        {mode.back.text}
      </BackLink>
      <header className={styles.header}>
        <h1 id="supplier-form-title" className={styles.title}>
          {mode.title}
        </h1>
        <p className={styles.subtitle}>{mode.subtitle}</p>
      </header>
    </>
  );
}

function ConflictNotice({ onReload }: { onReload: () => void }) {
  return (
    <div className={styles.notice}>
      <Alert variant="warning">{CONFLICT_MESSAGE}</Alert>
      <Button variant="secondary" onClick={onReload}>
        Cargar datos actuales
      </Button>
    </div>
  );
}

interface FormScreenProps {
  mode: FormMode;
  initial: SupplierFormValues;
  /** Guarda; devuelve el id del proveedor si ha ido bien. */
  onSave: (values: SupplierFormValues) => Promise<string | null>;
  /** Solo en edición: tras un conflicto, vuelve a leer el proveedor. */
  onReload?: () => void;
}

/** Formulario a pantalla completa; al guardar abre la ficha con los criterios del listado (FR-009). */
function FormScreen({ mode, initial, onSave, onReload }: FormScreenProps) {
  const { search } = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const save = useAppSelector((state) => state.suppliers.save);
  const [values, setValues] = useState(initial);
  const { blocker, allowLeave } = useLeaveGuard(!sameValues(values, initial));

  useEffect(() => {
    dispatch(resetSave());
  }, [dispatch]);

  const submit = async (submitted: SupplierFormValues) => {
    const id = await onSave(submitted);
    if (!id) return;
    allowLeave();
    navigate(`/proveedores/${id}${search}`);
  };

  return (
    <section aria-labelledby="supplier-form-title" className={styles.page}>
      <FormHeader mode={mode} />
      {save.error && <Alert variant="error">{save.error}</Alert>}
      {save.conflict && onReload && <ConflictNotice onReload={onReload} />}
      <SupplierForm
        values={values}
        onChange={setValues}
        onSubmit={submit}
        onCancel={() => navigate(mode.back.to)}
        submitLabel={mode.submitLabel}
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

function CreateSupplier() {
  const { search } = useLocation();
  const dispatch = useAppDispatch();
  const mode: FormMode = {
    title: 'Nuevo proveedor',
    subtitle: 'Los campos con * son obligatorios.',
    submitLabel: 'Crear proveedor',
    back: {
      to: `/proveedores${search}`,
      label: 'Volver al listado de proveedores',
      text: 'Proveedores',
    },
  };
  const onSave = async (values: SupplierFormValues) => {
    const result = await dispatch(createSupplier(values));
    return createSupplier.fulfilled.match(result) ? result.payload.id : null;
  };
  return <FormScreen mode={mode} initial={EMPTY_SUPPLIER_FORM} onSave={onSave} />;
}

/** Lee el proveedor que se va a editar; al salir aborta la petición y cierra la ficha. */
function useSupplierToEdit(id: string) {
  const dispatch = useAppDispatch();
  const detail = useAppSelector((state) => state.suppliers.detail);
  const reload = useCallback(() => {
    dispatch(resetSave());
    return dispatch(loadSupplier(id));
  }, [dispatch, id]);
  useEffect(() => {
    const request = reload();
    return () => {
      request.abort();
      dispatch(closeSupplier());
    };
  }, [dispatch, reload]);
  const ready = detail.status === 'ready' && detail.data?.id === id;
  return { status: detail.status, data: ready ? detail.data : null, reload };
}

function EditSupplier({ id }: { id: string }) {
  const { search } = useLocation();
  const dispatch = useAppDispatch();
  const { status, data, reload } = useSupplierToEdit(id);
  if (status === 'notFound') {
    return <Navigate to={`/proveedores${search}`} replace state={{ notFound: true }} />;
  }
  if (!data) return <EditLoading status={status} onRetry={() => void reload()} />;

  const mode: FormMode = {
    title: 'Editar proveedor',
    subtitle: data.name,
    submitLabel: 'Guardar cambios',
    back: {
      to: `/proveedores/${id}${search}`,
      label: 'Volver a la ficha del proveedor',
      text: 'Proveedor',
    },
  };
  const onSave = async (values: SupplierFormValues) => {
    const result = await dispatch(updateSupplier({ id, version: data.version, values }));
    return updateSupplier.fulfilled.match(result) ? id : null;
  };
  // «Cargar datos actuales» vuelve a leer el proveedor: mientras carga se desmonta el formulario, que
  // después empieza de nuevo con los datos actuales.
  return (
    <FormScreen
      mode={mode}
      initial={fromSupplierDetail(data)}
      onSave={onSave}
      onReload={() => void reload()}
    />
  );
}

function EditLoading({ status, onRetry }: { status: string; onRetry: () => void }) {
  return (
    <section className={styles.page} aria-busy={status !== 'error' || undefined}>
      {status === 'error' ? (
        <SupplierLoadError onRetry={onRetry} />
      ) : (
        <p role="status">Cargando proveedor…</p>
      )}
    </section>
  );
}

/** Alta (`/proveedores/nuevo`) o edición (`/proveedores/:id/editar`) a pantalla completa (010 US1, US3). */
export function SupplierFormPage() {
  const { id } = useParams();
  return id ? <EditSupplier id={id} /> : <CreateSupplier />;
}
