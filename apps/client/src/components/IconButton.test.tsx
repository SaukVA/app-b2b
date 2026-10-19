import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IconButton } from './IconButton';

const Dots = () => <svg aria-hidden="true" />;

describe('IconButton', () => {
  it('tiene como nombre accesible su aria-label', () => {
    render(<IconButton aria-label="Opciones de Ana" icon={<Dots />} />);
    expect(screen.getByRole('button', { name: 'Opciones de Ana' })).toBeTruthy();
  });

  it('llama a onClick al pulsarlo', async () => {
    const onClick = jest.fn();
    render(<IconButton aria-label="Opciones de Ana" icon={<Dots />} onClick={onClick} />);
    await userEvent.click(screen.getByRole('button', { name: 'Opciones de Ana' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('reenvía la ref y las props ARIA', () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <IconButton
        ref={ref}
        aria-label="Opciones de Ana"
        aria-haspopup="menu"
        aria-expanded={false}
        icon={<Dots />}
      />,
    );
    expect(ref.current).toBe(screen.getByRole('button'));
    expect(ref.current?.getAttribute('aria-haspopup')).toBe('menu');
    expect(ref.current?.getAttribute('aria-expanded')).toBe('false');
    expect(ref.current?.getAttribute('type')).toBe('button');
  });
});
