import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router';
import type { SupplierDetail } from '@app/shared';
import { Alert } from '../components/Alert';
import { BackLink } from '../components/BackLink';
import { Button } from '../components/Button';
import { StatusStamp } from '../components/StatusStamp';
import { selectCan } from '../features/auth/authSelectors';
import { SupplierDetailView } from '../features/suppliers/components/SupplierDetailView';
import { clearSaveNotice, closeSupplier, loadSupplier } from '../features/suppliers/suppliersSlice';
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
 * Aviso breve tras guardar («Proveedor creado.», FR-009): se recoge al abrir la ficha y se borra de la store
 * para que no se repita. Con StrictMode el estado local sobrevive al montaje doble.
 */
function useSaveNotice(): string | null {
  const dispatch = useAppDispatch();
  const pending = useAppSelector((state) => state.suppliers.save.notice);
  const [notice] = useState(pending);
  useEffect(() => {
    if (pending) dispatch(clearSaveNotice());
  }, [dispatch, pending]);
  return notice;
}

/** Nombre, sello «Baja», CIF y, con permiso de editar, «Editar proveedor» (contracts/suppliers-ui.md). */
function SupplierHeader({
  supplier,
  editUrl,
}: {
  supplier: SupplierDetail;
  editUrl: string | null;
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
      {editUrl && (
        <div className={styles.actions}>
          <Link to={editUrl} className={styles.editButton}>
            Editar proveedor
          </Link>
        </div>
      )}
    </header>
  );
}

function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className={styles.error}>
      <Alert variant="error">{SUPPLIER_LOAD_ERROR_MESSAGE}</Alert>
      <Button variant="secondary" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
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
      {status === 'error' && <LoadError onRetry={retry} />}
      {ready && (
        <>
          <SupplierHeader
            supplier={data}
            editUrl={canEdit ? `/proveedores/${id}/editar${search}` : null}
          />
          <SupplierDetailView supplier={data} year={new Date().getFullYear()} />
        </>
      )}
    </section>
  );
}
