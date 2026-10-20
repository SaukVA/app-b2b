import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OptionGroup } from './OptionGroup';

const OPTIONS = [
  { value: 'light', label: 'Claro', description: 'Papel y tinta.' },
  { value: 'dark', label: 'Oscuro' },
  { value: 'system', label: 'Según el sistema' },
];

function renderGroup(value = 'light', onChange = jest.fn()) {
  render(<OptionGroup label="Tema" options={OPTIONS} value={value} onChange={onChange} />);
  return onChange;
}

const radio = (name: RegExp) => screen.getByRole('radio', { name });

describe('OptionGroup', () => {
  it('es un radiogroup etiquetado con una opción radio por valor', () => {
    renderGroup();
    expect(screen.getByRole('radiogroup', { name: 'Tema' })).toBeTruthy();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(radio(/Claro/).getAttribute('aria-checked')).toBe('true');
    expect(radio(/Oscuro/).getAttribute('aria-checked')).toBe('false');
  });

  it('acepta aria-labelledby en lugar de label', () => {
    render(
      <>
        <span id="dens">Densidad de tablas</span>
        <OptionGroup labelledBy="dens" options={OPTIONS} value="dark" onChange={jest.fn()} />
      </>,
    );
    expect(screen.getByRole('radiogroup', { name: 'Densidad de tablas' })).toBeTruthy();
  });
});

describe('OptionGroup con teclado y ratón', () => {
  it('solo la opción marcada está en el orden de tabulación', () => {
    renderGroup('dark');
    expect(radio(/Oscuro/).tabIndex).toBe(0);
    expect(radio(/Claro/).tabIndex).toBe(-1);
    expect(radio(/Según el sistema/).tabIndex).toBe(-1);
  });

  it('las flechas mueven el foco y seleccionan, con vuelta al principio', async () => {
    const onChange = renderGroup('system');
    radio(/Según el sistema/).focus();

    await userEvent.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(radio(/Claro/));
    expect(onChange).toHaveBeenLastCalledWith('light');

    await userEvent.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(radio(/Según el sistema/));
    expect(onChange).toHaveBeenLastCalledWith('system');
  });

  it('avisa también al pulsar la opción ya marcada (reintento de guardado)', async () => {
    const onChange = renderGroup('light');
    await userEvent.click(radio(/Claro/));
    expect(onChange).toHaveBeenCalledWith('light');
  });

  it('indica la opción marcada también como texto, no solo por color', () => {
    renderGroup('dark');
    expect(radio(/Oscuro/).textContent).toContain('Seleccionado');
    expect(radio(/Claro/).textContent).not.toContain('Seleccionado');
  });
});
