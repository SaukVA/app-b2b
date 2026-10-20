import { DEFAULT_THEME, type ThemePreference } from '@app/shared';
import { OptionGroup, type OptionGroupOption } from '../../../components/OptionGroup';
import { useAppDispatch, useAppSelector } from '../../../store/store';
import { savePreference } from '../preferencesSlice';
import styles from './AppearanceForm.module.css';

/** Miniatura del tema con sus propios colores (barra, fondo, línea, panel y botón), como en el tablero. */
function ThemePreview({ theme }: { theme: ThemePreference }) {
  return (
    <span className={`${styles.preview} ${styles[theme]}`} aria-hidden="true">
      <span className={styles.previewNav} />
      <span className={styles.previewBody}>
        <span className={styles.previewLine} />
        <span className={styles.previewPanel} />
        <span className={styles.previewButton} />
      </span>
    </span>
  );
}

const THEME_TEXTS: Omit<OptionGroupOption<ThemePreference>, 'preview'>[] = [
  { value: 'light', label: 'Claro', description: 'Papel y tinta. Recomendado para oficina.' },
  { value: 'dark', label: 'Oscuro', description: 'Menos brillo en turnos largos o poca luz.' },
  { value: 'system', label: 'Según el sistema', description: 'Sigue la configuración del equipo.' },
];

const THEME_OPTIONS: OptionGroupOption<ThemePreference>[] = THEME_TEXTS.map((option) => ({
  ...option,
  preview: <ThemePreview theme={option.value} />,
}));

/** Bloque «Tema» (004 US1): se aplica al momento y se guarda en segundo plano (FR-002, FR-004). */
function ThemeSection() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.preferences.applied?.theme ?? DEFAULT_THEME);
  return (
    <section aria-labelledby="appearance-theme-title" className={styles.panel}>
      <header className={styles.header}>
        <h3 id="appearance-theme-title" className={styles.title}>
          Tema
        </h3>
        <p className={styles.subtitle}>
          Se guarda por usuario y se aplica en la web y en la aplicación de escritorio.
        </p>
      </header>
      <div className={styles.body}>
        <OptionGroup
          labelledBy="appearance-theme-title"
          variant="cards"
          options={THEME_OPTIONS}
          value={theme}
          onChange={(value) => void dispatch(savePreference({ theme: value }))}
        />
      </div>
    </section>
  );
}

/** Preferencias personales de Ajustes › Apariencia (tablero «Ajustes»). */
export function AppearanceForm() {
  return <ThemeSection />;
}
