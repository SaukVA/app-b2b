import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../../components/Button';
import { useAppDispatch } from '../../../store/store';
import { logout } from '../authSlice';

/** Sin "from": al volver a entrar se va a la pantalla de inicio, no a la última página visitada. */
export function LogoutButton({
  className,
  title,
  children = 'Cerrar sesión',
}: { className?: string; title?: string; children?: ReactNode } = {}) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  async function handleClick() {
    await dispatch(logout());
    void navigate('/login', { replace: true });
  }

  return (
    <Button
      variant="tertiary"
      className={className}
      title={title}
      onClick={() => void handleClick()}
    >
      {children}
    </Button>
  );
}
