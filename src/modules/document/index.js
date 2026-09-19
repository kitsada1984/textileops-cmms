/**
 * Document Generation Module
 *
 * Public interface for TextileOps PDF document generation, context hydration,
 * and calculations.
 *
 * TextileOps Architecture: Deep Module Entry Point
 */

export {
  safeFormatDate,
  extractImageUrl,
  extractCylinderImageUrl,
  extractHiddenValue,
  extractTape5,
  normalizeImagesList,
  computeKnittingNeedles,
  computeKnittingNeedleType,
  generateMachinePdfProps,
  generateCylinderPdfProps,
  generateWorkOrderPdfProps,
  generateRepairRequestPdfProps,
  generatePMPlanPdfProps,
  generateCenterCheckPdfProps,
  generateNeedleConditionPdfProps,
  generateSparePartPdfProps,
  generatePurchasingPdfProps,
} from './documentGenerators'

export {
  resolveCylinders,
  resolveMachines,
  resolveCenterChecks,
  resolveNeedleConditions,
  resolveRepairRequests,
  findMachineCylinderMatch,
  findCylinderMachineMatch,
  resolveDocumentContext,
} from './documentContext'

export { getCachedTable } from './documentStorageFallback'
