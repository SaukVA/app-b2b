import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('es type="button" por defecto y responde al clic', async () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Entrar</Button>);
    const button = screen.getByRole('button', { name: 'Entrar' });
    expect(button.getAttribute('type')).toBe('button');
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('aplica la variante pedida', () => {
    render(<Button variant="secondary">Cancelar</Button>);
    expect(screen.getByRole('button').className).toContain('secondary');
  });

  it('no dispara el clic si está deshabilitado', async () => {
    const onClick = jest.fn();
    render(
      <Button disabled onClick={onClick}>
        Entrar
      </Button>,
    );
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });
});
