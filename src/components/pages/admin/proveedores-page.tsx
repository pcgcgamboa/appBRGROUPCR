import { useMemo } from 'react'
import { CatalogManager } from '@/components/organisms/catalog-manager'
import { useCatalogo } from '@/features/catalogos/hooks/use-catalogo'
import type { CampoCatalogo, Material, Proveedor } from '@/features/catalogos/types/catalogos.types'

const supplierFields: CampoCatalogo[] = [
  { name: 'nombre', label: 'Proveedor', required: true },
  { name: 'identificacion', label: 'IdentificaciÃ³n' },
  { name: 'persona_contacto', label: 'Persona de contacto', required: true },
  { name: 'telefono', label: 'TelÃ©fono', required: true },
  { name: 'celular', label: 'Celular' },
  { name: 'correo', label: 'Correo', type: 'email' },
  {
    name: 'articulos_provee',
    label: 'Resumen de artÃ­culos que provee',
    type: 'textarea',
    required: true,
  },
  { name: 'provincia', label: 'Provincia', required: true },
  { name: 'canton', label: 'CantÃ³n', required: true },
  { name: 'distrito', label: 'Distrito', required: true },
  { name: 'direccion', label: 'DirecciÃ³n exacta', type: 'textarea' },
  { name: 'activo', label: 'Proveedor activo', type: 'checkbox' },
]

const esProductoProveedor = (item: Material) => item.categoria === 'producto_proveedor'
const valoresProducto = {
  categoria: 'producto_proveedor',
  naturaleza_provision: 'material',
  numero_activo: null,
}

export function ProveedoresPage() {
  const { listado: proveedores } = useCatalogo<Proveedor>('proveedores')
  const productFields = useMemo<CampoCatalogo[]>(
    () => [
      {
        name: 'proveedor_id',
        label: 'Proveedor',
        type: 'select',
        required: true,
        options:
          proveedores.data
            ?.filter((proveedor) => proveedor.activo)
            .map((proveedor) => ({ value: proveedor.id, label: proveedor.nombre })) ?? [],
      },
      {
        name: 'naturaleza_provision',
        label: 'Tipo de oferta',
        type: 'select',
        required: true,
        options: [
          { value: 'material', label: 'Material' },
          { value: 'servicio', label: 'Servicio' },
        ],
      },
      { name: 'nombre', label: 'Producto o servicio', required: true },
      { name: 'descripcion', label: 'DescripciÃ³n', type: 'textarea' },
      { name: 'unidad_medida', label: 'Unidad de cobro', required: true },
      {
        name: 'tipo_costo',
        label: 'Modalidad de costo',
        type: 'select',
        required: true,
        options: [
          { value: 'fijo', label: 'Costo fijo' },
          { value: 'hora', label: 'Costo por hora' },
        ],
      },
      {
        name: 'costo_referencial',
        label: 'Costo',
        type: 'number',
        step: '0.01',
        required: true,
      },
      { name: 'activo', label: 'Producto activo', type: 'checkbox' },
    ],
    [proveedores.data],
  )
  const nombresProveedores = useMemo(
    () => new Map(proveedores.data?.map((proveedor) => [proveedor.id, proveedor.nombre]) ?? []),
    [proveedores.data],
  )

  return (
    <div className="space-y-10">
      <CatalogManager<Proveedor>
        tabla="proveedores"
        title="Proveedores"
        description="Administre los contactos y la ubicaciÃ³n de los proveedores."
        fields={supplierFields}
        columns={[
          'nombre',
          'persona_contacto',
          'telefono',
          'correo',
          'articulos_provee',
          'provincia',
          'activo',
        ]}
        columnLabels={{
          nombre: 'Proveedor',
          persona_contacto: 'Contacto',
          telefono: 'TelÃ©fono',
          correo: 'Correo',
          articulos_provee: 'ArtÃ­culos',
          provincia: 'UbicaciÃ³n',
          activo: 'Activo',
        }}
      />

      <CatalogManager<Material>
        tabla="materiales"
        title="Productos provistos"
        description="Registre productos o servicios de cada proveedor y defina si su costo es fijo o por hora."
        fields={productFields}
        defaultValues={valoresProducto}
        filterItem={esProductoProveedor}
        columns={[
          'proveedor_id',
          'naturaleza_provision',
          'nombre',
          'unidad_medida',
          'tipo_costo',
          'costo_referencial',
          'activo',
        ]}
        columnLabels={{
          proveedor_id: 'Proveedor',
          nombre: 'Producto',
          unidad_medida: 'Unidad',
          tipo_costo: 'Modalidad',
          costo_referencial: 'Costo',
          activo: 'Activo',
        }}
        renderCell={(item, column) => {
          if (column === 'naturaleza_provision')
            return item.naturaleza_provision === 'servicio' ? 'Servicio' : 'Material'
          if (column === 'proveedor_id')
            return item.proveedor_id
              ? (nombresProveedores.get(item.proveedor_id) ?? 'Proveedor')
              : 'â€”'
          if (column === 'tipo_costo') return item.tipo_costo === 'hora' ? 'Por hora' : 'Fijo'
          return String(item[column as keyof Material] ?? 'â€”')
        }}
      />
    </div>
  )
}
