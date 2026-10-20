import { useMemo } from 'react';
import {
  AVAILABLE_HOME_SCREENS,
  DEFAULT_TABLE_DENSITY,
  DEFAULT_THEME,
  isHomeScreenAllowed,
  type AuthUser,
  type HomeScreen,
  type MoneyFormat,
  type TableDensity,
  type ThemePreference,
  type UpdatePreferencesRequest,
} from '@app/shared';
import { OptionGroup, type OptionGroupOption } from '../../../components/OptionGroup';
import { Select } from '../../../components/Select';
import { effectiveHomeScreen } from '../../../routes/homeRoute';
import { useAppDispatch, useAppSelector } from '../../../store/store';
import { MONEY_FORMAT_EXAMPLES } from '../../../utils/money';
import { selectUser } from '../../auth/authSelectors';
import { savePreference } from '../preferencesSlice';
import { useMoneyFormat } from '../useMoneyFormat';
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
    <>
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
    </>
  );
}

const HOME_SCREEN_LABELS: Record<HomeScreen, string> = {
  panel: 'Panel',
  ventas: 'Ventas',
  clientes: 'Clientes',
  productos: 'Productos',
  proveedores: 'Proveedores',
  cobros: 'Cobros',
};

/** El usuario de la sesión con las preferencias que se ven (aplicadas aunque no se hayan guardado). */
function useAppliedUser(): AuthUser | null {
  const user = useAppSelector(selectUser);
  const applied = useAppSelector((state) => state.preferences.applied);
  return useMemo(
    () => (user && applied ? { ...user, preferences: applied } : user),
    [user, applied],
  );
}

/**
 * Reintento (FR-004): un <select> no avisa al volver a elegir la misma opción, así que, si quedó sin
 * guardar `field`, se reenvía lo pendiente al salir del campo.
 */
function useRetryOnBlur(field: keyof UpdatePreferencesRequest): () => void {
  const dispatch = useAppDispatch();
  const { saveStatus, pendingChange } = useAppSelector((state) => state.preferences);
  return () => {
    if (saveStatus === 'failed' && pendingChange[field] !== undefined) {
      void dispatch(savePreference({}));
    }
  };
}

/** Bloque «Pantalla de inicio» (004 US2): solo las pantallas que el rol puede ver (FR-014, FR-016). */
function HomeScreenField() {
  const dispatch = useAppDispatch();
  const user = useAppliedUser();
  const retry = useRetryOnBlur('homeScreen');
  const value = user ? effectiveHomeScreen(user) : null;
  if (!user || !value) return null;
  const options = AVAILABLE_HOME_SCREENS.filter((screen) =>
    isHomeScreenAllowed(user.permissions, screen),
  ).map((screen) => ({ value: screen, label: HOME_SCREEN_LABELS[screen] }));
  return (
    <Select
      label="Pantalla de inicio"
      options={options}
      value={value}
      onChange={(event) =>
        void dispatch(savePreference({ homeScreen: event.target.value as HomeScreen }))
      }
      onBlur={retry}
    />
  );
}

const DENSITY_OPTIONS: OptionGroupOption<TableDensity>[] = [
  { value: 'comfortable', label: 'Cómoda' },
  { value: 'compact', label: 'Compacta' },
];

/** Bloque «Densidad de tablas» (004 US4): Compacta reduce el alto de las filas de escritorio (FR-008). */
function DensityField() {
  const dispatch = useAppDispatch();
  const density = useAppSelector(
    (state) => state.preferences.applied?.tableDensity ?? DEFAULT_TABLE_DENSITY,
  );
  return (
    <div className={styles.field}>
      <span id="appearance-density-title" className={styles.fieldLabel}>
        Densidad de tablas
      </span>
      <OptionGroup
        labelledBy="appearance-density-title"
        options={DENSITY_OPTIONS}
        value={density}
        onChange={(value) => void dispatch(savePreference({ tableDensity: value }))}
      />
    </div>
  );
}

const MONEY_FORMAT_OPTIONS = (Object.keys(MONEY_FORMAT_EXAMPLES) as MoneyFormat[]).map(
  (format) => ({ value: format, label: MONEY_FORMAT_EXAMPLES[format] }),
);

/** Bloque «Formato de importes» (004 US3): se ve con el propio formato, en IBM Plex Mono (FR-010). */
function MoneyFormatField() {
  const dispatch = useAppDispatch();
  const retry = useRetryOnBlur('moneyFormat');
  return (
    <Select
      label="Formato de importes"
      className={styles.mono}
      options={MONEY_FORMAT_OPTIONS}
      value={useMoneyFormat()}
      onChange={(event) =>
        void dispatch(savePreference({ moneyFormat: event.target.value as MoneyFormat }))
      }
      onBlur={retry}
    />
  );
}

/** Preferencias personales de Ajustes › Apariencia (tablero «Ajustes»). */
export function AppearanceForm() {
  return (
    <section aria-labelledby="appearance-theme-title" className={styles.panel}>
      <ThemeSection />
      <div className={styles.settings}>
        <DensityField />
        <MoneyFormatField />
        <HomeScreenField />
      </div>
    </section>
  );
}
