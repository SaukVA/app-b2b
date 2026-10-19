import { Alert } from '../components/Alert';
import { useAppSelector } from '../store/store';
import styles from './AppearanceSettingsPage.module.css';

/** Aviso de guardado fallido (FR-004): el cambio se ve, pero no se ha guardado. */
function SaveErrorNotice() {
  const { saveStatus, saveError } = useAppSelector((state) => state.preferences);
  if (saveStatus !== 'failed' || !saveError) return null;
  return <Alert variant="info">{saveError}</Alert>;
}

/** Ajustes › Apariencia: preferencias personales de cualquier rol (004, FR-001). */
export function AppearanceSettingsPage() {
  return (
    <section aria-labelledby="appearance-settings-title" className={styles.page}>
      <h2 id="appearance-settings-title" className={styles.srOnly}>
        Apariencia
      </h2>
      <SaveErrorNotice />
    </section>
  );
}
