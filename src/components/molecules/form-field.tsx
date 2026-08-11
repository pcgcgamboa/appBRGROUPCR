import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { Input } from '@/components/atoms/input'

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  endAdornment?: ReactNode
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, id, endAdornment, className, ...props }, ref) => (
    <label htmlFor={id} className="grid gap-2 text-sm font-medium">
      {label}
      <span className="relative">
        <Input
          ref={ref}
          id={id}
          className={endAdornment ? `pr-11 ${className ?? ''}` : className}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          {...props}
        />
        {endAdornment && (
          <span className="absolute inset-y-0 right-1 flex items-center">{endAdornment}</span>
        )}
      </span>
      {error && (
        <span id={`${id}-error`} className="text-sm text-red-700">
          {error}
        </span>
      )}
    </label>
  ),
)

FormField.displayName = 'FormField'
