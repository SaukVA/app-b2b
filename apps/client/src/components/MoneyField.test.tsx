import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MoneyFormat } from '@app/shared';
import { MoneyField } from './MoneyField';

function renderField(format: MoneyFormat) {
  const onValueChange = jest.fn();
  render(<MoneyField label="Importe" format={format} value={null} onValueChange={onValueChange} />);
  return { input: screen.getByRole('textbox', { name: 'Importe' }), onValueChange };
}

async function typeAndLeave(input: HTMLElement, text: string) {
  await userEvent.clear(input);
  await userEvent.type(input, text);
  await userEvent.tab();
}

describe('MoneyField', () => {
  it('usa el teclado decimal', () => {
    const { input } = renderField('es');
    expect(input.getAttribute('inputmode')).toBe('decimal');
  });

  it.each<[MoneyFormat, string, string]>([
    ['es', '1.248,50', '1,248.50'],
    ['en', '1,248.50', '1.248,50'],
  ])('con %s acepta "%s" y rechaza "%s" al salir del campo', async (format, valid, invalid) => {
    const { input, onValueChange } = renderField(format);

    await typeAndLeave(input, valid);
    expect(onValueChange).toHaveBeenLastCalledWith(1248.5);
    expect(input.getAttribute('aria-invalid')).toBeNull();

    await typeAndLeave(input, invalid);
    expect(onValueChange).toHaveBeenLastCalledWith(null);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText(`Formato esperado: ${valid}`)).toBeTruthy();
  });

  it('vacío no muestra error y devuelve null', async () => {
    const { input, onValueChange } = renderField('es');
    await userEvent.click(input);
    await userEvent.tab();
    expect(onValueChange).toHaveBeenLastCalledWith(null);
    expect(input.getAttribute('aria-invalid')).toBeNull();
  });
});
