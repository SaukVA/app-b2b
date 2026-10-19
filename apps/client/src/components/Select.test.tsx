import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from './Select';

const OPTIONS = [
  { value: 'Comercial', label: 'Comercial' },
  { value: 'Almacén', label: 'Almacén' },
];

describe('Select', () => {
  it('asocia la etiqueta al desplegable y pinta las opciones', () => {
    render(<Select label="Rol" options={OPTIONS} defaultValue="Comercial" />);
    const select = screen.getByLabelText('Rol');
    expect(select.tagName).toBe('SELECT');
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Comercial',
      'Almacén',
    ]);
  });

  it('notifica el cambio', async () => {
    const onChange = jest.fn();
    render(<Select label="Rol" options={OPTIONS} value="Comercial" onChange={onChange} />);
    await userEvent.selectOptions(screen.getByLabelText('Rol'), 'Almacén');
    expect(onChange).toHaveBeenCalled();
  });

  it('muestra el error, lo enlaza con aria-describedby y marca aria-invalid', () => {
    render(<Select label="Rol" options={OPTIONS} error="Elige un rol" />);
    const select = screen.getByLabelText('Rol');
    const message = screen.getByText('Elige un rol');
    expect(select.getAttribute('aria-invalid')).toBe('true');
    expect(select.getAttribute('aria-describedby')).toBe(message.id);
  });
});
