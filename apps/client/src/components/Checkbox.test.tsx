import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Checkbox } from './Checkbox';

describe('Checkbox', () => {
  it('se marca al pulsar su etiqueta', async () => {
    const onChange = jest.fn();
    render(<Checkbox label="Mantener la sesión iniciada en este equipo" onChange={onChange} />);
    await userEvent.click(screen.getByText('Mantener la sesión iniciada en este equipo'));
    const checkbox = screen.getByRole('checkbox', { name: 'Mantener la sesión iniciada en este equipo' });
    expect((checkbox as HTMLInputElement).checked).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
