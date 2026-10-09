import { Package, X } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Button } from '@/components/atoms/button'
import { CatalogManager } from '@/components/organisms/catalog-manager'
import type { CampoCatalogo, Material, Proveedor } from '@/features/catalogos/types/catalogos.types'

const supplierFields: CampoCatalogo[] = [
  { name: 'nombre', label: 'Proveedor', required: true },
  { name: 'identificacion', label: 'Identificación' },
  { name: 'persona_contacto', label: 'Persona de contacto', required: true },
  { name: 'telefono', label: 'Teléfono', required: true },
  { name: 'celular', label: 'Celular' },
  { name: 'correo', label: 'Correo', type: 'email' },
  {
    name: 'articulos_provee',
    label: 'Resumen de artículos que provee',
    type: 'textarea',
    required: true,
  },
  { name: 'provincia', label: 'Provincia', required: true },
  { name: 'canton', label: 'Cantón', required: true },
  { name: 'distrito', label: 'Distrito', required: true },
  { name: 'direccion', label: 'Dirección exacta', type: 'textarea' },
  { name: 'activo', label: 'Proveedor activo', type: 'checkbox' },
]

const esProductoProveedor = (item: Material) => item.categoria === 'producto_proveedor'
const valoresProducto = {
  categoria: 'producto_proveedor',
  naturaleza_provision: 'material',
  numero_activo: null,
}

export function ProveedoresPage() {
  const [proveedorProductos, setProveedorProductos] = useState<Proveedor | null>(null)
  const panelProductosRef = useRef<HTMLDivElement>(null)
  const productFields = useMemo<CampoCatalogo[]>(
    () => [
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
      { name: 'descripcion', label: 'Descripción', type: 'textarea' },
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
    [],
  )

  function gestionarProductos(proveedor: Proveedor) {
    setProveedorProductos(proveedor)
    requestAnimationFrame(() =>
      panelProductosRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    )
  }
  return (
    <div className="space-y-10">
      <CatalogManager<Proveedor>
        tabla="proveedores"
        title="Proveedores"
        description="Administre los contactos y la ubicación de los proveedores."
        fields={supplierFields}
        extraActions={(proveedor) => (
          <Button
            variant="outline"
            size="icon"
            aria-label={'Gestionar productos de ' + proveedor.nombre}
            title="Gestionar productos"
            onClick={() => gestionarProductos(proveedor)}
          >
            <Package className="size-4" aria-hidden="true" />
          </Button>
        )}
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
          telefono: 'Teléfono',
          correo: 'Correo',
          articulos_provee: 'Artículos',
          provincia: 'Ubicación',
          activo: 'Activo',
        }}
      />

      {proveedorProductos && (
        <div ref={panelProductosRef} className="scroll-mt-24">
          <CatalogManager<Material>
            tabla="materiales"
            key={proveedorProductos.id}
            title={`Productos de ${proveedorProductos.nombre}`}
            description="Administre únicamente los productos y servicios del proveedor seleccionado."
            fields={productFields}
            defaultValues={{ ...valoresProducto, proveedor_id: proveedorProductos.id }}
            filterItem={(item) =>
              esProductoProveedor(item) && item.proveedor_id === proveedorProductos.id
            }
            headerActions={
              <Button variant="outline" onClick={() => setProveedorProductos(null)}>
                <X className="mr-2 size-4" />
                Cerrar productos
              </Button>
            }
            columns={[
              'naturaleza_provision',
              'nombre',
              'unidad_medida',
              'tipo_costo',
              'costo_referencial',
              'activo',
            ]}
            columnLabels={{
              nombre: 'Producto',
              unidad_medida: 'Unidad',
              tipo_costo: 'Modalidad',
              costo_referencial: 'Costo',
              activo: 'Activo',
            }}
            renderCell={(item, column) => {
              if (column === 'naturaleza_provision')
                return item.naturaleza_provision === 'servicio' ? 'Servicio' : 'Material'

              if (column === 'tipo_costo') return item.tipo_costo === 'hora' ? 'Por hora' : 'Fijo'
              return String(item[column as keyof Material] ?? '—')
            }}
          />
        </div>
      )}
    </div>
  )
}
