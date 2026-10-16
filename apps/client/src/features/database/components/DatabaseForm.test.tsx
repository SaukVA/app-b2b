import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DatabaseTestResult } from '@app/shared';
import { DatabaseForm, type DatabaseFormProps } from './DatabaseForm';

const URI = 'mongodb://localhost:27017/escritorio';

function renderForm(props: Partial<DatabaseFormProps> = {}) {
  const onTest = jest.fn();
  const onSave = jest.fn();
  render(
    <DatabaseForm
      test={{ status: 'idle', result: null }}
      saving={false}
      onTest={onTest}
      onSave={onSave}
      {...props}
    />,
  );
  return { onTest, onSave };
}

const field = () => screen.getByLabelText('Cadena de conexión') as HTMLInputElement;
const testButton = () => screen.getByRole('button', { name: 'Probar conexión' });
const saveButton = () => screen.getByRole('button', { name: 'Guardar' });

describe('DatabaseForm · campo y acciones', () => {
  it('el campo «Cadena de conexión» tiene etiqueta', () => {
    renderForm();
    expect(field()).toBeTruthy();
  });

  it('«Probar conexión» llama a onTest con la cadena escrita', async () => {
    const { onTest, onSave } = renderForm();
    await userEvent.type(field(), URI);
    await userEvent.click(testButton());
    expect(onTest).toHaveBeenCalledWith(URI);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('«Guardar» llama a onSave con la cadena escrita', async () => {
    const { onSave } = renderForm();
    await userEvent.type(field(), URI);
    await userEvent.click(saveButton());
    expect(onSave).toHaveBeenCalledWith(URI);
  });

  it('con el campo vacío los botones están deshabilitados', () => {
    renderForm();
    expect((testButton() as HTMLButtonElement).disabled).toBe(true);
    expect((saveButton() as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('DatabaseForm · estados', () => {
  it.each([
    ['guardando', { saving: true }],
    ['probando', { test: { status: 'running' as const, result: null } }],
  ])('mientras está %s los botones están deshabilitados', async (_case, props) => {
    renderForm(props);
    await userEvent.type(field(), URI);
    expect((testButton() as HTMLButtonElement).disabled).toBe(true);
    expect((saveButton() as HTMLButtonElement).disabled).toBe(true);
  });

  it('con resultado correcto muestra «Conexión correcta»', () => {
    renderForm({ test: { status: 'done', result: { ok: true } } });
    expect(screen.getByRole('status').textContent).toContain('Conexión correcta');
  });

  it('con error muestra el motivo en un Alert', () => {
    const result: DatabaseTestResult = {
      ok: false,
      code: 'DATABASE_TLS_REQUIRED',
      message: 'Las bases de datos remotas exigen conexión cifrada (tls=true o mongodb+srv).',
    };
    renderForm({ test: { status: 'done', result } });
    expect(screen.getByRole('alert').textContent).toContain(result.message);
    expect(field().getAttribute('aria-invalid')).toBe('true');
  });
});

const MASKED = 'mongodb://ana:••••••••@db.ejemplo.net:27017/ventas?tls=true';
const configured = (persisted = true) => ({
  configured: true,
  host: 'db.ejemplo.net:27017',
  maskedUri: MASKED,
  persisted,
});

describe('DatabaseForm · configuración actual (US3, FR-013)', () => {
  it('muestra la cadena actual con la contraseña oculta y el campo vacío', () => {
    renderForm({ summary: configured() });
    expect(screen.getByText(MASKED)).toBeTruthy();
    expect(screen.getByText(/Actual:/)).toBeTruthy();
    expect(field().value).toBe('');
    expect(document.body.textContent).not.toContain('s3cr3t');
  });

  it('sin base de datos configurada no muestra «Actual»', () => {
    renderForm({ summary: { configured: false, host: null, maskedUri: null, persisted: true } });
    expect(screen.queryByText(/Actual:/)).toBeNull();
  });

  it('sin resumen todavía no muestra «Actual» ni el aviso', () => {
    renderForm({ summary: null });
    expect(screen.queryByText(/Actual:/)).toBeNull();
    expect(screen.queryByText(/solo durará/)).toBeNull();
  });
});

describe('DatabaseForm · sin cifrado del sistema (US3, FR-017)', () => {
  it('con persisted false avisa de que la configuración solo dura con la app abierta', () => {
    renderForm({ summary: configured(false) });
    expect(
      screen.getByText('La configuración solo durará mientras la aplicación siga abierta.'),
    ).toBeTruthy();
  });

  it('con persisted true no muestra el aviso', () => {
    renderForm({ summary: configured(true) });
    expect(screen.queryByText(/solo durará/)).toBeNull();
  });
});
