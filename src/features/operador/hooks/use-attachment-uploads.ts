import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { nombreSeguro, validarArchivo } from '@/features/operador/lib/adjuntos'
import type {
  AdjuntoAvanceInput,
  AttachmentUploadItem,
} from '@/features/operador/types/operador.types'

const BUCKET = 'solicitudes-adjuntos'

async function subirArchivo(
  solicitudId: string,
  item: AttachmentUploadItem,
): Promise<AttachmentUploadItem> {
  if (!supabase) return { ...item, estado: 'error', error: 'Supabase no está configurado.' }
  if (!item.file) return item
  try {
    const id = crypto.randomUUID()
    const ruta_storage = `${solicitudId}/${id}/${nombreSeguro(item.file.name)}`
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(ruta_storage, item.file, { contentType: item.file.type, upsert: false })
    if (error) throw error
    const adjunto: AdjuntoAvanceInput = {
      id,
      nombre_archivo: item.file.name,
      ruta_storage,
      tipo: item.file.type.startsWith('image/') ? 'imagen' : 'documento',
      mime_type: item.file.type,
      tamano_bytes: item.file.size,
    }
    return { ...item, estado: 'listo', adjunto, error: undefined }
  } catch (error) {
    return {
      ...item,
      estado: 'error',
      error: error instanceof Error ? error.message : 'No se pudo subir el archivo.',
    }
  }
}

/**
 * Sube adjuntos de a uno, preservando lo ya subido ante fallos parciales: uploadAll()
 * sólo procesa items pendientes o en error, nunca reintenta uno ya "listo". cancelar()
 * es la única vía de rollback real (borra del bucket lo ya subido).
 */
export function useAttachmentUploads() {
  const [items, setItems] = useState<AttachmentUploadItem[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const subiendoRef = useRef(false)
  const itemsRef = useRef(items)
  itemsRef.current = items

  useEffect(() => {
    return () => {
      itemsRef.current.forEach((item) => item.previewUrl && URL.revokeObjectURL(item.previewUrl))
    }
  }, [])

  function addFiles(files: File[]) {
    const nuevos: AttachmentUploadItem[] = files.map((file) => {
      const error = validarArchivo(file)
      return {
        localId: crypto.randomUUID(),
        file,
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        estado: error ? 'error' : 'pendiente',
        error: error ?? undefined,
      }
    })
    setItems((current) => [...current, ...nuevos])
  }

  function removeFile(localId: string) {
    setItems((current) => {
      const item = current.find((i) => i.localId === localId)
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl)
      return current.filter((i) => i.localId !== localId)
    })
  }

  function retryFile(localId: string) {
    setItems((current) =>
      current.map((item) =>
        item.localId === localId ? { ...item, estado: 'pendiente', error: undefined } : item,
      ),
    )
  }

  const uploadAll = useCallback(
    async (solicitudId: string) => {
      if (subiendoRef.current) return
      subiendoRef.current = true
      setIsUploading(true)
      try {
        const pendientes = items.filter(
          (item) => item.estado === 'pendiente' || item.estado === 'error',
        )
        for (const objetivo of pendientes) {
          setItems((current) =>
            current.map((item) =>
              item.localId === objetivo.localId
                ? { ...item, estado: 'subiendo', error: undefined }
                : item,
            ),
          )
          const resultado = await subirArchivo(solicitudId, objetivo)
          setItems((current) =>
            current.map((item) => (item.localId === objetivo.localId ? resultado : item)),
          )
        }
      } finally {
        subiendoRef.current = false
        setIsUploading(false)
      }
    },
    [items],
  )

  async function cancelar() {
    if (supabase) {
      const rutas = items
        .filter((item) => item.estado === 'listo' && item.adjunto)
        .map((item) => item.adjunto!.ruta_storage)
      if (rutas.length) await supabase.storage.from(BUCKET).remove(rutas)
    }
    items.forEach((item) => item.previewUrl && URL.revokeObjectURL(item.previewUrl))
    setItems([])
  }

  function reset() {
    items.forEach((item) => item.previewUrl && URL.revokeObjectURL(item.previewUrl))
    setItems([])
  }

  const listos = items.filter((item) => item.estado === 'listo')
  const conError = items.filter((item) => item.estado === 'error')
  const allReady = items.length === 0 || items.every((item) => item.estado === 'listo')

  return {
    items,
    addFiles,
    removeFile,
    retryFile,
    uploadAll,
    cancelar,
    reset,
    isUploading,
    allReady,
    listosCount: listos.length,
    totalCount: items.length,
    tieneErrores: conError.length > 0,
    adjuntosParaEnviar: () => listos.map((item) => item.adjunto!),
  }
}
