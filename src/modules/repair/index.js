/**
 * src/modules/repair/index.js
 * Public interface of the deep Repair module.
 */

export {
  normalizeRepairRecord,
  encodeRepairProblemDescription,
} from './repairNormalizer'

export {
  buildMonthlyRequestNo,
  REPAIR_PRIORITY_OPTIONS,
  REPAIR_TYPE_OPTIONS,
  priorityToWorkOrder,
} from './repairNumbers'

export {
  dispatchNewRepairNotification,
  dispatchTechnicianAssignedNotification,
  dispatchRepairCompletedNotification,
} from './repairDispatcher'

export {
  createRepairRequest,
  approveRepairRequest,
  completeRepairRequest,
  updateRepairRequest,
} from './repairLifecycle'
