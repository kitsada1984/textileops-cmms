/**
 * src/modules/repair/repairDispatcher.js
 * Multi-channel notification dispatcher for Repair Request events (Telegram + LINE).
 * Executes asynchronously and non-blockingly with safe fallback to guarantee
 * business flow continuity even if notification APIs fail.
 */

import { notifySupervisor, notifyTechnician, notifyCompleted } from '../../utils/telegram'
import { notifyLineNewRepair, notifyLineTechnician, notifyLineCompleted } from '../../utils/line'

/**
 * Dispatch notification for a new repair request (Step 1).
 * @param {object} record Normalized repair record
 * @param {object} cylinder Cylinder entity information
 * @param {boolean} isEasy Whether this is an easy/direct repair
 */
export async function dispatchNewRepairNotification(record, cylinder = null, isEasy = false) {
  const tasks = [
    (async () => {
      try {
        await notifySupervisor(record, cylinder, isEasy)
      } catch (err) {
        console.warn('[RepairDispatcher] Telegram notifySupervisor error:', err)
      }
    })(),
    (async () => {
      try {
        await notifyLineNewRepair(record, cylinder, isEasy)
      } catch (err) {
        console.warn('[RepairDispatcher] LINE notifyLineNewRepair error:', err)
      }
    })(),
  ]

  // If easy repair with directly assigned technician, also send technician assignment notifications
  if (isEasy && record.technician_name) {
    tasks.push(
      (async () => {
        try {
          await notifyTechnician(record)
        } catch (err) {
          console.warn('[RepairDispatcher] Telegram notifyTechnician (easy) error:', err)
        }
      })(),
      (async () => {
        try {
          await notifyLineTechnician(record)
        } catch (err) {
          console.warn('[RepairDispatcher] LINE notifyLineTechnician (easy) error:', err)
        }
      })()
    )
  }

  await Promise.allSettled(tasks)
}

/**
 * Dispatch notification for technician assignment / approval (Step 2).
 * @param {object} record Normalized repair record
 */
export async function dispatchTechnicianAssignedNotification(record) {
  const tasks = [
    (async () => {
      try {
        await notifyTechnician(record)
      } catch (err) {
        console.warn('[RepairDispatcher] Telegram notifyTechnician error:', err)
      }
    })(),
    (async () => {
      try {
        await notifyLineTechnician(record)
      } catch (err) {
        console.warn('[RepairDispatcher] LINE notifyLineTechnician error:', err)
      }
    })(),
  ]

  await Promise.allSettled(tasks)
}

/**
 * Dispatch notification for repair completion (Step 3).
 * @param {object} record Normalized repair record
 */
export async function dispatchRepairCompletedNotification(record) {
  const tasks = [
    (async () => {
      try {
        await notifyCompleted(record)
      } catch (err) {
        console.warn('[RepairDispatcher] Telegram notifyCompleted error:', err)
      }
    })(),
    (async () => {
      try {
        await notifyLineCompleted(record)
      } catch (err) {
        console.warn('[RepairDispatcher] LINE notifyLineCompleted error:', err)
      }
    })(),
  ]

  await Promise.allSettled(tasks)
}
