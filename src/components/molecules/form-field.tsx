import { forwardRef, type InputHTMLAttributes } from 'react'
import { Input } from '@/components/atoms/input'

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, id, ...props }, ref) => (
    <label htmlFor={id} className="grid gap-2 text-sm font-medium">
      {label}
      <Input
        ref={ref}
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
      {error && (
        <span id={`${id}-error`} className="text-sm text-red-700">
          {error}
        </span>
      )}
    </label>
  ),
)

FormField.displayName = 'FormField'
