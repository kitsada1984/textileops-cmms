// In-use machine matchers moved verbatim out of the WorkOrders component
// (memo bodies) to meet the complexity gate. Params only, no state.

// Body of the `matchedActiveMachine` memo.
export function matchActiveMachine(inUseMachines, mc) {
  if (!mc.trim()) return null
  const target = mc.trim().toUpperCase()
  return inUseMachines.find((m) => m.code.toUpperCase() === target) || null
}

// Body of the `matchedEditActiveMachine` memo. Takes the raw MC value
// (`editJob?.MC` at the call site); normalization identical to before.
export function matchEditActiveMachine(inUseMachines, mc) {
  const editMc = String(mc || '').trim().toUpperCase()
  if (!editMc) return null
  return inUseMachines.find((m) => m.code.toUpperCase() === editMc) || null
}
