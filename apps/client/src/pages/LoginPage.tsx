import { Navigate, useLocation } from 'react-router';
import { selectIsAuthenticated, selectUser } from '../features/auth/authSelectors';
import { LoginForm } from '../features/auth/components/LoginForm';
import { LoginHero } from '../features/auth/components/LoginHero';
import { resolveHomeRoute } from '../routes/homeRoute';
import { useAppSelector } from '../store/store';
import styles from './LoginPage.module.css';

/** Pantalla «Login» del diseño «Albarán»: hero + formulario. Con sesión, lleva a su pantalla de inicio. */
export function LoginPage() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectUser);
  const from = (useLocation().state as { from?: string } | null)?.from ?? null;
  if (isAuthenticated && user) return <Navigate to={resolveHomeRoute(user, from)} replace />;
  return (
    <div className={styles.page}>
      <LoginHero />
      <main className={styles.main}>
        <LoginForm />
      </main>
    </div>
  );
}
