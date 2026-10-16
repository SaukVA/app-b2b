import { useState, type FormEvent } from 'react';
import { Alert } from '../../../components/Alert';
import { Button } from '../../../components/Button';
import { TextField } from '../../../components/TextField';
import type { DatabaseSummary } from '@app/shared';
import type { DatabaseSliceState } from '../databaseSlice';
import styles from './DatabaseForm.module.css';

export interface DatabaseFormProps {
  test: DatabaseSliceState['test'];
  saving: boolean;
  onTest(uri: string): void;
  onSave(uri: string): void;
  /** Base de datos guardada: se muestra enmascarada (FR-013); null mientras no se conoce. */
  summary?: DatabaseSummary | null;
}

const URI_HELP =
  'Formato mongodb:// o mongodb+srv://. Si el servidor no es este equipo, la conexión debe ir cifrada (tls=true o mongodb+srv).';

function TestResult({ result }: { result: DatabaseFormProps['test']['result'] }) {
  if (!result) return null;
  if (result.ok) return <Alert variant="info">Conexión correcta.</Alert>;
  return <Alert>{result.message}</Alert>;
}

function PanelHeader() {
  return (
    <div className={styles.header}>
      <h2 className={styles.title}>Conexión a la base de datos</h2>
      <span className={styles.subtitle}>
        La cadena de conexión se guarda cifrada en este equipo y nunca vuelve a mostrarse completa.
      </span>
    </div>
  );
}

/** Cadena actual con la contraseña oculta y aviso si no se pudo cifrar en este equipo (FR-017). */
function CurrentConnection({ summary }: { summary: DatabaseSummary | null | undefined }) {
  if (!summary) return null;
  return (
    <>
      {summary.configured && summary.maskedUri && (
        <p className={styles.current}>
          Actual: <code className={styles.currentUri}>{summary.maskedUri}</code>
        </p>
      )}
      {!summary.persisted && (
        <Alert variant="info">
          La configuración solo durará mientras la aplicación siga abierta.
        </Alert>
      )}
    </>
  );
}

function PanelActions({ disabled, onTest }: { disabled: boolean; onTest(): void }) {
  return (
    <div className={styles.footer}>
      <Button variant="secondary" disabled={disabled} onClick={onTest}>
        Probar conexión
      </Button>
      <Button type="submit" disabled={disabled}>
        Guardar
      </Button>
    </div>
  );
}

/**
 * Formulario «MongoDB directo» del tablero Ajustes › Base de datos (docs/design/canvas/Ajustes.dc.html).
 * No llama al puente ni a la store: la página le pasa el estado y las acciones.
 */
export function DatabaseForm({ test, saving, onTest, onSave, summary }: DatabaseFormProps) {
  const [uri, setUri] = useState('');
  const busy = saving || test.status === 'running';
  const disabled = busy || uri.trim() === '';
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!disabled) onSave(uri);
  };
  return (
    <form className={styles.panel} onSubmit={submit} noValidate>
      <PanelHeader />
      <div className={styles.body}>
        <CurrentConnection summary={summary} />
        <TextField
          label="Cadena de conexión"
          className={styles.uri}
          value={uri}
          onChange={(event) => setUri(event.target.value)}
          placeholder="mongodb://usuario:contraseña@servidor:27017/base"
          autoComplete="off"
          spellCheck={false}
          invalid={test.result?.ok === false}
        />
        <span className={styles.help}>{URI_HELP}</span>
        <TestResult result={test.result} />
      </div>
      <PanelActions disabled={disabled} onTest={() => onTest(uri)} />
    </form>
  );
}
