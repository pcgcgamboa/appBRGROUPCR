import { useMemo } from 'react'
import { CatalogManager } from '@/components/organisms/catalog-manager'
import { ToolAssignments } from '@/components/organisms/tool-assignments'
import { useCatalogo } from '@/features/catalogos/hooks/use-catalogo'
import type { CampoCatalogo, Material, Proveedor } from '@/features/catalogos/types/catalogos.types'

export function MaterialesPage() {
  const { listado: proveedores } = useCatalogo<Proveedor>('proveedores')
  const fields = useMemo<CampoCatalogo[]>(
    () => [
      {
        name: 'categoria',
        label: 'Categoría',
        type: 'select',
        required: true,
        options: [
          { value: 'material', label: 'Material' },
          { value: 'herramienta', label: 'Herramienta' },
          { value: 'producto_proveedor', label: 'Producto de proveedor' },
        ],
      },
      { name: 'nombre', label: 'Nombre', required: true },
      { name: 'descripcion', label: 'Descripción', type: 'textarea' },
      { name: 'unidad_medida', label: 'Unidad de medida', required: true },
      {
        name: 'numero_activo',
        label: 'Número de activo',
        required: true,
        visibleWhen: { field: 'categoria', equals: 'herramienta' },
      },
      {
        name: 'proveedor_id',
        label: 'Proveedor',
        type: 'select',
        required: true,
        options:
          proveedores.data
            ?.filter((proveedor) => proveedor.activo)
            .map((proveedor) => ({ value: proveedor.id, label: proveedor.nombre })) ?? [],
        visibleWhen: { field: 'categoria', equals: 'producto_proveedor' },
      },
      {
        name: 'tipo_costo',
        label: 'Modalidad de costo',
        type: 'select',
        required: true,
        options: [
          { value: 'fijo', label: 'Costo fijo' },
          { value: 'hora', label: 'Costo por hora' },
        ],
        visibleWhen: { field: 'categoria', equals: 'producto_proveedor' },
      },
      {
        name: 'costo_referencial',
        label: 'Costo asociado',
        type: 'number',
        step: '0.01',
      },
      { name: 'activo', label: 'Elemento activo', type: 'checkbox' },
    ],
    [proveedores.data],
  )
  const nombresProveedores = useMemo(
    () => new Map(proveedores.data?.map((proveedor) => [proveedor.id, proveedor.nombre]) ?? []),
    [proveedores.data],
  )
  const etiquetasCategoria: Record<Material['categoria'], string> = {
    material: 'Material',
    herramienta: 'Herramienta',
    producto_proveedor: 'Producto de proveedor',
  }

  return (
    <div className="space-y-8">
      <CatalogManager<Material>
        tabla="materiales"
        title="Inventario"
        description="Administre materiales, herramientas y productos provistos por proveedores."
        fields={fields}
        defaultValues={{ categoria: 'material', tipo_costo: 'fijo' }}
        columns={[
          'categoria',
          'nombre',
          'numero_activo',
          'proveedor_id',
          'unidad_medida',
          'tipo_costo',
          'costo_referencial',
          'activo',
        ]}
        columnLabels={{
          categoria: 'Categoría',
          nombre: 'Elemento',
          numero_activo: 'Activo',
          proveedor_id: 'Proveedor',
          unidad_medida: 'Unidad',
          tipo_costo: 'Costo',
          costo_referencial: 'Monto',
          activo: 'Estado',
        }}
        renderCell={(item, column) => {
          if (column === 'categoria') return etiquetasCategoria[item.categoria]
          if (column === 'proveedor_id')
            return item.proveedor_id
              ? (nombresProveedores.get(item.proveedor_id) ?? 'Proveedor')
              : '—'
          if (column === 'tipo_costo') return item.tipo_costo === 'hora' ? 'Por hora' : 'Fijo'
          return String(item[column as keyof Material] ?? '—')
        }}
        sortAccessors={{
          categoria: (item) => etiquetasCategoria[item.categoria],
          proveedor_id: (item) =>
            item.proveedor_id ? (nombresProveedores.get(item.proveedor_id) ?? null) : null,
        }}
      />
      <ToolAssignments />
    </div>
  )
}
