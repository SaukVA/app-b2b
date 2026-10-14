import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router';

function RootLayout() {
  return <Outlet />;
}

// Provisional hasta que exista LoginPage (US1).
function LoginPlaceholder() {
  return <main>Inicio de sesión</main>;
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Navigate to="/login" replace /> },
      { path: 'login', element: <LoginPlaceholder /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
