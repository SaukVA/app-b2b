import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router';
import type { SupplierDetail } from '@app/shared';
import { Alert } from '../components/Alert';
import { BackLink } from '../components/BackLink';
import { Button } from '../components/Button';
import { StatusStamp } from '../components/StatusStamp';
import { selectCan } from '../features/auth/authSelectors';
import { SupplierDetailView } from '../features/suppliers/components/SupplierDetailView';
import { SupplierStatusDialog } from '../features/suppliers/components/SupplierStatusDialog';
import {
  clearSaveNotice,
  closeSupplier,
  loadSupplier,
  resetStatusChange,
  setSupplierActive,
} from '../features/suppliers/suppliersSlice';
import { useAppDispatch, useAppSelector } from '../store/store';
import styles from './SupplierDetailPage.module.css';

export const SUPPLIER_LOAD_ERROR_MESSAGE = 'No se ha podido cargar el proveedor.';

/**
 * Pide la ficha del id de la dirección; al salir aborta la petición y cierra la ficha, para que su estado
 * final no se aplique a la siguiente. Devuelve «Reintentar».
 */
function useLoadSupplier(id: string): () => void {
  const dispatch = useAppDispatch();
  useEffect(() => {
    const request = dispatch(loadSupplier(id));
    return () => {
      request.abort();
      dispatch(closeSupplier());
    };
  }, [dispatch, id]);
  return useCallback(() => void dispatch(loadSupplier(id)), [dispatch, id]);
}

/**
 * Aviso breve tras guardar o cambiar el estado («Proveedor creado.», «<nombre> dado de baja.», FR-009): se
 * recoge en estado local y se borra de la store para que no se repita al volver a abrir la ficha. Con
 * StrictMode el estado local sobrevive al montaje doble.
 */
function useSaveNotice(): string | null {
  const dispatch = useAppDispatch();
  const pending = useAppSelector((state) => state.suppliers.save.notice);
  const [notice, setNotice] = useState(pending);
  useEffect(() => {
    if (!pending) return;
    setNotice(pending);
    dispatch(clearSaveNotice());
  }, [dispatch, pending]);
  return notice;
}

/** «Dar de baja» con confirmación y «Reactivar» sin ella (FR-017, FR-019). */
function useStatusActions(supplier: SupplierDetail) {
  const dispatch = useAppDispatch();
  const statusChange = useAppSelector((state) => state.suppliers.statusChange);
  const [confirming, setConfirming] = useState(false);
  const change = async (active: boolean) => {
    const { id, version } = supplier;
    const result = await dispatch(setSupplierActive({ id, active, version }));
    if (setSupplierActive.fulfilled.match(result)) setConfirming(false);
  };
  const open = () => {
    dispatch(resetStatusChange());
    setConfirming(true);
  };
  return { statusChange, confirming, open, close: () => setConfirming(false), change };
}

interface HeaderActions {
  editUrl: string;
  onDeactivate: () => void;
  onReactivate: () => void;
  busy: boolean;
}

/** «Editar proveedor» y «Dar de baja» / «Reactivar», solo con permiso de editar. */
function SupplierActions({ active, actions }: { active: boolean; actions: HeaderActions }) {
  return (
    <div className={styles.actions}>
      <Link to={actions.editUrl} className={styles.editButton}>
        Editar proveedor
      </Link>
      {active ? (
        <Button variant="secondary" onClick={actions.onDeactivate}>
          Dar de baja
        </Button>
      ) : (
        <Button variant="secondary" onClick={actions.onReactivate} disabled={actions.busy}>
          Reactivar
        </Button>
      )}
    </div>
  );
}

/** Nombre, sello «Baja», CIF y las acciones si hay permiso de editar (contracts/suppliers-ui.md). */
function SupplierHeader({
  supplier,
  actions,
}: {
  supplier: SupplierDetail;
  actions: HeaderActions | null;
}) {
  return (
    <header className={styles.header}>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>{supplier.name}</h1>
        {!supplier.active && <StatusStamp tone="neutral">Baja</StatusStamp>}
      </div>
      <span className={styles.cif}>
        CIF {supplier.cif}
        {supplier.foreign && ' (extranjero)'}
      </span>
      {actions && <SupplierActions active={supplier.active} actions={actions} />}
    </header>
  );
}

/** Error al cargar el proveedor con «Reintentar»; también lo usa el formulario de edición. */
export function SupplierLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className={styles.error}>
      <Alert variant="error">{SUPPLIER_LOAD_ERROR_MESSAGE}</Alert>
      <Button variant="secondary" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}

/** Ficha cargada: cabecera con acciones, secciones y diálogo de baja (010 US2, US4). */
function LoadedSupplier({ supplier, canEdit }: { supplier: SupplierDetail; canEdit: boolean }) {
  const { search } = useLocation();
  const statusActions = useStatusActions(supplier);
  const busy = statusActions.statusChange.status === 'saving';
  const actions: HeaderActions | null = canEdit
    ? {
        editUrl: `/proveedores/${supplier.id}/editar${search}`,
        onDeactivate: statusActions.open,
        onReactivate: () => void statusActions.change(true),
        busy,
      }
    : null;
  return (
    <>
      {!statusActions.confirming && statusActions.statusChange.error && (
        <Alert variant="error">{statusActions.statusChange.error}</Alert>
      )}
      <SupplierHeader supplier={supplier} actions={actions} />
      <SupplierDetailView supplier={supplier} year={new Date().getFullYear()} />
      {statusActions.confirming && (
        <SupplierStatusDialog
          supplierName={supplier.name}
          error={statusActions.statusChange.error}
          busy={busy}
          onConfirm={() => void statusActions.change(false)}
          onCancel={statusActions.close}
        />
      )}
    </>
  );
}

/**
 * Ficha del proveedor a pantalla completa (010 US2). La query de la dirección son los criterios del
 * listado: la flecha de retorno y un proveedor inexistente vuelven a él con ellos (FR-014, FR-015).
 */
export function SupplierDetailPage() {
  const { id = '' } = useParams();
  const { search } = useLocation();
  const { status, data } = useAppSelector((state) => state.suppliers.detail);
  const retry = useLoadSupplier(id);
  const notice = useSaveNotice();
  const canEdit = useAppSelector(selectCan('proveedores', 'edit'));
  const listUrl = `/proveedores${search}`;

  if (status === 'notFound') return <Navigate to={listUrl} replace state={{ notFound: true }} />;
  // Antes de que salga la primera petición el estado es idle: también es «cargando».
  const loading = status === 'loading' || status === 'idle';
  const ready = status === 'ready' && data?.id === id;

  return (
    <section className={styles.page} aria-busy={loading || undefined}>
      <BackLink to={listUrl} label="Volver al listado de proveedores">
        Proveedores
      </BackLink>
      {notice && <Alert variant="info">{notice}</Alert>}
      {loading && (
        <p role="status" className={styles.loading}>
          Cargando proveedor…
        </p>
      )}
      {status === 'error' && <SupplierLoadError onRetry={retry} />}
      {ready && <LoadedSupplier supplier={data} canEdit={canEdit} />}
    </section>
  );
}
