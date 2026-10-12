import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

/**
 * Standardized type-safe form hook connecting React Hook Form with Zod schema validation
 * @param {import('zod').ZodTypeAny} schema - Zod schema to validate against
 * @param {object} options - useForm options (defaultValues, mode, etc.)
 */
export function useZodForm(schema, options = {}) {
  return useForm({
    resolver: zodResolver(schema),
    mode: options.mode || 'onBlur',
    ...options,
  })
}

export default useZodForm
