import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type {
  EstadoEquipoFinal,
  ReporteAtencionInput,
} from '@/features/operador/types/operador.types'
import type { PlantillaReporte } from '@/features/catalogos/types/catalogos.types'
import { etiquetaCategoriaFoto } from '@/features/catalogos/lib/categorias-foto-reporte'

const estilos = StyleSheet.create({
  page: { padding: 32, fontSize: 10, color: '#0f172a' },
  titulo: { fontSize: 16, fontWeight: 700, marginBottom: 2 },
  subtitulo: { fontSize: 10, color: '#475569', marginBottom: 16 },
  seccion: { marginBottom: 14 },
  encabezadoSeccion: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 6,
    borderBottom: '1pt solid #cbd5e1',
    paddingBottom: 3,
  },
  fila: { flexDirection: 'row', marginBottom: 3 },
  etiqueta: { width: 130, color: '#475569' },
  valor: { flex: 1 },
  checklistFila: { flexDirection: 'row', marginBottom: 3, alignItems: 'center' },
  checklistMarca: { width: 16, fontWeight: 700 },
  tablaFila: { flexDirection: 'row', borderBottom: '0.5pt solid #e2e8f0', paddingVertical: 3 },
  tablaCelda: { flex: 1 },
  fotosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  foto: { width: 150, marginBottom: 10 },
  fotoImagen: { width: 150, height: 110, objectFit: 'cover', borderRadius: 4 },
  fotoEtiqueta: { fontSize: 8, color: '#475569', marginTop: 2, textAlign: 'center' },
  firmasFila: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  firma: { width: '45%', alignItems: 'center' },
  firmaImagen: {
    width: '100%',
    height: 70,
    objectFit: 'contain',
    borderBottom: '1pt solid #0f172a',
  },
  firmaEtiqueta: { fontSize: 9, marginTop: 4, textAlign: 'center' },
})

const estadoEquipoLabel: Record<EstadoEquipoFinal, string> = {
  funcionando: 'Funcionando correctamente',
  parcial: 'Funcionamiento parcial',
  sin_funcionar: 'Sin funcionar',
}

const checklistPreguntas: { campo: keyof ReporteAtencionInput; texto: string }[] = [
  { campo: 'checklist_area_trabajo_segura', texto: '¿El área de trabajo quedó segura y limpia?' },
  { campo: 'checklist_equipo_probado', texto: '¿Se probó el funcionamiento del equipo?' },
  {
    campo: 'checklist_cliente_capacitado',
    texto: '¿Se capacitó al cliente sobre el uso/cuidado?',
  },
  { campo: 'checklist_requiere_seguimiento', texto: '¿Requiere una visita de seguimiento?' },
]

export interface ServiceReportFoto {
  url: string
  categoria: string | null
}

export interface ServiceReportMaterial {
  nombre: string
  cantidad: number
  unidad_medida: string
}

export interface ServiceReportPdfProps {
  numeroSolicitud: number
  nombreSolicitud: string
  cliente: string
  tipoSolicitud: string
  equipo: {
    nombre: string
    marca: string | null
    modelo: string | null
    serie: string | null
  } | null
  operador: string
  fecha: string
  horasTrabajadas: number
  narrativa: string
  materiales: ServiceReportMaterial[]
  fotos: ServiceReportFoto[]
  reporte: ReporteAtencionInput
  plantilla: PlantillaReporte
}

