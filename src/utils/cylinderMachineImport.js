/**
 * Cylinder - Machine Import Utility
 *
 * Pure domain logic to filter machines not yet present in cylinders
 * (keyed by Serial_OLD) and map machine specs to cylinder form state.
 */

/**
 * Filters machines that have Serial_OLD and do not yet exist in cylinders (by Serial_OLD).
 *
 * @param {Array} machines - List of machine records
 * @param {Array} cylinders - List of cylinder records
 * @returns {Array} List of machines eligible for cylinder creation
 */
export function getUnlinkedMachines(machines = [], cylinders = []) {
  if (!Array.isArray(machines)) return []

  const existingSerialOlds = new Set(
    (Array.isArray(cylinders) ? cylinders : [])
      .map((c) => String(c?.Serial_OLD || '').trim().toLowerCase())
      .filter(Boolean)
  )

  return machines.filter((m) => {
    const serialOld = String(m?.Serial_OLD || '').trim()
    if (!serialOld) return false
    return !existingSerialOlds.has(serialOld.toLowerCase())
  })
}

/**
 * Resolves Machine_Ref default based on machine location.
 *
 * @param {string} location
 * @returns {string} 'In-use-GMK1' | 'In-use-GMK3'
 */
export function resolveMachineRefFromLocation(location = '') {
  const loc = String(location || '').toUpperCase()
  if (loc.includes('GMK3') || loc.includes('3')) return 'In-use-GMK3'
  if (loc.includes('GMK1') || loc.includes('1')) return 'In-use-GMK1'
  return 'In-use-GMK1'
}

/**
 * Maps machine fields to a cylinder form record.
 * Serial_NOW is intentionally left blank per user requirement.
 *
 * @param {Object} machine - Source machine record
 * @param {Object} [currentForm] - Existing form state (to preserve unmapped fields)
 * @returns {Object} Mapped cylinder form object
 */
export function mapMachineToCylinderForm(machine = {}, currentForm = {}) {
  if (!machine) return { ...currentForm }

  const location = machine.Location || currentForm.Location || ''
  const machineRef = resolveMachineRefFromLocation(location)

  return {
    ...currentForm,
    Serial_OLD: machine.Serial_OLD ? String(machine.Serial_OLD).trim() : '',
    // Serial_NOW is left empty for user to enter current physical cylinder serial
    Serial_NOW: '',
    NewMC: machine.Mc || currentForm.NewMC || '',
    Standard: machine.Standard || 'Standard',
    Location: location,
    Type: machine.Type || currentForm.Type || '',
    Manufacturer: machine.Manufacturer || currentForm.Manufacturer || '',
    Diameter: machine.Diameter !== undefined && machine.Diameter !== null ? String(machine.Diameter) : (currentForm.Diameter || ''),
    Gauge: machine.Gauge !== undefined && machine.Gauge !== null ? String(machine.Gauge) : (currentForm.Gauge || ''),
    Needle: machine.Needle !== undefined && machine.Needle !== null ? String(machine.Needle) : (currentForm.Needle || ''),
    Feeder: machine.Feeder !== undefined && machine.Feeder !== null ? String(machine.Feeder) : (currentForm.Feeder || ''),
    Status_Now: 'STANDARD',
    Machine_Ref: machineRef,
  }
}

/**
 * Builds user-friendly label for machine dropdown options.
 *
 * @param {Object} machine
 * @returns {string} Formatted label
 */
export function formatMachineOptionLabel(machine = {}) {
  const mc = machine.Mc || `MC-${machine.id || machine._id || '—'}`
  const serialOld = machine.Serial_OLD || '—'
  const specs = [
    machine.Type,
    machine.Diameter ? `${machine.Diameter}"` : null,
    machine.Gauge ? `${machine.Gauge}G` : null,
    machine.Location,
  ].filter(Boolean).join(' · ')

  return `${mc} · ซีเรียลเดิม: ${serialOld}${specs ? ` (${specs})` : ''}`
}
