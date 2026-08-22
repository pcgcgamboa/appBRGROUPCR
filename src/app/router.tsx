import { Navigate, Route, BrowserRouter, Routes, useNavigate } from 'react-router-dom'
import { AvisoSupabaseNoConfigurado } from '@/components/molecules/aviso-supabase-no-configurado'
import { CargandoSesion } from '@/components/molecules/cargando-sesion'
import { AdminDashboardPage } from '@/components/pages/admin/admin-dashboard-page'
import { ClientesPage } from '@/components/pages/admin/clientes-page'
import { MarcaPage } from '@/components/pages/admin/marca-page'
import { MaterialesPage } from '@/components/pages/admin/materiales-page'
import { ProveedoresPage } from '@/components/pages/admin/proveedores-page'
import { RolesPage } from '@/components/pages/admin/roles-page'
import { TiposPage } from '@/components/pages/admin/tipos-page'
import { UsuariosPage } from '@/components/pages/admin/usuarios-page'
import { VehiculosPage } from '@/components/pages/admin/vehiculos-page'
import { BandejaEncargadoPage } from '@/components/pages/encargado/bandeja-encargado-page'
import { ControlRutasPage } from '@/components/pages/encargado/control-rutas-page'
import { EncargadoDashboardPage } from '@/components/pages/encargado/encargado-dashboard-page'
import { NotificacionesPage } from '@/components/pages/encargado/notificaciones-page'
import {
  ClienteDocumentosRoute,
  ClientePage,
  ClienteSolicitudesRoute,
  ClienteTrackingRoute,
  ClienteValidacionesRoute,
} from '@/components/pages/cliente/cliente-page'
import { BolsaEmpleoPage } from '@/components/pages/bolsa-empleo-page'
import { InicioPage } from '@/components/pages/inicio-page'
import { LoginPage } from '@/components/pages/login-page'
import { OperationsHomePage } from '@/components/pages/operations-home-page'
import { OperadorPage } from '@/components/pages/operador/operador-page'
import { ReportesPage } from '@/components/pages/reportes/reportes-page'
import { SolicitantePage } from '@/components/pages/solicitante/solicitante-page'
import { AppShell } from '@/components/templates/app-shell'
import { usePerfilActual } from '@/features/auth/hooks/use-perfil-actual'
import { useSession } from '@/features/auth/hooks/use-session'
import { supabaseConfigurado } from '@/lib/supabase'
import { RequireRole, RequireSession } from '@/app/route-guards'
import { RoleShell } from '@/app/role-shell'

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
          <Route path="/bolsa-empleo" element={<BolsaEmpleoPage />} />
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/" element={<InicioPage />} />

          <Route element={<RequireSession />}>
            <Route element={<RequireRole rol="administrador" />}>
              <Route path="/administrador" element={<AdministradorRoute />}>
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
              <Route path="/encargado" element={<EncargadoRoute />}>
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
              <Route path="/solicitante" element={<SolicitanteRoute />} />
            </Route>

            <Route element={<RequireRole rol="operador" />}>
              <Route path="/operador" element={<OperadorRoute />} />
            </Route>

            <Route element={<RequireRole rol="cliente" />}>
              <Route path="/cliente" element={<ClienteRoute />}>
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
