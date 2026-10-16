import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { getDesktopBridge } from '../utils/desktop';

/** Ruta pública /ajustes/servidor (solo escritorio) mientras no exista Ajustes › Base de datos. */
export function ServerSettingsPlaceholder() {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    void getDesktopBridge()?.getServerUrl().then(setUrl);
  }, []);

  return (
    <main>
      <h1>Servidor</h1>
      <p>
        Servidor actual: <code>{url ?? '…'}</code>
      </p>
      <p>La configuración del servidor llegará con Ajustes › Base de datos.</p>
      <Link to="/login">Volver al inicio de sesión</Link>
    </main>
  );
}
