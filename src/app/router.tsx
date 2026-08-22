import { lazy, Suspense } from 'react'
import { Navigate, Route, BrowserRouter, Routes, useNavigate } from 'react-router-dom'
import { AvisoSupabaseNoConfigurado } from '@/components/molecules/aviso-supabase-no-configurado'
import { CargandoRuta } from '@/components/molecules/cargando-ruta'
import { CargandoSesion } from '@/components/molecules/cargando-sesion'
import { AppShell } from '@/components/templates/app-shell'
import { usePerfilActual } from '@/features/auth/hooks/use-perfil-actual'
import { useSession } from '@/features/auth/hooks/use-session'
import { supabaseConfigurado } from '@/lib/supabase'
import { RequireRole, RequireSession } from '@/app/route-guards'
import { RoleShell } from '@/app/role-shell'

// Cada página vive en su propio chunk, descargado solo cuando se navega a su ruta — antes,
// router.tsx importaba estáticamente las ~24 páginas de los 5 roles, así que abrir la app como
// cualquier rol descargaba el código de los otros 4. `Suspense` está en dos niveles: uno en
// `AppShell` (para la primera carga de cada rama de rol) y uno anidado dentro de cada shell con
// sub-secciones propias (admin/encargado/cliente), para que solo el contenido interno muestre el
// indicador de carga al cambiar de sección — el encabezado y la barra lateral no deben parpadear.
const AdminDashboardPage = lazy(() =>
  import('@/components/pages/admin/admin-dashboard-page').then((m) => ({
    default: m.AdminDashboardPage,
  })),
)
const ClientesPage = lazy(() =>
  import('@/components/pages/admin/clientes-page').then((m) => ({ default: m.ClientesPage })),
)
const MarcaPage = lazy(() =>
  import('@/components/pages/admin/marca-page').then((m) => ({ default: m.MarcaPage })),
)
const MaterialesPage = lazy(() =>
  import('@/components/pages/admin/materiales-page').then((m) => ({
    default: m.MaterialesPage,
  })),
)
const ProveedoresPage = lazy(() =>
  import('@/components/pages/admin/proveedores-page').then((m) => ({
    default: m.ProveedoresPage,
  })),
)
const RolesPage = lazy(() =>
  import('@/components/pages/admin/roles-page').then((m) => ({ default: m.RolesPage })),
)
const TiposPage = lazy(() =>
  import('@/components/pages/admin/tipos-page').then((m) => ({ default: m.TiposPage })),
)
const UsuariosPage = lazy(() =>
  import('@/components/pages/admin/usuarios-page').then((m) => ({ default: m.UsuariosPage })),
)
const VehiculosPage = lazy(() =>
  import('@/components/pages/admin/vehiculos-page').then((m) => ({ default: m.VehiculosPage })),
)
const BandejaEncargadoPage = lazy(() =>
  import('@/components/pages/encargado/bandeja-encargado-page').then((m) => ({
    default: m.BandejaEncargadoPage,
  })),
)
const ControlRutasPage = lazy(() =>
  import('@/components/pages/encargado/control-rutas-page').then((m) => ({
    default: m.ControlRutasPage,
  })),
)
const EncargadoDashboardPage = lazy(() =>
  import('@/components/pages/encargado/encargado-dashboard-page').then((m) => ({
    default: m.EncargadoDashboardPage,
  })),
)
const NotificacionesPage = lazy(() =>
  import('@/components/pages/encargado/notificaciones-page').then((m) => ({
    default: m.NotificacionesPage,
  })),
)
const ClientePage = lazy(() =>
  import('@/components/pages/cliente/cliente-page').then((m) => ({ default: m.ClientePage })),
)
const ClienteSolicitudesRoute = lazy(() =>
  import('@/components/pages/cliente/cliente-page').then((m) => ({
    default: m.ClienteSolicitudesRoute,
  })),
)
const ClienteDocumentosRoute = lazy(() =>
  import('@/components/pages/cliente/cliente-page').then((m) => ({
    default: m.ClienteDocumentosRoute,
  })),
)
const ClienteTrackingRoute = lazy(() =>
  import('@/components/pages/cliente/cliente-page').then((m) => ({
    default: m.ClienteTrackingRoute,
  })),
)
const ClienteValidacionesRoute = lazy(() =>
  import('@/components/pages/cliente/cliente-page').then((m) => ({
    default: m.ClienteValidacionesRoute,
  })),
)
const BolsaEmpleoPage = lazy(() =>
  import('@/components/pages/bolsa-empleo-page').then((m) => ({ default: m.BolsaEmpleoPage })),
)
const InicioPage = lazy(() =>
  import('@/components/pages/inicio-page').then((m) => ({ default: m.InicioPage })),
)
const LoginPage = lazy(() =>
  import('@/components/pages/login-page').then((m) => ({ default: m.LoginPage })),
)
const OperationsHomePage = lazy(() =>
  import('@/components/pages/operations-home-page').then((m) => ({
    default: m.OperationsHomePage,
  })),
)
const OperadorPage = lazy(() =>
  import('@/components/pages/operador/operador-page').then((m) => ({
    default: m.OperadorPage,
  })),
)
const ReportesPage = lazy(() =>
  import('@/components/pages/reportes/reportes-page').then((m) => ({
    default: m.ReportesPage,
  })),
)
const SolicitantePage = lazy(() =>
  import('@/components/pages/solicitante/solicitante-page').then((m) => ({
    default: m.SolicitantePage,
  })),
)

