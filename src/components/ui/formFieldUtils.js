// Shared option normalizer moved verbatim from FormField.
export function normalizeFieldOptions(opts = []) {
  return opts.map(o => (
    typeof o === 'string'
      ? { label: o, value: o }
      : { label: o.label ?? o.value ?? o.id, value: o.value ?? o.label ?? o.id }
  )).filter(o => o.value !== undefined && o.value !== null)
}
