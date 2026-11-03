import { describe, it, expect } from 'vitest'

// Phase 3 export-stability guards (no logic change).
// Critical module entry points must keep their public names so refactors
// (e.g. the features/ moves) cannot silently rename or drop an export.
// Add new names here when a public API is intentionally extended;
// never delete a line to make a refactor pass.

import * as entities from './api/entities.js'
import * as repair from './modules/repair/index.js'
import * as docs from './modules/document/index.js'

function expectFunctions(mod, names, label) {
  for (const n of names) {
    expect(typeof mod[n], `${label} must export function "${n}"`).toBe('function')
  }
}

describe('Public export stability', () => {
  it('entities.js keeps all entity clients', () => {
    for (const n of [
      'MachineAPI', 'CylinderAPI', 'WorkOrderAPI', 'TechnicianAPI', 'KpiSettingsAPI',
      'PMPlanAPI', 'CenterCheckAPI', 'NeedleConditionAPI', 'ChecklistConfigAPI',
      'SparePartAPI', 'AuditLogAPI', 'PurchaseOrderAPI', 'StockTxnAPI', 'AppConfigAPI',
      'UserAPI', 'RepairRequestAPI', 'DesignBomAPI', 'NeedleConfigAPI', 'NeedleSetAPI',
      'NeedleHistoryAPI', 'CenterCheckStandardsAPI', 'SpareNeedleRequestAPI',
    ]) {
      expect(entities[n], `entities must export "${n}"`).toBeDefined()
    }
  })

  it('entities.js keeps all status/type option constants', () => {
    for (const n of [
      'NEEDLE_STATUSES', 'MACHINE_STATUS', 'CYL_STATUS', 'WO_STATUS', 'WO_PRIORITY',
      'WO_JOB_TYPE', 'TECH_SKILL_LEVELS', 'TECH_SPECIALIZATIONS', 'PM_TYPE', 'PM_STATUS',
      'PART_STATUS', 'PO_STATUS', 'TXN_TYPE', 'REPAIR_STATUS',
    ]) {
      expect(Array.isArray(entities[n]), `entities must export array "${n}"`).toBe(true)
    }
  })

  it('repair module keeps its lifecycle and helper interface', () => {
    expectFunctions(repair, [
      'createRepairRequest', 'approveRepairRequest', 'completeRepairRequest', 'updateRepairRequest',
      'sanitizeRepairRequestPayload', 'normalizeRepairRecord', 'encodeRepairProblemDescription',
      'buildMonthlyRequestNo', 'buildRepairWorkOrderPayload', 'durationHoursBetween',
      'dispatchNewRepairNotification', 'dispatchTechnicianAssignedNotification',
      'dispatchRepairCompletedNotification',
    ], 'repair')
    expect(
      Array.isArray(repair.REPAIR_REQUEST_COLUMNS) || repair.REPAIR_REQUEST_COLUMNS instanceof Set,
      'repair must export REPAIR_REQUEST_COLUMNS as Array or Set'
    ).toBe(true)
    expect(
      Array.isArray(repair.WORKORDER_COLUMNS) || repair.WORKORDER_COLUMNS instanceof Set,
      'repair must export WORKORDER_COLUMNS as Array or Set'
    ).toBe(true)
  })

  it('document module keeps all 9 PDF generators and context resolvers', () => {
    expectFunctions(docs, [
      'generateMachinePdfProps', 'generateCylinderPdfProps', 'generateWorkOrderPdfProps',
      'generateRepairRequestPdfProps', 'generatePMPlanPdfProps', 'generateCenterCheckPdfProps',
      'generateNeedleConditionPdfProps', 'generateSparePartPdfProps', 'generatePurchasingPdfProps',
      'resolveCylinders', 'resolveMachines', 'resolveCenterChecks', 'resolveNeedleConditions',
      'resolveRepairRequests', 'findMachineCylinderMatch', 'findCylinderMachineMatch',
      'resolveDocumentContext', 'getCachedTable',
    ], 'document')
  })
})