/** `/login`: si ya hay sesión activa, redirige a `/` (que decide el rol activo). */
function LoginRoute() {
  const { session, cargando } = useSession()

  if (cargando) return <CargandoSesion />
  if (session) return <Navigate to="/" replace />

  return supabaseConfigurado ? <LoginPage /> : <AvisoSupabaseNoConfigurado />
}

/** Sección "home" de administrador/encargado: dashboard operativo con acceso rápido a solicitudes. */
function InicioOperacionesRoute({ rutaSolicitudes }: { rutaSolicitudes: string }) {
  const navigate = useNavigate()
  return <OperationsHomePage onOpenSolicitudes={() => navigate(rutaSolicitudes)} />
}

function AdministradorRoute() {
  return (
    <RoleShell rol="administrador">
      <AdminDashboardPage />
    </RoleShell>
  )
}

function EncargadoRoute() {
  return (
    <RoleShell rol="encargado">
      <EncargadoDashboardPage />
    </RoleShell>
  )
}

function SolicitanteRoute() {
  const { session } = useSession()
  const perfil = usePerfilActual(session?.user.id)
  if (!session) return null
  return (
    <RoleShell rol="solicitante">
      <SolicitantePage usuarioId={session.user.id} clienteId={perfil.data?.cliente_id ?? null} />
    </RoleShell>
  )
}

function OperadorRoute() {
  const { session } = useSession()
  if (!session) return null
  return (
    <RoleShell rol="operador">
      <OperadorPage usuarioId={session.user.id} />
    </RoleShell>
  )
}

function ClienteRoute() {
  const { session } = useSession()
  const perfil = usePerfilActual(session?.user.id)
  if (!session) return null
  return (
    <RoleShell rol="cliente">
      <ClientePage usuarioId={session.user.id} clienteId={perfil.data?.cliente_id ?? null} />
    </RoleShell>
  )
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route
            path="/bolsa-empleo"
            element={
              <Suspense fallback={<CargandoRuta />}>
                <BolsaEmpleoPage />
              </Suspense>
            }
          />
          <Route
            path="/login"
            element={
              <Suspense fallback={<CargandoRuta />}>
                <LoginRoute />
              </Suspense>
            }
          />
          <Route
            path="/"
            element={
              <Suspense fallback={<CargandoRuta />}>
                <InicioPage />
              </Suspense>
            }
          />

          <Route element={<RequireSession />}>
            <Route element={<RequireRole rol="administrador" />}>
              <Route
                path="/administrador"
                element={
                  <Suspense fallback={<CargandoRuta />}>
                    <AdministradorRoute />
                  </Suspense>
                }
              >
                <Route index element={<Navigate to="home" replace />} />
                <Route
                  path="home"
                  element={<InicioOperacionesRoute rutaSolicitudes="/administrador/solicitudes" />}
                />
                <Route path="solicitudes" element={<BandejaEncargadoPage />} />
                <Route path="rutas" element={<ControlRutasPage />} />
                <Route path="notificaciones" element={<NotificacionesPage />} />
                <Route path="reportes" element={<ReportesPage />} />
                <Route path="clientes" element={<ClientesPage />} />
                <Route path="tipos" element={<TiposPage />} />
                <Route path="materiales" element={<MaterialesPage />} />
                <Route path="vehiculos" element={<VehiculosPage />} />
                <Route path="usuarios" element={<UsuariosPage />} />
                <Route path="proveedores" element={<ProveedoresPage />} />
                <Route path="roles" element={<RolesPage />} />
                <Route path="marca" element={<MarcaPage />} />
              </Route>
            </Route>

            <Route element={<RequireRole rol="encargado" />}>
              <Route
                path="/encargado"
                element={
                  <Suspense fallback={<CargandoRuta />}>
                    <EncargadoRoute />
                  </Suspense>
                }
              >
                <Route index element={<Navigate to="home" replace />} />
                <Route
                  path="home"
                  element={<InicioOperacionesRoute rutaSolicitudes="/encargado/solicitudes" />}
                />
                <Route path="solicitudes" element={<BandejaEncargadoPage />} />
                <Route path="rutas" element={<ControlRutasPage />} />
                <Route path="notificaciones" element={<NotificacionesPage />} />
                <Route path="reportes" element={<ReportesPage />} />
              </Route>
            </Route>

            <Route element={<RequireRole rol="solicitante" />}>
              <Route
                path="/solicitante"
                element={
                  <Suspense fallback={<CargandoRuta />}>
                    <SolicitanteRoute />
                  </Suspense>
                }
              />
            </Route>

            <Route element={<RequireRole rol="operador" />}>
              <Route
                path="/operador"
                element={
                  <Suspense fallback={<CargandoRuta />}>
                    <OperadorRoute />
                  </Suspense>
                }
              />
            </Route>

            <Route element={<RequireRole rol="cliente" />}>
              <Route
                path="/cliente"
                element={
                  <Suspense fallback={<CargandoRuta />}>
                    <ClienteRoute />
                  </Suspense>
                }
              >
                <Route index element={<Navigate to="solicitudes" replace />} />
                <Route path="solicitudes" element={<ClienteSolicitudesRoute />} />
                <Route path="validaciones" element={<ClienteValidacionesRoute />} />
                <Route path="tracking" element={<ClienteTrackingRoute />} />
                <Route path="documentos" element={<ClienteDocumentosRoute />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
