// Pure block builders moved verbatim from autoGenerateMonthlySchedule
// (field resolution only — block iteration stays in the caller).

export function resolveBlockMachineFields(machine, idx) {
  return {
    mc: machine?.NewMC || machine?.mc || machine?.Machine_MC || machine?.Mc || `MC-${String(idx + 1).padStart(2, '0')}`,
    ki: machine?.Serial_OLD || machine?.ki || machine?.Machine_KI || '',
    location: machine?.Location || machine?.location || 'GMK1',
    type: machine?.Type || machine?.type || 'Double',
  }
}

export function resolveBlockScheduleFields(machine) {
  return {
    nextPmDate: machine?.nextPmDate || '',
    lastPmDate: machine?.lastPmDate || '',
    countdownDays: machine?.countdownDays ?? null,
    countdownLabel: machine?.countdownLabel || '',
    countdownColor: machine?.countdownColor || 'gray',
  }
}

export function buildPlannedBlockItem(block, idx, machine, monthKey, daysPerMachine) {
  const { mc, ki, location, type } = resolveBlockMachineFields(machine, idx)
  const { nextPmDate, lastPmDate, countdownDays, countdownLabel, countdownColor } = resolveBlockScheduleFields(machine)

  return {
    id: `PMSCH-${monthKey.replace('-', '')}-${String(idx + 1).padStart(2, '0')}`,
    mc,
    ki,
    location,
    type,
    nextPmDate,
    lastPmDate,
    countdownDays,
    countdownLabel,
    countdownColor,
    plannedStartDate: block.startDate,
    plannedEndDate: block.endDate,
    actualStartDate: '',
    actualEndDate: '',
    assignedTech: '',
    actualTech: '',
    status: 'SCHEDULED',
    notes: '',
    workingDays: block.workingDaysCount || daysPerMachine,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}
