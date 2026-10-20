import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Menu } from './Menu';

function renderMenu(onEdit = jest.fn(), onBlock = jest.fn()) {
  render(
    <>
      <Menu
        label="Opciones de Ana"
        items={[
          { label: 'Editar nombre, email o rol', onSelect: onEdit },
          { label: 'Bloquear', onSelect: onBlock, tone: 'danger' },
        ]}
      />
      <button>Fuera</button>
    </>,
  );
  return { onEdit, onBlock, trigger: screen.getByRole('button', { name: 'Opciones de Ana' }) };
}

describe('Menu', () => {
  it('el disparador abre el menú y refleja aria-expanded', async () => {
    const { trigger } = renderMenu();
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('menu')).toBeNull();
    await userEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getAllByRole('menuitem')).toHaveLength(2);
    expect(document.activeElement).toBe(screen.getAllByRole('menuitem')[0]);
  });

  it('se navega con las flechas y Enter elige la opción y cierra', async () => {
    const { onBlock } = renderMenu();
    await userEvent.click(screen.getByRole('button', { name: 'Opciones de Ana' }));
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Bloquear' }));
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(
      screen.getByRole('menuitem', { name: 'Editar nombre, email o rol' }),
    );
    await userEvent.keyboard('{ArrowUp}{Enter}');
    expect(onBlock).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('Escape cierra y devuelve el foco al disparador', async () => {
    const { trigger } = renderMenu();
    await userEvent.click(trigger);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('un clic fuera cierra el menú', async () => {
    const { onEdit } = renderMenu();
    await userEvent.click(screen.getByRole('button', { name: 'Opciones de Ana' }));
    await userEvent.click(screen.getByRole('button', { name: 'Fuera' }));
    expect(screen.queryByRole('menu')).toBeNull();
    expect(onEdit).not.toHaveBeenCalled();
  });
});
