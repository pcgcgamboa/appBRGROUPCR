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
}
