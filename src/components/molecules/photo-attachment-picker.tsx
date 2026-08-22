import { Camera, FileText, LoaderCircle, RefreshCw, Trash2 } from 'lucide-react'
import { useId } from 'react'
import { Badge } from '@/components/atoms/badge'
import { Button } from '@/components/atoms/button'
import { Progress } from '@/components/atoms/progress'
import type { AttachmentUploadItem } from '@/features/operador/types/operador.types'
import { useI18n } from '@/lib/i18n'

export function PhotoAttachmentPicker({
  items,
  onAddFiles,
  onRemove,
  onRetry,
  listosCount,
  totalCount,
  disabled,
}: {
  items: AttachmentUploadItem[]
  onAddFiles: (files: File[]) => void
  onRemove: (localId: string) => void
  onRetry: (localId: string) => void
  listosCount: number
  totalCount: number
  disabled?: boolean
}) {
  const inputId = useId()
  const { t } = useI18n()

  return (
    <div className="space-y-3">
      <span className="flex items-center gap-2 text-sm font-medium">
        <Camera className="size-4" />
        {t('photosLabel')}
      </span>
      <label
        htmlFor={inputId}
        className="inline-flex min-h-11 w-fit cursor-pointer items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm font-semibold shadow-sm transition hover:border-primary/30 hover:bg-accent aria-disabled:pointer-events-none aria-disabled:opacity-50"
        aria-disabled={disabled}
      >
        <Camera className="size-4" />
        {t('addPhotos')}
      </label>
      <input
        id={inputId}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,application/pdf"
        capture="environment"
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? [])
          if (files.length) onAddFiles(files)
          event.target.value = ''
        }}
      />
      <p className="text-xs font-normal text-muted-foreground">{t('photosHelp')}</p>

      {totalCount > 0 && (
        <div className="space-y-1">
          <Progress value={listosCount} max={totalCount} />
          <p className="text-xs text-muted-foreground">
            {listosCount}/{totalCount} {t('filesReady')}
          </p>
        </div>
      )}

      {items.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((item) => (
            <article key={item.localId} className="relative overflow-hidden rounded-lg border">
              <div className="flex aspect-square items-center justify-center bg-muted">
                {item.previewUrl ? (
                  <img
                    src={item.previewUrl}
                    alt={item.file?.name ?? ''}
                    className="size-full object-cover"
                  />
                ) : (
                  <FileText className="size-8 text-muted-foreground" />
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="absolute right-1 top-1 bg-card/90 text-destructive hover:bg-destructive-soft"
                aria-label={t('removePhoto')}
                onClick={() => onRemove(item.localId)}
              >
                <Trash2 className="size-4" />
              </Button>
              <div className="space-y-1 p-2">
                <p className="truncate text-xs" title={item.file?.name}>
                  {item.file?.name}
                </p>
                {item.estado === 'pendiente' && <Badge>{t('statusPending')}</Badge>}
                {item.estado === 'subiendo' && (
                  <Badge variant="primary">
                    <LoaderCircle className="mr-1 size-3 animate-spin" />
                    {t('statusUploading')}
                  </Badge>
                )}
                {item.estado === 'listo' && <Badge variant="success">{t('statusReady')}</Badge>}
                {item.estado === 'error' && (
                  <div className="space-y-1">
                    <Badge variant="destructive">{item.error ?? t('statusError')}</Badge>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => onRetry(item.localId)}
                    >
                      <RefreshCw className="mr-1 size-3" />
                      {t('retry')}
                    </Button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
