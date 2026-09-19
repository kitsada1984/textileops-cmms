/**
 * Document Context Hydration & Cross-Entity Resolution
 *
 * Provides pure resolution and matching of cross-table entities required by PDF generators.
 * When explicit arrays are passed in `context`, they are used directly with zero ambient storage access.
 * If omitted, it falls back gracefully to `documentStorageFallback`.
 *
 * TextileOps Architecture: Deep Module / Context Hydration Seam
 */

import { getCachedTable } from './documentStorageFallback'

/**
 * Resolves cylinders collection from explicit context or fallback adapter
 * @param {Object} [context]
 * @returns {Array}
 */
export function resolveCylinders(context = {}) {
  return context?.cylinders?.length ? context.cylinders : getCachedTable('cylinders')
}

/**
 * Resolves machines collection from explicit context or fallback adapter
 * @param {Object} [context]
 * @returns {Array}
 */
export function resolveMachines(context = {}) {
  return context?.machines?.length ? context.machines : getCachedTable('machines')
}

/**
 * Resolves center checks collection from explicit context or fallback adapter
 * @param {Object} [context]
 * @returns {Array}
 */
export function resolveCenterChecks(context = {}) {
  return context?.centerChecks?.length ? context.centerChecks : getCachedTable('center_checks')
}

/**
 * Resolves needle conditions collection from explicit context or fallback adapter
 * @param {Object} [context]
 * @returns {Array}
 */
export function resolveNeedleConditions(context = {}) {
  return context?.needleConditions?.length ? context.needleConditions : getCachedTable('needle_conditions')
}

/**
 * Resolves repair requests collection from explicit context or fallback adapter
 * @param {Object} [context]
 * @returns {Array}
 */
export function resolveRepairRequests(context = {}) {
  return context?.repairRequests?.length ? context.repairRequests : getCachedTable('repair_requests')
}

/**
 * Finds matching cylinder for a given machine record
 * @param {Object} mc
 * @param {Array} cylinders
 * @returns {Object|undefined}
 */
export function findMachineCylinderMatch(mc = {}, cylinders = []) {
  if (!mc || !Array.isArray(cylinders)) return undefined
  return cylinders.find(
    (c) =>
      (mc.Serial_NEW && (c.Serial_NOW === mc.Serial_NEW || c.Serial_OLD === mc.Serial_NEW)) ||
      (mc.Serial_NOW && (c.Serial_NOW === mc.Serial_NOW || c.Serial_OLD === mc.Serial_NOW)) ||
      (mc.Mc && (c.NewMC === mc.Mc || c.OLDMC === mc.Mc))
  )
}

/**
 * Finds matching machine for a given cylinder record
 * @param {Object} cyl
 * @param {Array} machines
 * @returns {Object|undefined}
 */
export function findCylinderMachineMatch(cyl = {}, machines = []) {
  if (!cyl || !Array.isArray(machines)) return undefined
  return machines.find(
    (m) =>
      m.Mc === cyl.NewMC ||
      m.Mc === cyl.OLDMC ||
      m.Serial_NEW === cyl.Serial_NOW ||
      m.Serial_NOW === cyl.Serial_NOW
  )
}

/**
 * Resolves full document context for a given entity type
 * @param {string} docType - 'machine' | 'cylinder' | 'workorder' | 'repair' | 'centercheck' | 'pmplan' | 'needle'
 * @param {Object} record - Main entity record
 * @param {Object} [context] - In-scope explicit collections
 * @returns {Object} Hydrated context object
 */
export function resolveDocumentContext(docType, record, context = {}) {
  return {
    cylinders: resolveCylinders(context),
    machines: resolveMachines(context),
    centerChecks: resolveCenterChecks(context),
    needleConditions: resolveNeedleConditions(context),
    repairRequests: resolveRepairRequests(context),
  }
}
