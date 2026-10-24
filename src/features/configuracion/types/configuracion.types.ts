export interface ConfiguracionMarca {
  logo_url: string
  icono_url: string
}

export const marcaPredeterminada: ConfiguracionMarca = {
  logo_url: '/br-mantenimiento-logo.png',
  icono_url: '/br-icon.png',
}

export interface ConfiguracionOperativa {
  garantia_dias: number
  /** Configuración → General: recomendaciones con IA (Gemini) habilitadas. */
  ia_recomendaciones_activa: boolean
  /** Tiempo máximo de una consulta a la IA (2–60 s); pasado, se cancela y quedan las reglas. */
  ia_tiempo_espera_segundos: number
}

export interface ConfiguracionCorreo {
  notificar_cliente_activo: boolean
  modo_envio: 'clientes' | 'soporte'
  correo_soporte: string
}

export const correoPredeterminada: ConfiguracionCorreo = {
  notificar_cliente_activo: true,
  modo_envio: 'soporte',
  correo_soporte: 'servicioclientebr@gmail.com',
}
