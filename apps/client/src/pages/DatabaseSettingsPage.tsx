import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { DatabaseForm } from '../features/database/components/DatabaseForm';
import { saveDatabase, testCleared, testDatabase } from '../features/database/databaseSlice';
import { useAppDispatch, useAppSelector } from '../store/store';
import styles from './DatabaseSettingsPage.module.css';

/**
 * /ajustes/base-de-datos: pública y solo en escritorio, se abre desde el login (FR-007). Probar no guarda
 * nada (FR-009); al guardar, la app pasa a la nueva base de datos y vuelve al login (FR-011).
 */
export function DatabaseSettingsPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { test, saving } = useAppSelector((root) => root.database);

  useEffect(() => {
    dispatch(testCleared());
  }, [dispatch]);

  const save = async (uri: string) => {
    const result = await dispatch(saveDatabase(uri)).unwrap();
    if (result.ok) void navigate('/login');
  };

  return (
    <main className={styles.page}>
      <div className={styles.column}>
        <div className={styles.heading}>
          <h1 className={styles.title}>Base de datos</h1>
          <span className={styles.subtitle}>
            A qué base de datos MongoDB se conecta este equipo: en él mismo o en un servidor remoto.
          </span>
        </div>
        <DatabaseForm
          test={test}
          saving={saving}
          onTest={(uri) => void dispatch(testDatabase(uri))}
          onSave={(uri) => void save(uri)}
        />
        <Link to="/login" className={styles.back}>
          Volver
        </Link>
      </div>
    </main>
  );
}
