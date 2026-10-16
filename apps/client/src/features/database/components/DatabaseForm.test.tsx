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
