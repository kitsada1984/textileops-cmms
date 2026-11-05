import { describe, it, expect } from 'vitest'
import { normalizeNeedleSet, normalizeNeedleLog } from './entities.js'

// Equivalence: key order and values must match the pre-split implementation
// for representative records (guards serialization-sensitive consumers).
describe('needle normalize key-order equivalence', () => {
  const stripVolatile = (o) => {
    const { updatedAt, createdAt, ...rest } = o
    return rest
  }

  it('keeps set key order and values stable', () => {
    const out = normalizeNeedleSet({
      id: 'NS-9', Machine_Type: 'Double', Gauge: '24G', Grade: 'เกรด A',
      quantity: 5, Location: 'GMK1', Inspector: 'ช่างA',
    })
    expect(Object.keys(out)).toEqual([
      'id', 'Machine_Type', 'Gauge', 'Grade', 'quantity', 'Location', 'Inspector',
      'setId', 'Set_ID', 'machineType', 'gauge', 'machineId', 'Machine_ID',
      'brand', 'Brand', 'needleModel', 'Needle_Model', 'grade', 'conditionDetail',
      'Condition_Detail', 'status', 'Status', 'Quantity', 'dateRecorded',
      'Date_Recorded', 'inspector', 'remarks', 'Remarks', 'images', 'Image_URLs',
      'location', 'updatedAt',
    ])
    expect(stripVolatile(out)).toEqual({
      id: 'NS-9', Machine_Type: 'Double', Gauge: '24G', Grade: 'เกรด A',
      quantity: 5, Location: 'GMK1', Inspector: 'ช่างA',
      setId: 'NS-9', Set_ID: 'NS-9', machineType: 'Double', gauge: '24G',
      machineId: '', Machine_ID: '', brand: '', Brand: '', needleModel: '',
      Needle_Model: '', grade: 'เกรด A', conditionDetail: 'สึกปานกลาง',
      Condition_Detail: 'สึกปานกลาง', status: 'คัดแล้ว', Status: 'คัดแล้ว',
      Quantity: 5, dateRecorded: '', Date_Recorded: '', inspector: 'ช่างA',
      remarks: '', Remarks: '', images: [], Image_URLs: [], location: 'GMK1',
    })
  })

  it('keeps log key order and values stable', () => {
    const out = normalizeNeedleLog({ id: 'L1', Quantity: 3, Technician: 'tuk' })
    expect(Object.keys(out)).toEqual([
      'id', 'Quantity', 'Technician', 'logId', 'Log_ID', 'setId', 'Set_ID',
      'actionType', 'Action_Type', 'oldGrade', 'newGrade', 'conditionDetail',
      'quantity', 'dateAction', 'technician', 'remarks', 'targetMachine',
      'sourceFrom', 'scrapReason', 'qtyChange', 'balanceAfter', 'stockDetail',
      'images', 'Image_URLs', 'createdAt',
    ])
    expect(stripVolatile(out)).toEqual({
      id: 'L1', Quantity: 3, Technician: 'tuk', logId: 'L1', Log_ID: 'L1',
      setId: '', Set_ID: '', actionType: '', Action_Type: '', oldGrade: '',
      newGrade: '', conditionDetail: '', quantity: 3, dateAction: '',
      technician: 'tuk', remarks: '', targetMachine: '', sourceFrom: '',
      scrapReason: '', qtyChange: '', balanceAfter: 0, stockDetail: 'PM',
      images: [], Image_URLs: [],
    })
  })
})
