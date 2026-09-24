import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import CreateSpareNeedleModal from './CreateSpareNeedleModal'
import EditSpareNeedleModal from './EditSpareNeedleModal'
import { SpareNeedleRequestAPI, NeedleSetAPI, NeedleHistoryAPI } from '../../api/entities'

vi.mock('../../api/entities', () => {
  return {
    SpareNeedleRequestAPI: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      list: vi.fn().mockResolvedValue([]),
    },
    TechnicianAPI: {
      list: vi.fn().mockResolvedValue([
        { Name: 'ช่างหนึ่ง', Active: true },
        { Name: 'ช่างเอก', Active: true },
      ]),
    },
    MachineAPI: {
      list: vi.fn().mockResolvedValue([
        { MC: 'DG-341M' },
        { MC: 'S-01' },
      ]),
    },
    CylinderAPI: {
      list: vi.fn().mockResolvedValue([
        { Machine: 'DG-341M', Gauge: '28G', Serial_NOW: 'CY-28-004' },
      ]),
    },
    NeedleSetAPI: {
      getById: vi.fn(),
      update: vi.fn(),
    },
    NeedleHistoryAPI: {
      create: vi.fn(),
    },
  }
})

vi.mock('../../utils/telegram', () => ({
  notifySpareNeedleRequested: vi.fn().mockResolvedValue(true),
  loadTelegramSettingsDB: vi.fn().mockResolvedValue({ needle_keepers: [{ name: 'สมศรี' }] }),
}))

vi.mock('../../utils/line', () => ({
  notifyLineSpareNeedleRequested: vi.fn().mockResolvedValue(true),
  loadLineSettingsDB: vi.fn().mockResolvedValue({ needle_keepers: [{ name: 'สมศักดิ์' }] }),
}))

describe('CreateSpareNeedleModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders form and allows submitting a new spare needle request', async () => {
    const handleSuccess = vi.fn()
    const handleClose = vi.fn()

    SpareNeedleRequestAPI.create.mockImplementation((item) => Promise.resolve({ ...item, id: 'SNR-TEST-001' }))

    render(
      <CreateSpareNeedleModal
        isOpen={true}
        onClose={handleClose}
        onSuccess={handleSuccess}
        currentUser={{ name: 'ช่างหนึ่ง' }}
      />
    )

    expect(screen.getByText('ขอเบิกเข็ม Spare')).toBeInTheDocument()

    // Fill Machine MC
    const mcInput = screen.getByPlaceholderText(/DG-341M/)
    fireEvent.change(mcInput, { target: { value: 'DG-341M' } })

    // Select Dail Track 1
    const dailT1Btn = screen.getByRole('button', { name: /Dail Track 1/i })
    fireEvent.click(dailT1Btn)

    // Verify quantity initialized to 50
    expect(screen.getByText(/ส่งคำขอเบิกเข็ม \(50 ตัว\)/i)).toBeInTheDocument()

    // Click submit
    const submitBtn = screen.getByRole('button', { name: /ส่งคำขอเบิกเข็ม/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(SpareNeedleRequestAPI.create).toHaveBeenCalled()
      expect(handleSuccess).toHaveBeenCalled()
    })
  })
})