export function ServiceReportPdf({
  numeroSolicitud,
  nombreSolicitud,
  cliente,
  tipoSolicitud,
  equipo,
  operador,
  fecha,
  horasTrabajadas,
  narrativa,
  materiales,
  fotos,
  reporte,
  plantilla,
}: ServiceReportPdfProps) {
  const fotosHabilitadas = fotos.filter(
    (foto) => !foto.categoria || plantilla.categorias_fotos_habilitadas.includes(foto.categoria),
  )

  return (
    <Document>
      <Page size="A4" style={estilos.page}>
        <Text style={estilos.titulo}>Reporte de atención #{numeroSolicitud}</Text>
        <Text style={estilos.subtitulo}>
          {cliente} — {new Date(fecha).toLocaleString('es-CR')}
        </Text>

        <View style={estilos.seccion}>
          <Text style={estilos.encabezadoSeccion}>Datos generales y equipo</Text>
          <View style={estilos.fila}>
            <Text style={estilos.etiqueta}>Solicitud</Text>
            <Text style={estilos.valor}>{nombreSolicitud}</Text>
          </View>
          <View style={estilos.fila}>
            <Text style={estilos.etiqueta}>Tipo de servicio</Text>
            <Text style={estilos.valor}>{tipoSolicitud}</Text>
          </View>
          {plantilla.incluir_motivo_visita && (
            <View style={estilos.fila}>
              <Text style={estilos.etiqueta}>Motivo de la visita</Text>
              <Text style={estilos.valor}>{tipoSolicitud}</Text>
            </View>
          )}
          <View style={estilos.fila}>
            <Text style={estilos.etiqueta}>Equipo</Text>
            <Text style={estilos.valor}>
              {equipo
                ? [equipo.nombre, equipo.marca, equipo.modelo, equipo.serie]
                    .filter(Boolean)
                    .join(' — ')
                : 'No se asoció un equipo a esta solicitud.'}
            </Text>
          </View>
          <View style={estilos.fila}>
            <Text style={estilos.etiqueta}>Técnico</Text>
            <Text style={estilos.valor}>{operador}</Text>
          </View>
        </View>

        <View style={estilos.seccion}>
          <Text style={estilos.encabezadoSeccion}>Trabajos realizados</Text>
          <View style={estilos.fila}>
            <Text style={estilos.etiqueta}>Horas trabajadas</Text>
            <Text style={estilos.valor}>{horasTrabajadas}</Text>
          </View>
          <Text style={{ marginTop: 4 }}>{narrativa}</Text>
          {materiales.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <View style={estilos.tablaFila}>
                <Text style={[estilos.tablaCelda, { fontWeight: 700 }]}>Material</Text>
                <Text style={[estilos.tablaCelda, { fontWeight: 700 }]}>Cantidad</Text>
              </View>
              {materiales.map((material, index) => (
                <View key={index} style={estilos.tablaFila}>
                  <Text style={estilos.tablaCelda}>{material.nombre}</Text>
                  <Text style={estilos.tablaCelda}>
                    {material.cantidad} {material.unidad_medida}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {plantilla.incluir_checklist_condiciones && (
          <View style={estilos.seccion}>
            <Text style={estilos.encabezadoSeccion}>Checklist de condiciones</Text>
            {checklistPreguntas.map(({ campo, texto }) => (
              <View key={campo} style={estilos.checklistFila}>
                <Text style={estilos.checklistMarca}>{reporte[campo] ? 'Sí' : 'No'}</Text>
                <Text>{texto}</Text>
              </View>
            ))}
            {reporte.checklist_notas && (
              <Text style={{ marginTop: 4 }}>Notas: {reporte.checklist_notas}</Text>
            )}
          </View>
        )}

        {plantilla.incluir_fotos_categorizadas && fotosHabilitadas.length > 0 && (
          <View style={estilos.seccion}>
            <Text style={estilos.encabezadoSeccion}>Fotografías</Text>
            <View style={estilos.fotosGrid}>
              {fotosHabilitadas.map((foto, index) => (
                <View key={index} style={estilos.foto}>
                  <Image style={estilos.fotoImagen} src={foto.url} />
                  <Text style={estilos.fotoEtiqueta}>{etiquetaCategoriaFoto(foto.categoria)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={estilos.seccion}>
          <Text style={estilos.encabezadoSeccion}>Estado final del equipo</Text>
          <Text>{estadoEquipoLabel[reporte.estado_equipo_final]}</Text>
          {plantilla.incluir_recomendaciones && reporte.recomendaciones && (
            <View style={{ marginTop: 6 }}>
              <Text style={{ fontWeight: 700 }}>Recomendaciones</Text>
              <Text style={{ marginTop: 2 }}>{reporte.recomendaciones}</Text>
            </View>
          )}
        </View>

        <View style={estilos.seccion}>
          <Text style={estilos.encabezadoSeccion}>Firmas</Text>
          <View style={estilos.firmasFila}>
            <View style={estilos.firma}>
              {reporte.firma_tecnico && (
                <Image style={estilos.firmaImagen} src={reporte.firma_tecnico} />
              )}
              <Text style={estilos.firmaEtiqueta}>Firma del técnico — {operador}</Text>
            </View>
            <View style={estilos.firma}>
              {reporte.firma_cliente && (
                <Image style={estilos.firmaImagen} src={reporte.firma_cliente} />
              )}
              <Text style={estilos.firmaEtiqueta}>
                Firma del cliente — cédula {reporte.cedula_cliente_firma}
              </Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}
