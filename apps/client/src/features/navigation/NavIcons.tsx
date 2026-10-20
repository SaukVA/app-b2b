import type { CSSProperties, ReactNode } from 'react';

// Iconos del menú (lienzo «Albarán», sistema visual › Barra lateral): trazo de 18 px y 1,8. Clientes,
// Productos, Proveedores y Ajustes vienen de la barra lateral de los tableros; Ventas, Cobros y plegar, del
// diseño de 005 (T002).

function NavIcon({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      {children}
    </svg>
  );
}

export function VentasIcon() {
  return (
    <NavIcon>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </NavIcon>
  );
}

export function ClientesIcon() {
  return (
    <NavIcon>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.8.7 3 2.5 3.5 5.2" />
    </NavIcon>
  );
}

export function ProductosIcon() {
  return (
    <NavIcon>
      <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z" />
      <path d="M3 7.5 12 12l9-4.5M12 12v9" />
    </NavIcon>
  );
}

export function ProveedoresIcon() {
  return (
    <NavIcon>
      <path d="M2 6h11v10H2zM13 10h4l4 3v3h-8" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </NavIcon>
  );
}

export function CobrosIcon() {
  return (
    <NavIcon>
      <ellipse cx="12" cy="6" rx="7" ry="3" />
      <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
      <path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
    </NavIcon>
  );
}

export function AjustesIcon() {
  return (
    <NavIcon>
      <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="10" cy="12" r="2" />
      <circle cx="18" cy="18" r="2" />
    </NavIcon>
  );
}

/** Doble chevron hacia la izquierda («Plegar menú»); plegado gira 180° («Desplegar menú»). */
export function CollapseIcon({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <NavIcon style={{ transform: collapsed ? 'rotate(180deg)' : undefined }}>
      <path d="m11 17-5-5 5-5M18 17l-5-5 5-5" />
    </NavIcon>
  );
}