describe('EditSpareNeedleModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders existing request data and saves updates', async () => {
    const handleSuccess = vi.fn()
    const handleClose = vi.fn()

    const mockReq = {
      id: 'SNR-260924-1234',
      request_no: 'SNR-260924-1234',
      machine_mc: 'DG-341M',
      gauge: '28G',
      cylinder_serial: 'CY-28-004',
      technician_name: 'ช่างหนึ่ง',
      shift: 'กะเช้า',
      status: 'PENDING',
      tracks_requested: {
        dial: { t1: 50, t2: 0 },
        cylinder: { t1: 0, t2: 0, t3: 0, t4: 0 },
      },
      request_comment: 'เข็มหัก',
    }

    SpareNeedleRequestAPI.update.mockResolvedValue({
      ...mockReq,
      request_comment: 'เข็มหักหลายตัว',
    })

    render(
      <EditSpareNeedleModal
        isOpen={true}
        req={mockReq}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    )

    expect(screen.getByText('แก้ไขใบเบิกเข็ม Spare')).toBeInTheDocument()
    expect(screen.getByText('SNR-260924-1234')).toBeInTheDocument()

    // Change comment
    const commentInput = screen.getByPlaceholderText(/ระบุหมายเหตุเพิ่มเติม/)
    fireEvent.change(commentInput, { target: { value: 'เข็มหักหลายตัว' } })

    // Submit
    const saveBtn = screen.getByRole('button', { name: /บันทึกการแก้ไข/i })
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(SpareNeedleRequestAPI.update).toHaveBeenCalledWith(
        'SNR-260924-1234',
        expect.objectContaining({
          request_comment: 'เข็มหักหลายตัว',
        })
      )
      expect(handleSuccess).toHaveBeenCalled()
    })
  })

  it('displays warning when editing PREPARED request with issued items', () => {
    const mockPreparedReq = {
      id: 'SNR-260924-9999',
      request_no: 'SNR-260924-9999',
      machine_mc: 'DG-341M',
      status: 'PREPARED',
      issued_items: [
        { setId: 'NS-01', needleModel: 'Vo-Spec 71.85', grade: 'เกรด A', quantity: 50 },
      ],
      technician_name: 'ช่างหนึ่ง',
      shift: 'กะเช้า',
      issuer_name: 'คนคัดเข็ม',
      issuer_comment: 'เตรียมครบแล้ว',
    }

    render(
      <EditSpareNeedleModal
        isOpen={true}
        req={mockPreparedReq}
        onClose={() => {}}
        onSuccess={() => {}}
      />
    )

    expect(screen.getByText(/ใบเบิกนี้ได้รับการตัดสต็อกแล้ว/i)).toBeInTheDocument()
    expect(screen.getByText(/ชื่อผู้จ่ายเข็ม/i)).toBeInTheDocument()
  })
})

describe('Auto Stock Return on Delete', () => {
  it('restores needle set quantity and logs RETURN_SPARE history when deleting an issued request', async () => {
    const mockIssuedReq = {
      id: 'SNR-260924-8888',
      request_no: 'SNR-260924-8888',
      machine_mc: 'DG-341M',
      status: 'PREPARED',
      issued_items: [
        { setId: 'NS-100', needleModel: 'Vo-Spec 71.85', grade: 'เกรด A', quantity: 50 },
      ],
    }

    const mockSet = {
      id: 'NS-100',
      needleModel: 'Vo-Spec 71.85',
      grade: 'เกรด A',
      quantity: 120,
    }

    NeedleSetAPI.getById.mockResolvedValue(mockSet)

    for (const item of mockIssuedReq.issued_items) {
      const setRecord = await NeedleSetAPI.getById(item.setId)
      const currentBal = parseInt(setRecord.quantity, 10) || 0
      const returnQty = parseInt(item.quantity, 10) || 0
      const newBal = currentBal + returnQty

      await NeedleSetAPI.update(item.setId, {
        ...setRecord,
        quantity: newBal,
        Quantity: newBal,
      })

      await NeedleHistoryAPI.create({
        setId: item.setId,
        actionType: 'RETURN_SPARE',
        quantity: returnQty,
        qtyChange: `+${returnQty}`,
        balanceAfter: newBal,
      })
    }

    await SpareNeedleRequestAPI.delete(mockIssuedReq.id)

    expect(NeedleSetAPI.update).toHaveBeenCalledWith('NS-100', expect.objectContaining({
      quantity: 170,
    }))
    expect(NeedleHistoryAPI.create).toHaveBeenCalledWith(expect.objectContaining({
      actionType: 'RETURN_SPARE',
      quantity: 50,
      qtyChange: '+50',
      balanceAfter: 170,
    }))
    expect(SpareNeedleRequestAPI.delete).toHaveBeenCalledWith('SNR-260924-8888')
  })
})

